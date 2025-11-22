import { useLiveQuery } from 'dexie-react-hooks';
import { db, Transaction } from '../lib/db';
import { syncManager } from '../lib/sync';
import { v4 as uuidv4 } from 'uuid';

export function useTransactions(limit?: number, yearMonth?: string) {
    const transactions = useLiveQuery(() => {
        if (yearMonth) {
            return db.transactions
                .where('year_month')
                .equals(yearMonth)
                .reverse()
                .sortBy('date');
        }

        let collection = db.transactions.orderBy('date').reverse();
        if (limit) {
            return collection.limit(limit).toArray();
        }
        return collection.toArray();
    }, [limit, yearMonth]);

    const addTransaction = async (transaction: Omit<Transaction, 'id' | 'sync_token' | 'pendingSync' | 'deleted_at'>) => {
        const id = uuidv4();
        await db.transactions.add({
            ...transaction,
            id,
            pendingSync: 1,
            deleted_at: null,
        });
        syncManager.sync();
    };

    const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id' | 'sync_token' | 'pendingSync'>>) => {
        await db.transactions.update(id, {
            ...updates,
            pendingSync: 1,
        });
    };

    const deleteTransaction = async (id: string) => {
        // Soft delete
        await db.transactions.update(id, {
            deleted_at: new Date().toISOString(),
            pendingSync: 1,
        });
    };

    return {
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
    };
}
