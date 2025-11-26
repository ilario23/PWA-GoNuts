import Dexie, { Table } from "dexie";

export interface Group {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  deleted_at?: string | null;
  pendingSync?: number;
  sync_token?: number;
  updated_at?: string;
  created_at?: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  share: number; // 0-100 percentage
  joined_at?: string;
  removed_at?: string | null;
  pendingSync?: number;
  sync_token?: number;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  group_id?: string | null;
  paid_by_user_id?: string | null;
  category_id: string;
  context_id?: string;
  type: "income" | "expense" | "investment";
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
  group_id?: string | null;
  name: string;
  icon: string;
  color: string;
  type: "income" | "expense" | "investment";
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
  group_id?: string | null;
  paid_by_user_id?: string | null;
  type: "income" | "expense" | "investment";
  category_id: string;
  context_id?: string;
  amount: number;
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
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
  include_group_expenses: boolean;
  monthly_budget?: number | null;
  cached_month?: number;
  last_sync_token?: number;
  updated_at?: string;
}

export class AppDatabase extends Dexie {
  groups!: Table<Group>;
  group_members!: Table<GroupMember>;
  transactions!: Table<Transaction>;
  categories!: Table<Category>;
  contexts!: Table<Context>;
  recurring_transactions!: Table<RecurringTransaction>;
  user_settings!: Table<Setting>;

  constructor() {
    super("ExpenseTrackerDB");
    this.version(1).stores({
      transactions:
        "id, user_id, category_id, context_id, type, date, year_month, pendingSync, deleted_at",
      categories: "id, user_id, type, pendingSync, deleted_at",
      contexts: "id, user_id, pendingSync, deleted_at",
      recurring_transactions:
        "id, user_id, type, frequency, pendingSync, deleted_at",
      user_settings: "user_id", // Primary key is user_id
    });

    // Version 2: Add groups support
    this.version(2).stores({
      groups: "id, created_by, pendingSync, deleted_at",
      group_members: "id, group_id, user_id, pendingSync, removed_at",
      transactions:
        "id, user_id, group_id, category_id, context_id, type, date, year_month, pendingSync, deleted_at",
      categories: "id, user_id, group_id, type, pendingSync, deleted_at",
      contexts: "id, user_id, pendingSync, deleted_at",
      recurring_transactions:
        "id, user_id, group_id, type, frequency, pendingSync, deleted_at",
      user_settings: "user_id",
    });
  }

  /**
   * Clear all local data from IndexedDB.
   * This does NOT affect the remote Supabase database.
   * Use this for troubleshooting or after logout.
   */
  async clearLocalCache(): Promise<void> {
    await Promise.all([
      this.groups.clear(),
      this.group_members.clear(),
      this.transactions.clear(),
      this.categories.clear(),
      this.contexts.clear(),
      this.recurring_transactions.clear(),
      this.user_settings.clear(),
    ]);
  }
}

export const db = new AppDatabase();
