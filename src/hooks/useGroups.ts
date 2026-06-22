import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  Group,
  GroupMember,
  Profile,
  SettlementPayment,
  Setting,
  Transaction,
} from "../lib/db";
import { syncManager } from "../lib/sync";
import { useAuth } from "@/contexts/AuthProvider";
import { v4 as uuidv4 } from "uuid";
import {
  getGroupInputSchema,
  getGroupUpdateSchema,
  getGroupMemberUpdateSchema,
  validate,
} from "../lib/validation";
import { useTranslation } from "react-i18next";
import {
  extractSettlementNote,
  isSettlementTransaction,
} from "../lib/settlements";

/**
 * Represents a single settlement transaction between two users.
 */
export interface SettlementTransaction {
  /** User ID who needs to pay */
  from: string;
  /** User ID who should receive payment */
  to: string;
  /** Amount to be transferred */
  amount: number;
}

export type BalanceSnapshotEntry = {
  userId: string;
  memberId: string;
  share: number;
  shouldPay: number;
  hasPaid: number;
  settlementSent: number;
  settlementReceived: number;
  balance: number;
  displayName: string;
  avatarUrl?: string;
  isGuest: boolean;
};

/**
 * A single group expense, flattened for the settlement breakdown ledger.
 * Lets the UI reconcile a settlement amount line-by-line: each member's
 * effect on a line is `(paid_this ? amount : 0) - amount * share / 100`.
 */
export interface GroupExpenseLineItem {
  id: string;
  description: string;
  date: string;
  amount: number;
  payerMemberId: string;
  payerName: string;
}

export interface SettlementHistoryEntry {
  id: string;
  groupId: string;
  from: string;
  to: string;
  fromMemberId: string;
  toMemberId: string;
  fromDisplayName: string;
  toDisplayName: string;
  fromUserId?: string | null;
  toUserId?: string | null;
  amount: number;
  date: string;
  note: string;
  createdBy: string;
  canUndo: boolean;
}

/**
 * Extended group type with member information and computed properties.
 */
export interface GroupMemberWithProfile extends GroupMember {
  profile?: Profile;
  displayName: string;
}

/**
 * Extended group type with member information and computed properties.
 */
export interface GroupWithMembers extends Group {
  /** List of active members in the group */
  members: GroupMemberWithProfile[];
  /** Whether the current user created this group */
  isCreator: boolean;
  /** Current user's expense share percentage (0-100) */
  myShare: number;
}

/**
 * Calculate optimized settlement transactions to minimize number of payments.
 *
 * Uses a greedy algorithm to match debtors with creditors, minimizing
 * the total number of transactions needed to settle all balances.
 *
 * @param balances - Record of user balances where positive = owed money, negative = owes money
 * @returns Array of settlement transactions ordered by amount (largest first)
 *
 * @example
 * ```ts
 * const balances = {
 *   'user1': { userId: 'user1', balance: -50, ... }, // owes €50
 *   'user2': { userId: 'user2', balance: 30, ... },  // owed €30
 *   'user3': { userId: 'user3', balance: 20, ... },  // owed €20
 * };
 *
 * const settlements = calculateSettlement(balances);
 * // Returns: [
 * //   { from: 'user1', to: 'user2', amount: 30 },
 * //   { from: 'user1', to: 'user3', amount: 20 }
 * // ]
 * ```
 */
export function calculateSettlement(
  balances: Record<
    string,
    {
      userId: string;
      share: number;
      shouldPay: number;
      hasPaid: number;
      balance: number;
    }
  >
): SettlementTransaction[] {
  // Separate debtors (negative balance) and creditors (positive balance)
  const debtors = Object.values(balances)
    .filter((b) => b.balance < -0.01) // Use small epsilon for float comparison
    .map((b) => ({ userId: b.userId, amount: -b.balance })) // Convert to positive amount
    .sort((a, b) => b.amount - a.amount); // Sort by amount descending

  const creditors = Object.values(balances)
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ userId: b.userId, amount: b.balance }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: SettlementTransaction[] = [];

  // Create working copies to avoid mutating original arrays
  const debtorQueue = [...debtors];
  const creditorQueue = [...creditors];

  // Greedy algorithm: match largest debtor with largest creditor
  while (debtorQueue.length > 0 && creditorQueue.length > 0) {
    const debtor = debtorQueue[0];
    const creditor = creditorQueue[0];

    // Determine payment amount (minimum of what debtor owes and creditor is owed)
    const paymentAmount = Math.min(debtor.amount, creditor.amount);

    // Record the settlement
    settlements.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: paymentAmount,
    });

    // Update remaining amounts
    debtor.amount -= paymentAmount;
    creditor.amount -= paymentAmount;

    // Remove fully settled parties
    if (debtor.amount < 0.01) {
      debtorQueue.shift();
    }
    if (creditor.amount < 0.01) {
      creditorQueue.shift();
    }
  }

  return settlements;
}

function resolveMemberDisplayName(
  member: GroupMember,
  profileMap: Map<string, Profile>,
  currentUserId?: string
): { displayName: string; avatarUrl?: string } {
  const profile = member.user_id ? profileMap.get(member.user_id) : undefined;
  let displayName = "Unknown User";

  if (member.is_guest && member.guest_name) {
    displayName = member.guest_name;
  } else if (profile?.full_name) {
    displayName = profile.full_name;
  } else if (profile?.email) {
    displayName = profile.email.split("@")[0];
  } else if (member.user_id === currentUserId) {
    displayName = "You";
  } else if (member.user_id) {
    displayName = `User ${member.user_id.slice(0, 4)}`;
  }

  return {
    displayName,
    avatarUrl: profile?.avatar_url || undefined,
  };
}

function buildBalanceSnapshot(params: {
  members: GroupMember[];
  expenses: Array<Pick<Transaction, "amount" | "paid_by_member_id">>;
  settlementPayments: SettlementPayment[];
  profileMap: Map<string, Profile>;
  currentUserId?: string;
}) {
  const { members, expenses, settlementPayments, profileMap, currentUserId } =
    params;
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const balances: Record<string, BalanceSnapshotEntry> = {};
  const memberKeyById = new Map<string, string>();
  const memberById = new Map(members.map((member) => [member.id, member]));

  for (const member of members) {
    const key = member.user_id || member.id;
    memberKeyById.set(member.id, key);
  }

  for (const member of members) {
    const key = memberKeyById.get(member.id) || member.id;
    const shouldPay = (totalExpenses * member.share) / 100;
    const hasPaid = expenses
      .filter((t) => t.paid_by_member_id === member.id)
      .reduce((sum, t) => sum + t.amount, 0);
    const settlementSent = settlementPayments
      .filter((payment) => payment.from_member_id === member.id)
      .reduce((sum, payment) => sum + payment.amount, 0);
    const settlementReceived = settlementPayments
      .filter((payment) => payment.to_member_id === member.id)
      .reduce((sum, payment) => sum + payment.amount, 0);
    const { displayName, avatarUrl } = resolveMemberDisplayName(
      member,
      profileMap,
      currentUserId
    );

    balances[key] = {
      userId: key,
      memberId: member.id,
      share: member.share,
      shouldPay,
      hasPaid,
      settlementSent,
      settlementReceived,
      balance: hasPaid - shouldPay + settlementSent - settlementReceived,
      displayName,
      avatarUrl,
      isGuest: !!member.is_guest,
    };
  }

  return {
    totalExpenses,
    balances,
    memberKeyById,
    memberById,
  };
}

/**
 * Hook for managing shared expense groups with member management and balance calculation.
 *
 * Groups allow multiple users to track shared expenses with customizable
 * percentage splits. The hook provides CRUD operations for groups and members,
 * plus balance calculations showing who owes whom.
 *
 * @returns Object containing:
 *   - `groups`: Array of groups where user is member/creator
 *   - `createGroup`: Create a new group (creator gets 100% initial share)
 *   - `updateGroup`: Update group name/description
 *   - `deleteGroup`: Soft-delete group with option to keep/delete transactions
 *   - `addMember`: Add a user to the group
 *   - `removeMember`: Remove a member from the group
 *   - `updateMemberShare`: Update a single member's share percentage
 *   - `updateAllShares`: Batch update all member shares
 *   - `getGroupBalance`: Calculate expense balances for all members
 *
 * @example
 * ```tsx
 * const { groups, createGroup, getGroupBalance } = useGroups();
 *
 * // Create a group for shared apartment expenses
 * const groupId = await createGroup('Apartment', 'Monthly shared bills');
 *
 * // Check who owes money
 * const { balances } = await getGroupBalance(groupId);
 * // balances[userId].balance > 0 means they are owed money
 * // balances[userId].balance < 0 means they owe money
 * ```
 */
export function useGroups() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Get all groups where user is a member or creator
  const groups = useLiveQuery(async () => {
    if (!user) return [];

    const allGroups = await db.groups.toArray();
    const allMembers = await db.group_members.toArray();
    const allProfiles = await db.profiles.toArray();
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    // Filter groups where user is creator or active member
    const userGroups = allGroups.filter((g) => {
      if (g.deleted_at) return false;
      if (g.created_by === user.id) return true;
      return allMembers.some(
        (m) => m.group_id === g.id && m.user_id === user.id && !m.removed_at
      );
    });

    // Enrich with members info
    return userGroups.map((g) => {
      const groupMembers = allMembers
        .filter((m) => m.group_id === g.id && !m.removed_at)
        .map((m) => {
          const profile = m.user_id ? profileMap.get(m.user_id) : undefined;
          // Determine display name: Profile name > Email > "User ..."
          let displayName = "Unknown User";
          if (profile?.full_name) displayName = profile.full_name;
          else if (profile?.email) displayName = profile.email.split("@")[0];
          else if (m.user_id === user.id) displayName = "You";
          else if (m.is_guest && m.guest_name) displayName = m.guest_name;
          else if (m.user_id) displayName = `User ${m.user_id.slice(0, 4)}`;

          return {
            ...m,
            profile,
            displayName,
          } as GroupMemberWithProfile;
        });
      const myMembership = groupMembers.find((m) => m.user_id === user.id);

      return {
        ...g,
        members: groupMembers,
        isCreator: g.created_by === user.id,
        myShare: myMembership?.share ?? 0,
      } as GroupWithMembers;
    });
  }, [user]);

  const createGroup = async (name: string, description?: string) => {
    if (!user) return null;

    // Validate input data
    const validatedData = validate(getGroupInputSchema(t), {
      name,
      description,
      created_by: user.id,
    });

    const groupId = uuidv4();
    const memberId = uuidv4();

    // Create group
    await db.groups.add({
      id: groupId,
      ...validatedData,
      deleted_at: null,
      pendingSync: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Add creator as first member with 100% share
    await db.group_members.add({
      id: memberId,
      group_id: groupId,
      user_id: user.id,
      share: 100,
      joined_at: new Date().toISOString(),
      removed_at: null,
      pendingSync: 1,
      updated_at: new Date().toISOString(),
    });

    syncManager.schedulePush();
    return groupId;
  };

  const updateGroup = async (
    id: string,
    updates: Partial<Pick<Group, "name" | "description">>
  ) => {
    // Validate update data
    const validatedUpdates = validate(getGroupUpdateSchema(t), updates);

    await db.groups.update(id, {
      ...validatedUpdates,
      pendingSync: 1,
      updated_at: new Date().toISOString(),
    });
    syncManager.schedulePush();
  };

  const deleteGroup = async (
    id: string,
    deleteTransactions: boolean = false
  ) => {
    // Soft delete group
    await db.groups.update(id, {
      deleted_at: new Date().toISOString(),
      pendingSync: 1,
      updated_at: new Date().toISOString(),
    });

    // Always soft delete group categories
    const groupCategories = await db.categories
      .filter((c) => c.group_id === id)
      .toArray();

    for (const cat of groupCategories) {
      await db.categories.update(cat.id, {
        deleted_at: new Date().toISOString(),
        pendingSync: 1,
      });
    }

    if (deleteTransactions) {
      // Soft delete all group transactions
      const groupTransactions = await db.transactions
        .filter((t) => t.group_id === id)
        .toArray();

      for (const tx of groupTransactions) {
        await db.transactions.update(tx.id, {
          deleted_at: new Date().toISOString(),
          pendingSync: 1,
        });
      }

      // Soft delete recurring transactions
      const groupRecurring = await db.recurring_transactions
        .filter((r) => r.group_id === id)
        .toArray();

      for (const rec of groupRecurring) {
        await db.recurring_transactions.update(rec.id, {
          deleted_at: new Date().toISOString(),
          pendingSync: 1,
        });
      }
    } else {
      // Convert group transactions to personal (remove group_id)
      const groupTransactions = await db.transactions
        .filter((t) => t.group_id === id)
        .toArray();

      for (const tx of groupTransactions) {
        await db.transactions.update(tx.id, {
          group_id: null,
          paid_by_member_id: null,
          pendingSync: 1,
        });
      }
    }

    syncManager.schedulePush();
  };

  const addGroupMember = async (
    groupId: string,
    userIdOrName: string,
    isGuest: boolean = false,
    share: number = 0
  ) => {
    // For guests, we don't validate against GroupMemberInputSchema in the same way 
    // because user_id is null. We need a custom validation or just simpler object.

    // Basic validation
    if (!userIdOrName) throw new Error("User ID or Guest Name is required");

    const memberId = uuidv4();

    const newMember = {
      id: memberId,
      group_id: groupId,
      share,
      joined_at: new Date().toISOString(),
      removed_at: null,
      pendingSync: 1,
      updated_at: new Date().toISOString(),
      is_guest: isGuest,
    } as GroupMember;

    if (isGuest) {
      newMember.user_id = null;
      newMember.guest_name = userIdOrName;
    } else {
      newMember.user_id = userIdOrName;
      newMember.guest_name = null;
    }

    await db.group_members.add(newMember);

    syncManager.schedulePush();
    return memberId;
  };

  const removeGroupMember = async (memberId: string) => {
    await db.group_members.update(memberId, {
      removed_at: new Date().toISOString(),
      pendingSync: 1,
      updated_at: new Date().toISOString(),
    });
    syncManager.schedulePush();
  };

  // ... existing updateMemberShare ...
  const updateMemberShare = async (memberId: string, share: number) => {
    // Validate share value
    const validatedData = validate(getGroupMemberUpdateSchema(t), { share });

    await db.group_members.update(memberId, {
      share: validatedData.share,
      pendingSync: 1,
      updated_at: new Date().toISOString(),
    });
    syncManager.schedulePush();
  };

  const updateAllShares = async (
    _groupId: string,
    shares: { memberId: string; share: number }[]
  ) => {
    for (const { memberId, share } of shares) {
      await db.group_members.update(memberId, {
        share,
        pendingSync: 1,
        updated_at: new Date().toISOString(),
      });
    }
    syncManager.schedulePush();
  };

  const upsertLocalMigrationFlag = async () => {
    if (!user) return;
    const nowIso = new Date().toISOString();
    const existingSettings = await db.user_settings.get(user.id);
    if (existingSettings) {
      await db.user_settings.update(user.id, {
        legacy_settlement_migrated_at: nowIso,
        updated_at: nowIso,
      });
      return;
    }

    const defaults: Setting = {
      user_id: user.id,
      currency: "EUR",
      language: "en",
      theme: "light",
      accentColor: "slate",
      start_of_week: "monday",
      default_view: "list",
      include_investments_in_expense_totals: false,
      include_group_expenses: false,
      legacy_settlement_migrated_at: nowIso,
      updated_at: nowIso,
    };
    await db.user_settings.add(defaults);
  };

  const migrateLegacySettlementMarkersIfNeeded = async () => {
    if (!user) return;
    const settings = await db.user_settings.get(user.id);
    if (settings?.legacy_settlement_migrated_at) return;

    const legacyMarkers = await db.transactions
      .filter((t) => !!t.group_id && !t.deleted_at && isSettlementTransaction(t))
      .toArray();

    if (legacyMarkers.length === 0) {
      await upsertLocalMigrationFlag();
      return;
    }

    const allProfiles = await db.profiles.toArray();
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
    const sortedMarkers = [...legacyMarkers].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    for (const marker of sortedMarkers) {
      const groupId = marker.group_id;
      if (!groupId) continue;

      const members = await db.group_members
        .filter((m) => m.group_id === groupId && !m.removed_at)
        .toArray();
      if (members.length < 2) {
        await db.transactions.update(marker.id, {
          deleted_at: new Date().toISOString(),
          pendingSync: 1,
        });
        continue;
      }

      const expensesBeforeMarker = await db.transactions
        .filter(
          (t) =>
            t.group_id === groupId &&
            !t.deleted_at &&
            t.type === "expense" &&
            !isSettlementTransaction(t) &&
            t.date <= marker.date
        )
        .toArray();

      const settlementPaymentsBeforeMarker = await db.settlement_payments
        .filter(
          (payment) =>
            payment.group_id === groupId &&
            !payment.deleted_at &&
            payment.date <= marker.date
        )
        .toArray();

      const snapshot = buildBalanceSnapshot({
        members,
        expenses: expensesBeforeMarker,
        settlementPayments: settlementPaymentsBeforeMarker,
        profileMap,
        currentUserId: user.id,
      });

      const settlements = calculateSettlement(
        Object.fromEntries(
          Object.values(snapshot.balances).map((balance) => [
            balance.memberId,
            {
              userId: balance.memberId,
              share: balance.share,
              shouldPay: balance.shouldPay,
              hasPaid: balance.hasPaid,
              balance: balance.balance,
            },
          ])
        )
      );

      for (const settlement of settlements) {
        if (settlement.amount <= 0) continue;
        await db.settlement_payments.add({
          id: uuidv4(),
          group_id: groupId,
          from_member_id: settlement.from,
          to_member_id: settlement.to,
          amount: settlement.amount,
          date: marker.date,
          note: extractSettlementNote(marker.description) || null,
          created_by: marker.user_id,
          deleted_at: null,
          pendingSync: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      await db.transactions.update(marker.id, {
        deleted_at: new Date().toISOString(),
        pendingSync: 1,
      });
    }

    await upsertLocalMigrationFlag();
    syncManager.schedulePush();
  };

  // Calculate group balances
  const getGroupBalance = async (groupId: string) => {
    await migrateLegacySettlementMarkersIfNeeded();

    const members = await db.group_members
      .filter((m) => m.group_id === groupId && !m.removed_at)
      .toArray();
    const expenses = await db.transactions
      .filter(
        (t) =>
          t.group_id === groupId &&
          !t.deleted_at &&
          t.type === "expense" &&
          !isSettlementTransaction(t)
      )
      .toArray();
    const settlementPayments = await db.settlement_payments
      .filter((payment) => payment.group_id === groupId && !payment.deleted_at)
      .toArray();
    const allProfiles = await db.profiles.toArray();
    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

    const snapshot = buildBalanceSnapshot({
      members,
      expenses,
      settlementPayments,
      profileMap,
      currentUserId: user?.id,
    });

    const sortedSettlements = [...settlementPayments].sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
    const latestSettlement = sortedSettlements[0] || null;

    const settlementHistory: SettlementHistoryEntry[] = sortedSettlements.map(
      (payment) => {
        const fromKey =
          snapshot.memberKeyById.get(payment.from_member_id) ||
          payment.from_member_id;
        const toKey =
          snapshot.memberKeyById.get(payment.to_member_id) || payment.to_member_id;
        const fromMember = snapshot.memberById.get(payment.from_member_id);
        const toMember = snapshot.memberById.get(payment.to_member_id);
        const fromName =
          snapshot.balances[fromKey]?.displayName ||
          fromMember?.guest_name ||
          "Unknown";
        const toName =
          snapshot.balances[toKey]?.displayName || toMember?.guest_name || "Unknown";
        const canUndo = !!user &&
          (payment.created_by === user.id || fromMember?.user_id === user.id);

        return {
          id: payment.id,
          groupId: payment.group_id,
          from: fromKey,
          to: toKey,
          fromMemberId: payment.from_member_id,
          toMemberId: payment.to_member_id,
          fromDisplayName: fromName,
          toDisplayName: toName,
          fromUserId: fromMember?.user_id,
          toUserId: toMember?.user_id,
          amount: payment.amount,
          date: payment.date,
          note: payment.note || "",
          createdBy: payment.created_by,
          canUndo,
        };
      }
    );

    const expenseLineItems: GroupExpenseLineItem[] = expenses
      .map((e) => {
        const payerKey =
          snapshot.memberKeyById.get(e.paid_by_member_id || "") ||
          e.paid_by_member_id ||
          "";
        const payerName =
          snapshot.balances[payerKey]?.displayName ||
          snapshot.memberById.get(e.paid_by_member_id || "")?.guest_name ||
          "Unknown";
        return {
          id: e.id,
          description: e.description,
          date: e.date,
          amount: e.amount,
          payerMemberId: e.paid_by_member_id || "",
          payerName,
        };
      })
      .sort((a, b) => {
        const dateCmp = (b.date || "").localeCompare(a.date || "");
        return dateCmp !== 0 ? dateCmp : b.amount - a.amount;
      });

    return {
      totalExpenses: snapshot.totalExpenses,
      balances: snapshot.balances,
      expenses: expenseLineItems,
      latestSettlement: latestSettlement
        ? {
            id: latestSettlement.id,
            date: latestSettlement.date,
            note: latestSettlement.note || "",
          }
        : null,
      settlementHistory,
      members: members.map((member) => {
        const { displayName } = resolveMemberDisplayName(
          member,
          profileMap,
          user?.id
        );
        return {
          ...member,
          displayName,
        };
      }),
    };
  };

  return {
    groups: groups || [],
    isLoading: groups === undefined,
    createGroup,
    updateGroup,
    deleteGroup,
    addGroupMember,
    removeGroupMember,
    updateMemberShare,
    updateAllShares,
    getGroupBalance,
  };
}
