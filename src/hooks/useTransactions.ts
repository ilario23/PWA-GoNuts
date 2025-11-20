import { useLiveQuery } from 'dexie-react-hooks';
import { db, Transaction } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

export function useTransactions() {
    const transactions = useLiveQuery(() =>
        db.transactions.orderBy('date').reverse().toArray()
    );

    const addTransaction = async (transaction: Omit<Transaction, 'id' | 'sync_token' | 'pendingSync' | 'deleted_at'>) => {
        const id = uuidv4();
        await db.transactions.add({
            ...transaction,
            id,
            pendingSync: 1,
            deleted_at: null,
        });
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
