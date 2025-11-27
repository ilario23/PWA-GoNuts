/**
 * Shared type definitions used across the application.
 * These types are the source of truth for domain entities.
 */

import type {
  Transaction,
  Category,
  Context,
  RecurringTransaction,
  Group,
  GroupMember,
  CategoryBudget,
  Setting,
} from "./db";

// Re-export database types for convenience
export type {
  Transaction,
  Category,
  Context,
  RecurringTransaction,
  Group,
  GroupMember,
  CategoryBudget,
  Setting,
};

// ============================================================================
// SHARED ENUMS / LITERAL TYPES
// ============================================================================

/**
 * Transaction type - shared across transactions, categories, and recurring transactions
 */
export type TransactionType = "income" | "expense" | "investment";

/**
 * Recurring transaction frequency
 */
export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

/**
 * Budget period
 */
export type BudgetPeriod = "monthly" | "yearly";

/**
 * Theme options
 */
export type Theme = "light" | "dark" | "system";

/**
 * Start of week options
 */
export type StartOfWeek = "monday" | "sunday";

/**
 * Default view options
 */
export type DefaultView = "list" | "grid";

// ============================================================================
// INPUT TYPES (for creating/updating entities)
// These exclude system fields like id, pendingSync, deleted_at, sync_token
// ============================================================================

/**
 * Input for creating a new transaction
 */
export interface TransactionInput {
  user_id: string;
  group_id?: string | null;
  paid_by_user_id?: string | null;
  category_id: string;
  context_id?: string;
  type: TransactionType;
  amount: number;
  date: string;
  year_month: string;
  description: string;
}

/**
 * Input for updating an existing transaction
 */
export type TransactionUpdate = Partial<Omit<TransactionInput, "user_id">>;

/**
 * Input for creating a new category
 */
export interface CategoryInput {
  user_id: string;
  group_id?: string | null;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  parent_id?: string;
  active?: number;
}

/**
 * Input for updating an existing category
 */
export type CategoryUpdate = Partial<Omit<CategoryInput, "user_id">>;

/**
 * Input for creating a new context
 */
export interface ContextInput {
  user_id: string;
  name: string;
  description?: string;
  active?: number;
}

/**
 * Input for updating an existing context
 */
export type ContextUpdate = Partial<Omit<ContextInput, "user_id">>;

/**
 * Input for creating a new recurring transaction
 */
export interface RecurringTransactionInput {
  user_id: string;
  group_id?: string | null;
  paid_by_user_id?: string | null;
  type: TransactionType;
  category_id: string;
  context_id?: string;
  amount: number;
  description: string;
  frequency: Frequency;
  start_date: string;
  end_date?: string | null;
  active?: number;
}

/**
 * Input for updating an existing recurring transaction
 */
export type RecurringTransactionUpdate = Partial<
  Omit<RecurringTransactionInput, "user_id">
>;

/**
 * Input for creating a new group
 */
export interface GroupInput {
  name: string;
  description?: string;
  created_by: string;
}

/**
 * Input for updating an existing group
 */
export type GroupUpdate = Partial<Omit<GroupInput, "created_by">>;

/**
 * Input for adding a member to a group
 */
export interface GroupMemberInput {
  group_id: string;
  user_id: string;
  share: number;
}

/**
 * Input for updating a group member
 */
export interface GroupMemberUpdate {
  share: number;
}

/**
 * Input for creating a category budget
 */
export interface CategoryBudgetInput {
  user_id: string;
  category_id: string;
  amount: number;
  period: BudgetPeriod;
}

/**
 * Input for updating a category budget
 */
export type CategoryBudgetUpdate = Partial<
  Omit<CategoryBudgetInput, "user_id">
>;

/**
 * User settings input
 */
export interface UserSettingsInput {
  user_id: string;
  currency?: string;
  language?: string;
  theme?: Theme;
  accentColor?: string;
  start_of_week?: StartOfWeek;
  default_view?: DefaultView;
  include_investments_in_expense_totals?: boolean;
  include_group_expenses?: boolean;
  monthly_budget?: number | null;
}

/**
 * User settings update
 */
export type UserSettingsUpdate = Partial<Omit<UserSettingsInput, "user_id">>;

// ============================================================================
// ENRICHED TYPES (with joined data)
// ============================================================================

/**
 * Transaction with category and context data included
 */
export interface TransactionWithRelations extends Transaction {
  category?: Category;
  context?: Context;
}

/**
 * Group with members included
 */
export interface GroupWithMembers extends Group {
  members: GroupMember[];
}

/**
 * Category with budget info
 */
export interface CategoryWithBudget extends Category {
  budget?: CategoryBudget;
}
