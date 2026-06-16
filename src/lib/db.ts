import Dexie, { Table } from "dexie";

/**
 * @fileoverview IndexedDB database schema using Dexie.js for local-first storage.
 *
 * This module defines the local database schema that mirrors the Supabase backend.
 * All entities include `pendingSync` flag for tracking unsynced changes and
 * `sync_token` for delta synchronization.
 *
 * @module lib/db
 */

/**
 * Shared expense group for collaborative budgeting.
 */
export interface Group {
  /** UUID primary key */
  id: string;
  /** Display name of the group */
  name: string;
  /** Optional description */
  description?: string;
  /** User ID of the group creator */
  created_by: string;
  /** Soft delete timestamp (ISO 8601) */
  deleted_at?: string | null;
  /** 1 if changes pending sync, 0 otherwise */
  pendingSync?: number;
  /** Server-assigned sync token for delta sync */
  sync_token?: number;
  /** Last modification timestamp (ISO 8601) */
  updated_at?: string;
  /** Creation timestamp (ISO 8601) */
  created_at?: string;
}

/**
 * Group membership with expense share percentage.
 */
export interface GroupMember {
  /** UUID primary key */
  id: string;
  /** Reference to parent group */
  group_id: string;
  /** Reference to member user (optional for guests) */
  user_id?: string | null;
  /** Name for guest users */
  guest_name?: string | null;
  /** Flag for guest users */
  is_guest?: boolean;
  /** Expense share percentage (0-100) */
  share: number;
  /** When the user joined (ISO 8601) */
  joined_at?: string;
  /** Soft remove timestamp, null if active (ISO 8601) */
  removed_at?: string | null;
  /** 1 if changes pending sync, 0 otherwise */
  pendingSync?: number;
  /** Server-assigned sync token */
  sync_token?: number;
  /** Last modification timestamp (ISO 8601) */
  updated_at?: string;
}

/**
 * Financial transaction (income, expense, or investment).
 */
export interface Transaction {
  /** UUID primary key */
  id: string;
  /** Owner user ID */
  user_id: string;
  /** Group ID for shared expenses (null = personal) */
  group_id?: string | null;
  /** Reference to group_members.id (precise payer) */
  paid_by_member_id?: string | null;
  /** Reference to category */
  category_id: string;
  /** Optional context reference */
  context_id?: string;
  /** Transaction type */
  type: "income" | "expense" | "investment";
  /** Amount in user's currency */
  amount: number;
  /** Transaction date (YYYY-MM-DD) */
  date: string;
  /** Computed index for month queries (YYYY-MM) */
  year_month: string;
  /** User-provided description */
  description: string;
  /** Source recurring template when generated from recurrence */
  recurring_transaction_id?: string | null;
  /** Occurrence calendar date (YYYY-MM-DD), mirrors remote `date` granularity */
  recurrence_occurrence_date?: string | null;
  /** Idempotency key: `${recurring_transaction_id}|YYYY-MM-DD` */
  recurrence_key?: string | null;
  /** Soft delete timestamp (ISO 8601) */
  deleted_at?: string | null;
  /** 1 if changes pending sync, 0 otherwise (number for IndexedDB indexing) */
  pendingSync?: number;
  /** Server-assigned sync token */
  sync_token?: number;
}

/**
 * Transaction category with hierarchical support.
 */
export interface Category {
  /** UUID primary key */
  id: string;
  /** Owner user ID */
  user_id: string;
  /** Group ID for shared categories (null = personal) */
  group_id?: string | null;
  /** Display name */
  name: string;
  /** Lucide icon name */
  icon: string;
  /** Hex color code */
  color: string;
  /** Category type matching transaction types */
  type: "income" | "expense" | "investment";
  /** Parent category ID for hierarchy (undefined = root) */
  parent_id?: string;
  /** 1 = active, 0 = hidden */
  active: number;
  /** Soft delete timestamp (ISO 8601) */
  deleted_at?: string | null;
  /** 1 if changes pending sync, 0 otherwise */
  pendingSync?: number;
  /** Server-assigned sync token */
  sync_token?: number;
}

/**
 * Transaction context for additional categorization (e.g., "Work", "Vacation").
 */
export interface Context {
  /** UUID primary key */
  id: string;
  /** Owner user ID */
  user_id: string;
  /** Display name */
  name: string;
  /** Optional description */
  description?: string;
  /** 1 = active, 0 = hidden */
  active: number;
  /** Soft delete timestamp (ISO 8601) */
  deleted_at?: string | null;
  /** 1 if changes pending sync, 0 otherwise */
  pendingSync?: number;
  /** Server-assigned sync token */
  sync_token?: number;
}

/**
 * Recurring transaction template for automatic generation.
 */
export interface RecurringTransaction {
  /** UUID primary key */
  id: string;
  /** Owner user ID */
  user_id: string;
  /** Group ID for shared recurring (null = personal) */
  group_id?: string | null;
  /** Reference to group_members.id (precise payer) */
  paid_by_member_id?: string | null;
  /** Transaction type */
  type: "income" | "expense" | "investment";
  /** Reference to category */
  category_id: string;
  /** Optional context reference */
  context_id?: string;
  /** Amount per occurrence */
  amount: number;
  /** User-provided description */
  description: string;
  /** Recurrence frequency */
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  /** First occurrence date (YYYY-MM-DD) */
  start_date: string;
  /** Last occurrence date (YYYY-MM-DD), null = indefinite */
  end_date?: string | null;
  /** 1 = active, 0 = paused */
  active: number;
  /** Date of last generated transaction (YYYY-MM-DD) */
  last_generated?: string;
  /** Soft delete timestamp (ISO 8601) */
  deleted_at?: string | null;
  /** 1 if changes pending sync, 0 otherwise */
  pendingSync?: number;
  /** Server-assigned sync token */
  sync_token?: number;
  /** Creation timestamp (ISO 8601) */
  created_at?: string;
}

/**
 * Settlement payment between two group members.
 */
export interface SettlementPayment {
  /** UUID primary key */
  id: string;
  /** Reference to parent group */
  group_id: string;
  /** Debtor member (payer) */
  from_member_id: string;
  /** Creditor member (receiver) */
  to_member_id: string;
  /** Settled amount */
  amount: number;
  /** Settlement date (YYYY-MM-DD) */
  date: string;
  /** Optional note */
  note?: string | null;
  /** User who created this entry */
  created_by: string;
  /** Soft delete timestamp (ISO 8601) */
  deleted_at?: string | null;
  /** 1 if changes pending sync, 0 otherwise */
  pendingSync?: number;
  /** Server-assigned sync token */
  sync_token?: number;
  /** Last modification timestamp (ISO 8601) */
  updated_at?: string;
  /** Creation timestamp (ISO 8601) */
  created_at?: string;
}

/**
 * User preferences and application settings.
 */
export interface Setting {
  /** User ID (primary key) */
  user_id: string;
  /** Currency code (e.g., "EUR", "USD") */
  currency: string;
  /** Language code (e.g., "en", "it") */
  language: string;
  /** Theme mode: "light", "dark", or "system" */
  theme: string;
  /** Accent color from theme palette */
  accentColor: string;
  /** First day of week: "monday" or "sunday" */
  start_of_week: string;
  /** Default transaction list view */
  default_view: string;
  /** Include investments when calculating expense totals */
  include_investments_in_expense_totals: boolean;
  /** Include group expenses in personal statistics */
  include_group_expenses: boolean;
  /** Optional overall monthly budget target */
  monthly_budget?: number | null;
  /** Cached month for budget calculations */
  cached_month?: number;
  /** Last sync token for delta synchronization */
  last_sync_token?: number;
  /** Tracks one-shot migration from legacy marker transactions */
  legacy_settlement_migrated_at?: string | null;
  /** Last settings update timestamp (ISO 8601) */
  updated_at?: string;
}

/**
 * Category-specific budget with period tracking.
 */
export interface CategoryBudget {
  /** UUID primary key */
  id: string;
  /** Owner user ID */
  user_id: string;
  /** Reference to category */
  category_id: string;
  /** Budget amount in user's currency */
  amount: number;
  /** Budget period */
  period: "monthly" | "yearly";
  /** Soft delete timestamp (ISO 8601) */
  deleted_at?: string | null;
  /** 1 if changes pending sync, 0 otherwise */
  pendingSync?: number;
  /** Server-assigned sync token */
  sync_token?: number;
  /** Last modification timestamp (ISO 8601) */
  updated_at?: string;
  /** Creation timestamp (ISO 8601) */
  created_at?: string;
}

/**
 * Public user profile.
 */
export interface Profile {
  /** UUID primary key (matches auth.users.id) */
  id: string;
  /** User's email (publicly visible) */
  email?: string | null;
  /** User's full name */
  full_name?: string | null;
  /** URL to user's avatar image */
  avatar_url?: string | null;
  /** Last modification timestamp (ISO 8601) */
  updated_at?: string;
  /** 1 if changes pending sync, 0 otherwise */
  pendingSync?: number;
  /** Server-assigned sync token */
  sync_token?: number;
}

/**
 * Rules for auto-categorizing transactions during import/reconciliation.
 */
export interface ImportRule {
  /** UUID primary key */
  id: string;
  /** Owner user ID */
  user_id: string;
  /** String to match against transaction description */
  match_string: string;
  /** Match type strategy */
  match_type: "contains" | "exact" | "regex";
  /** Category to assign if matched */
  category_id: string;
  /** 1 = active, 0 = disabled */
  active: number;
  /** Soft delete timestamp (ISO 8601) */
  deleted_at?: string | null;
  /** 1 if changes pending sync, 0 otherwise */
  pendingSync?: number;
  /** Server-assigned sync token */
  sync_token?: number;
  /** Creation timestamp (ISO 8601) */
  created_at?: string;
  /** Last update timestamp (ISO 8601) */
  updated_at?: string;
}

/**
 * Dexie database class for the expense tracker application.
 *
 * Provides typed access to all IndexedDB tables with proper indexing
 * for efficient queries. Supports versioned schema migrations.
 */
/**
 * Persisted sync error so quarantine state and failure history
 * survive page reloads (the SyncManager hydrates from this table).
 */
export interface SyncErrorRecord {
  /** "<table>:<itemId>" for push errors, "pull:<table>" for pull errors */
  key: string;
  id: string;
  table: string;
  operation: "push" | "pull";
  error: string;
  attempts: number;
  lastAttempt: string;
  isQuarantined: boolean;
}

/**
 * A captured edit conflict. When a local row has unpushed edits AND the remote
 * copy also changed (newer sync_token), last-write-wins keeps the local version
 * and would otherwise discard the remote one silently — costing a collaborator
 * their edit on a shared group row. We stash the dropped remote version here so
 * it is recoverable / reviewable instead of lost.
 */
export interface SyncConflict {
  /** "<table>:<itemId>" — primary key, so re-detecting updates in place */
  key: string;
  table: string;
  itemId: string;
  /** Local row's updated_at at conflict time (the version that won) */
  localUpdatedAt?: string | null;
  /** Remote row's updated_at (the version that was dropped) */
  remoteUpdatedAt?: string | null;
  /** Full JSON of the dropped remote row, for recovery */
  remoteData: string;
  /** When the conflict was detected (ISO 8601) */
  detectedAt: string;
  /** Set when the user has reviewed/dismissed it (ISO 8601), null = open */
  resolvedAt?: string | null;
}

export class AppDatabase extends Dexie {
  groups!: Table<Group>;
  group_members!: Table<GroupMember>;
  transactions!: Table<Transaction>;
  categories!: Table<Category>;
  contexts!: Table<Context>;
  recurring_transactions!: Table<RecurringTransaction>;
  settlement_payments!: Table<SettlementPayment>;
  user_settings!: Table<Setting>;
  category_budgets!: Table<CategoryBudget>;
  profiles!: Table<Profile>;
  import_rules!: Table<ImportRule>;
  sync_errors!: Table<SyncErrorRecord>;
  sync_conflicts!: Table<SyncConflict>;

  constructor() {
    super("ExpenseTrackerDB");
    this.version(1).stores({
      groups: "id, created_by, pendingSync, deleted_at",
      group_members:
        "id, group_id, user_id, guest_name, is_guest, pendingSync, removed_at",
      transactions:
        "id, user_id, group_id, paid_by_member_id, recurring_transaction_id, category_id, context_id, type, date, year_month, pendingSync, deleted_at, [group_id+year_month], [type+year_month], [category_id+year_month]",
      categories: "id, user_id, group_id, name, type, pendingSync, deleted_at",
      contexts: "id, user_id, pendingSync, deleted_at",
      recurring_transactions:
        "id, user_id, group_id, paid_by_member_id, category_id, context_id, type, frequency, pendingSync, deleted_at",
      settlement_payments:
        "id, group_id, from_member_id, to_member_id, created_by, date, pendingSync, deleted_at",
      user_settings: "user_id",
      category_budgets:
        "id, user_id, category_id, period, pendingSync, deleted_at",
      profiles: "id, pendingSync",
      import_rules: "id, user_id, match_type, pendingSync, deleted_at",
    });
    this.version(2).stores({
      groups: "id, created_by, pendingSync, deleted_at",
      group_members:
        "id, group_id, user_id, guest_name, is_guest, pendingSync, removed_at",
      transactions:
        "id, user_id, group_id, paid_by_member_id, recurring_transaction_id, recurrence_key, category_id, context_id, type, date, year_month, pendingSync, deleted_at, [group_id+year_month], [type+year_month], [category_id+year_month]",
      categories: "id, user_id, group_id, name, type, pendingSync, deleted_at",
      contexts: "id, user_id, pendingSync, deleted_at",
      recurring_transactions:
        "id, user_id, group_id, paid_by_member_id, category_id, context_id, type, frequency, pendingSync, deleted_at",
      settlement_payments:
        "id, group_id, from_member_id, to_member_id, created_by, date, pendingSync, deleted_at",
      user_settings: "user_id",
      category_budgets:
        "id, user_id, category_id, period, pendingSync, deleted_at",
      profiles: "id, pendingSync",
      import_rules: "id, user_id, match_type, pendingSync, deleted_at",
    });
    this.version(3).stores({
      groups: "id, created_by, pendingSync, deleted_at",
      group_members:
        "id, group_id, user_id, guest_name, is_guest, pendingSync, removed_at",
      transactions:
        "id, user_id, group_id, paid_by_member_id, recurring_transaction_id, recurrence_key, category_id, context_id, type, date, year_month, pendingSync, deleted_at, [group_id+year_month], [type+year_month], [category_id+year_month]",
      categories: "id, user_id, group_id, name, type, pendingSync, deleted_at",
      contexts: "id, user_id, pendingSync, deleted_at",
      recurring_transactions:
        "id, user_id, group_id, paid_by_member_id, category_id, context_id, type, frequency, pendingSync, deleted_at",
      settlement_payments:
        "id, group_id, from_member_id, to_member_id, created_by, date, pendingSync, deleted_at",
      user_settings: "user_id",
      category_budgets:
        "id, user_id, category_id, period, pendingSync, deleted_at",
      profiles: "id, pendingSync",
      import_rules: "id, user_id, match_type, pendingSync, deleted_at",
    });
    // v4: persist sync errors so quarantine state survives reloads
    this.version(4).stores({
      sync_errors: "key",
    });
    // v5: capture remote edits dropped by last-write-wins so they're recoverable
    this.version(5).stores({
      sync_conflicts: "key, table, resolvedAt",
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
      this.settlement_payments.clear(),
      this.user_settings.clear(),
      this.category_budgets.clear(),
      this.profiles.clear(),
      this.import_rules.clear(),
      this.sync_errors.clear(),
      this.sync_conflicts.clear(),
    ]);

    // Also purge service-worker runtime caches that may hold API responses
    // (financial data must not survive logout in Cache Storage).
    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.includes("supabase"))
            .map((key) => caches.delete(key))
        );
      } catch {
        // Cache Storage unavailable (private mode) — nothing to purge
      }
    }
  }
}

export const db = new AppDatabase();
