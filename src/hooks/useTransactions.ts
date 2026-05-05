import { useLiveQuery } from "dexie-react-hooks";
import { db, SettlementPayment, Transaction } from "../lib/db";
import { syncManager } from "../lib/sync";
import { v4 as uuidv4 } from "uuid";
import {
  getTransactionInputSchema,
  getTransactionUpdateSchema,
  validate,
} from "../lib/validation";
import { useTranslation } from "react-i18next";
type PairSettlementInput = {
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  note?: string;
  date?: string;
};

/**
 * Hook for managing transactions with optional filtering.
 *
 * @param limit - Maximum number of transactions to return (optional)
 * @param yearMonth - Filter by year-month "YYYY-MM" or year "YYYY" (optional)
 * @param groupId - Filter by group: undefined = all, null = personal only, string = specific group
 */
export function useTransactions(
  limit?: number,
  yearMonth?: string,
  groupId?: string | null
) {
  const { t } = useTranslation();

  // Single unified query that handles all filtering in one operation
  const transactions = useLiveQuery(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let collection: any;

    if (yearMonth) {
      // 1. Filter by Year/Month (Most selective)
      if (yearMonth.length === 4) {
        collection = db.transactions
          .where("date")
          .between(`${yearMonth}-01-01`, `${yearMonth}-12-31\uffff`);
      } else {
        collection = db.transactions.where("year_month").equals(yearMonth);
      }
    } else if (groupId && typeof groupId === "string") {
      // 2. Filter by Group ID (if no date filter) - Uses Index!
      collection = db.transactions.where("group_id").equals(groupId);
    } else {
      // 3. No filters or Personal only (fallback to date sort)
      collection = db.transactions.orderBy("date");
    }

    // Apply remaining filters
    let results: Transaction[] = await collection.reverse().toArray();

    // Apply group filter if not already applied via index
    // (e.g. if we queried by yearMonth, or if we want personal only)
    if (groupId !== undefined) {
      if (groupId === null) {
        // Return only personal transactions
        results = results.filter((tOrG) => !tOrG.group_id);
      } else if (yearMonth) {
        // If we queried by yearMonth, we still need to filter by group
        results = results.filter((tOrG) => tOrG.group_id === groupId);
      }
    }

    // Filter out soft-deleted transactions
    results = results.filter((t) => !t.deleted_at);

    // Apply limit if needed (and not already applied effectively)
    if (limit && results.length > limit) {
      results = results.slice(0, limit);
    }

    // Sort by date descending (most recent first)
    // We sort here because some query paths don't guarantee order
    results.sort((a: Transaction, b: Transaction) =>
      b.date.localeCompare(a.date)
    );

    return results;
  }, [limit, yearMonth, groupId]);

  const addTransaction = async (
    transaction: Omit<
      Transaction,
      "id" | "sync_token" | "pendingSync" | "deleted_at"
    >
  ) => {
    // Validate input data
    const validatedData = validate(getTransactionInputSchema(t), transaction);

    const id = uuidv4();
    await db.transactions.add({
      ...validatedData,
      id,
      pendingSync: 1,
      deleted_at: null,
    });
    syncManager.schedulePush();
  };

  const updateTransaction = async (
    id: string,
    updates: Partial<Omit<Transaction, "id" | "sync_token" | "pendingSync">>
  ) => {
    // Validate update data (partial validation)
    const validatedUpdates = validate(getTransactionUpdateSchema(t), updates);

    await db.transactions.update(id, {
      ...validatedUpdates,
      pendingSync: 1,
    });
    syncManager.schedulePush();
  };

  const deleteTransaction = async (id: string) => {
    // Soft delete
    await db.transactions.update(id, {
      deleted_at: new Date().toISOString(),
      pendingSync: 1,
    });
    syncManager.schedulePush();
  };

  const restoreTransaction = async (id: string) => {
    await db.transactions.update(id, {
      deleted_at: null,
      pendingSync: 1,
    });
    syncManager.schedulePush();
  };

  const recordPairSettlement = async ({
    userId,
    groupId,
    fromMemberId,
    toMemberId,
    amount,
    note,
    date,
  }: PairSettlementInput & { userId: string }) => {
    if (fromMemberId === toMemberId) {
      throw new Error("Settlement payer and receiver cannot be the same.");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Settlement amount must be greater than zero.");
    }

    const now = new Date();
    const payment: SettlementPayment = {
      id: uuidv4(),
      group_id: groupId,
      from_member_id: fromMemberId,
      to_member_id: toMemberId,
      amount,
      date: date ?? now.toISOString().slice(0, 10),
      note: note?.trim() || null,
      created_by: userId,
      deleted_at: null,
      pendingSync: 1,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    await db.settlement_payments.add(payment);
    syncManager.schedulePush();
    return payment.id;
  };

  const recordGroupSettlement = async ({
    userId,
    groupId,
    note,
    settlements,
    date,
  }: {
    userId: string;
    groupId: string;
    note: string;
    settlements: Array<{
      fromMemberId: string;
      toMemberId: string;
      amount: number;
    }>;
    date?: string;
  }) => {
    if (settlements.length === 0) return [];

    const createdIds: string[] = [];
    for (const settlement of settlements) {
      if (settlement.amount <= 0) continue;
      const id = await recordPairSettlement({
        userId,
        groupId,
        fromMemberId: settlement.fromMemberId,
        toMemberId: settlement.toMemberId,
        amount: settlement.amount,
        note,
        date,
      });
      createdIds.push(id);
    }

    return createdIds;
  };

  const undoSettlementPayment = async (settlementPaymentId: string) => {
    await db.settlement_payments.update(settlementPaymentId, {
      deleted_at: new Date().toISOString(),
      pendingSync: 1,
      updated_at: new Date().toISOString(),
    });
    syncManager.schedulePush();
  };

  return {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    restoreTransaction,
    recordPairSettlement,
    recordGroupSettlement,
    undoSettlementPayment,
  };
}
