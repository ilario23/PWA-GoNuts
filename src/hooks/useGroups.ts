import { useLiveQuery } from 'dexie-react-hooks';
import { db, Group, GroupMember } from '../lib/db';
import { syncManager } from '../lib/sync';
import { useAuth } from './useAuth';
import { v4 as uuidv4 } from 'uuid';

export interface GroupWithMembers extends Group {
    members: GroupMember[];
    isCreator: boolean;
    myShare: number;
}

export function useGroups() {
    const { user } = useAuth();

    // Get all groups where user is a member or creator
    const groups = useLiveQuery(async () => {
        if (!user) return [];

        const allGroups = await db.groups.toArray();
        const allMembers = await db.group_members.toArray();

        // Filter groups where user is creator or active member
        const userGroups = allGroups.filter(g => {
            if (g.deleted_at) return false;
            if (g.created_by === user.id) return true;
            return allMembers.some(m => 
                m.group_id === g.id && 
                m.user_id === user.id && 
                !m.removed_at
            );
        });

        // Enrich with members info
        return userGroups.map(g => {
            const groupMembers = allMembers.filter(m => 
                m.group_id === g.id && !m.removed_at
            );
            const myMembership = groupMembers.find(m => m.user_id === user.id);
            
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

        const groupId = uuidv4();
        const memberId = uuidv4();

        // Create group
        await db.groups.add({
            id: groupId,
            name,
            description,
            created_by: user.id,
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

        syncManager.sync();
        return groupId;
    };

    const updateGroup = async (id: string, updates: Partial<Pick<Group, 'name' | 'description'>>) => {
        await db.groups.update(id, {
            ...updates,
            pendingSync: 1,
            updated_at: new Date().toISOString(),
        });
        syncManager.sync();
    };

    const deleteGroup = async (id: string, deleteTransactions: boolean = false) => {
        // Soft delete group
        await db.groups.update(id, {
            deleted_at: new Date().toISOString(),
            pendingSync: 1,
            updated_at: new Date().toISOString(),
        });

        // Always soft delete group categories
        const groupCategories = await db.categories
            .filter(c => c.group_id === id)
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
                .filter(t => t.group_id === id)
                .toArray();
            
            for (const tx of groupTransactions) {
                await db.transactions.update(tx.id, {
                    deleted_at: new Date().toISOString(),
                    pendingSync: 1,
                });
            }

            // Soft delete recurring transactions
            const groupRecurring = await db.recurring_transactions
                .filter(r => r.group_id === id)
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
                .filter(t => t.group_id === id)
                .toArray();
            
            for (const tx of groupTransactions) {
                await db.transactions.update(tx.id, {
                    group_id: null,
                    paid_by_user_id: null,
                    pendingSync: 1,
                });
            }
        }

        syncManager.sync();
    };

    const addMember = async (groupId: string, userId: string, share: number = 0) => {
        const memberId = uuidv4();
        
        await db.group_members.add({
            id: memberId,
            group_id: groupId,
            user_id: userId,
            share,
            joined_at: new Date().toISOString(),
            removed_at: null,
            pendingSync: 1,
            updated_at: new Date().toISOString(),
        });

        syncManager.sync();
        return memberId;
    };

    const removeMember = async (memberId: string) => {
        await db.group_members.update(memberId, {
            removed_at: new Date().toISOString(),
            pendingSync: 1,
            updated_at: new Date().toISOString(),
        });
        syncManager.sync();
    };

    const updateMemberShare = async (memberId: string, share: number) => {
        await db.group_members.update(memberId, {
            share,
            pendingSync: 1,
            updated_at: new Date().toISOString(),
        });
        syncManager.sync();
    };

    const updateAllShares = async (_groupId: string, shares: { memberId: string; share: number }[]) => {
        for (const { memberId, share } of shares) {
            await db.group_members.update(memberId, {
                share,
                pendingSync: 1,
                updated_at: new Date().toISOString(),
            });
        }
        syncManager.sync();
    };

    // Calculate group balances
    const getGroupBalance = async (groupId: string) => {
        const members = await db.group_members
            .filter(m => m.group_id === groupId && !m.removed_at)
            .toArray();

        const transactions = await db.transactions
            .filter(t => t.group_id === groupId && !t.deleted_at)
            .toArray();

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const balances: Record<string, { 
            userId: string;
            share: number;
            shouldPay: number; 
            hasPaid: number; 
            balance: number;
        }> = {};

        // Calculate what each member should pay based on share
        for (const member of members) {
            const shouldPay = (totalExpenses * member.share) / 100;
            const hasPaid = transactions
                .filter(t => t.paid_by_user_id === member.user_id && t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            balances[member.user_id] = {
                userId: member.user_id,
                share: member.share,
                shouldPay,
                hasPaid,
                balance: hasPaid - shouldPay, // Positive = owed money, Negative = owes money
            };
        }

        return {
            totalExpenses,
            balances,
            members,
        };
    };

    return {
        groups: groups || [],
        createGroup,
        updateGroup,
        deleteGroup,
        addMember,
        removeMember,
        updateMemberShare,
        updateAllShares,
        getGroupBalance,
    };
}
