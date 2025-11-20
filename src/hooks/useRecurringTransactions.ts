import { useLiveQuery } from 'dexie-react-hooks';
import { db, RecurringTransaction } from '../lib/db';
import { syncManager } from '../lib/sync';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addWeeks, addMonths, addYears, isBefore, parseISO } from 'date-fns';

export function useRecurringTransactions() {
    const recurringTransactions = useLiveQuery(() =>
        db.recurring_transactions.toArray()
    );

    const activeRecurring = recurringTransactions?.filter(r => !r.deleted_at) || [];

    const addRecurringTransaction = async (transaction: Omit<RecurringTransaction, 'id' | 'sync_token' | 'pendingSync' | 'deleted_at' | 'active' | 'last_generated'>) => {
        const id = uuidv4();
        await db.recurring_transactions.add({
            ...transaction,
            id,
            active: 1,
            pendingSync: 1,
            deleted_at: null,
            last_generated: undefined,
        });
        syncManager.sync();
    };

    const updateRecurringTransaction = async (id: string, updates: Partial<Omit<RecurringTransaction, 'id' | 'sync_token' | 'pendingSync'>>) => {
        await db.recurring_transactions.update(id, {
            ...updates,
            pendingSync: 1,
        });
    };

    const deleteRecurringTransaction = async (id: string) => {
        await db.recurring_transactions.update(id, {
            deleted_at: new Date().toISOString(),
            pendingSync: 1,
        });
    };

    const generateTransactions = async () => {
        const all = await db.recurring_transactions.toArray();
        const active = all.filter(rt => !rt.deleted_at);
        const now = new Date();

        for (const rt of active) {
            if (!rt.active || rt.deleted_at) continue;

            let nextDate = rt.last_generated ? parseISO(rt.last_generated) : parseISO(rt.start_date);

            // If never generated, start from start_date. If generated, calculate next.
            if (rt.last_generated) {
                switch (rt.frequency) {
                    case 'daily': nextDate = addDays(nextDate, 1); break;
                    case 'weekly': nextDate = addWeeks(nextDate, 1); break;
                    case 'monthly': nextDate = addMonths(nextDate, 1); break;
                    case 'yearly': nextDate = addYears(nextDate, 1); break;
                }
            }

            // Generate all missed transactions up to today
            while (isBefore(nextDate, now) || nextDate.toDateString() === now.toDateString()) {
                // Check end_date
                if (rt.end_date && isBefore(parseISO(rt.end_date), nextDate)) break;

                // Create transaction
                const transactionId = uuidv4();
                const dateStr = nextDate.toISOString().split('T')[0];

                await db.transactions.add({
                    id: transactionId,
                    user_id: rt.user_id,
                    category_id: rt.category_id,
                    context_id: rt.context_id,
                    type: rt.type,
                    amount: rt.amount,
                    date: dateStr,
                    year_month: dateStr.substring(0, 7),
                    description: rt.description || `Recurring: ${rt.frequency}`,
                    pendingSync: 1,
                    deleted_at: null,
                });

                // Update last_generated
                await db.recurring_transactions.update(rt.id, {
                    last_generated: nextDate.toISOString(),
                    pendingSync: 1,
                });

                // Calculate next date for loop
                switch (rt.frequency) {
                    case 'daily': nextDate = addDays(nextDate, 1); break;
                    case 'weekly': nextDate = addWeeks(nextDate, 1); break;
                    case 'monthly': nextDate = addMonths(nextDate, 1); break;
                    case 'yearly': nextDate = addYears(nextDate, 1); break;
                }
            }
        }
    };

    return {
        recurringTransactions: activeRecurring,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        generateTransactions,
    };
}
