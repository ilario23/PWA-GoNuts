import Dexie, { Table } from 'dexie';

export interface Transaction {
    id: string;
    user_id: string;
    category_id: string; // Now required
    context_id?: string;
    type: 'income' | 'expense' | 'investment';
    amount: number;
    date: string;
    year_month: string;
    description: string;
    deleted_at?: string | null;
    pendingSync?: number; // 1 for true, 0 for false (indexeddb boolean indexing is tricky sometimes, number is safer)
    sync_token?: number;
}

export interface Category {
    id: string;
    user_id: string;
    name: string;
    icon: string; // Now required
    color: string;
    type: 'income' | 'expense' | 'investment';
    parent_id?: string;
    active: number; // 1 or 0
    deleted_at?: string | null;
    pendingSync?: number;
    sync_token?: number;
}

export interface Context {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    active: number;
    deleted_at?: string | null;
    pendingSync?: number;
    sync_token?: number;
}

export interface RecurringTransaction {
    id: string;
    user_id: string;
    type: 'income' | 'expense' | 'investment';
    category_id: string; // Now required
    context_id?: string;
    amount: number;
    description: string; // Now required
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    start_date: string;
    end_date?: string | null;
    active: number;
    last_generated?: string;
    deleted_at?: string | null;
    pendingSync?: number;
    sync_token?: number;
}

export interface Setting {
    user_id: string;
    currency: string;
    language: string;
    theme: string;
    accentColor: string;
    start_of_week: string;
    default_view: string;
    include_investments_in_expense_totals: boolean;
    cached_month?: number;
    last_sync_token?: number;
    updated_at?: string;
}

export class AppDatabase extends Dexie {
    transactions!: Table<Transaction>;
    categories!: Table<Category>;
    contexts!: Table<Context>;
    recurring_transactions!: Table<RecurringTransaction>;
    user_settings!: Table<Setting>;

    constructor() {
        super('ExpenseTrackerDB');
        this.version(1).stores({
            transactions: 'id, user_id, category_id, context_id, type, date, year_month, pendingSync, deleted_at',
            categories: 'id, user_id, type, pendingSync, deleted_at',
            contexts: 'id, user_id, pendingSync, deleted_at',
            recurring_transactions: 'id, user_id, type, frequency, pendingSync, deleted_at',
            user_settings: 'user_id', // Primary key is user_id
        });
    }
}

export const db = new AppDatabase();
