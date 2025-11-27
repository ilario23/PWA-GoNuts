import { z } from "zod";

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

const uuidSchema = z.string().uuid("Invalid UUID format");

const transactionTypeSchema = z.enum(["income", "expense", "investment"], {
  error: "Type must be 'income', 'expense', or 'investment'",
});

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

const yearMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Year-month must be in YYYY-MM format");

// ============================================================================
// TRANSACTION SCHEMA
// ============================================================================

export const TransactionInputSchema = z.object({
  user_id: uuidSchema,
  group_id: z.string().uuid().nullable().optional(),
  paid_by_user_id: z.string().uuid().nullable().optional(),
  category_id: uuidSchema,
  context_id: z.string().uuid().optional(),
  type: transactionTypeSchema,
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .finite("Amount must be a finite number"),
  date: dateStringSchema,
  year_month: yearMonthSchema,
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
});

export const TransactionUpdateSchema = TransactionInputSchema.partial().omit({
  user_id: true,
});

export type TransactionInput = z.infer<typeof TransactionInputSchema>;
export type TransactionUpdate = z.infer<typeof TransactionUpdateSchema>;

// ============================================================================
// CATEGORY SCHEMA
// ============================================================================

export const CategoryInputSchema = z.object({
  user_id: uuidSchema,
  group_id: z.string().uuid().nullable().optional(),
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be less than 100 characters"),
  icon: z.string().min(1, "Icon is required"),
  color: z.string().min(1, "Color is required"),
  type: transactionTypeSchema,
  parent_id: z.string().uuid().optional(),
  active: z.number().int().min(0).max(1).default(1),
});

export const CategoryUpdateSchema = CategoryInputSchema.partial().omit({
  user_id: true,
});

export type CategoryInput = z.infer<typeof CategoryInputSchema>;
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;

// ============================================================================
// CONTEXT SCHEMA
// ============================================================================

export const ContextInputSchema = z.object({
  user_id: uuidSchema,
  name: z
    .string()
    .min(1, "Context name is required")
    .max(100, "Context name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  active: z.number().int().min(0).max(1).default(1),
});

export const ContextUpdateSchema = ContextInputSchema.partial().omit({
  user_id: true,
});

export type ContextInput = z.infer<typeof ContextInputSchema>;
export type ContextUpdate = z.infer<typeof ContextUpdateSchema>;

// ============================================================================
// RECURRING TRANSACTION SCHEMA
// ============================================================================

const frequencySchema = z.enum(["daily", "weekly", "monthly", "yearly"], {
  error: "Frequency must be 'daily', 'weekly', 'monthly', or 'yearly'",
});

export const RecurringTransactionInputSchema = z.object({
  user_id: uuidSchema,
  group_id: z.string().uuid().nullable().optional(),
  paid_by_user_id: z.string().uuid().nullable().optional(),
  type: transactionTypeSchema,
  category_id: uuidSchema,
  context_id: z.string().uuid().optional(),
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .finite("Amount must be a finite number"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  frequency: frequencySchema,
  start_date: dateStringSchema,
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  active: z.number().int().min(0).max(1).default(1),
});

export const RecurringTransactionUpdateSchema = RecurringTransactionInputSchema.partial().omit({
  user_id: true,
});

export type RecurringTransactionInput = z.infer<typeof RecurringTransactionInputSchema>;
export type RecurringTransactionUpdate = z.infer<typeof RecurringTransactionUpdateSchema>;

// ============================================================================
// GROUP SCHEMA
// ============================================================================

export const GroupInputSchema = z.object({
  name: z
    .string()
    .min(1, "Group name is required")
    .max(100, "Group name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  created_by: uuidSchema,
});

export const GroupUpdateSchema = GroupInputSchema.partial().omit({
  created_by: true,
});

export type GroupInput = z.infer<typeof GroupInputSchema>;
export type GroupUpdate = z.infer<typeof GroupUpdateSchema>;

// ============================================================================
// GROUP MEMBER SCHEMA
// ============================================================================

export const GroupMemberInputSchema = z.object({
  group_id: uuidSchema,
  user_id: uuidSchema,
  share: z
    .number()
    .min(0, "Share must be at least 0")
    .max(100, "Share cannot exceed 100"),
});

export const GroupMemberUpdateSchema = z.object({
  share: z
    .number()
    .min(0, "Share must be at least 0")
    .max(100, "Share cannot exceed 100"),
});

export type GroupMemberInput = z.infer<typeof GroupMemberInputSchema>;
export type GroupMemberUpdate = z.infer<typeof GroupMemberUpdateSchema>;

// ============================================================================
// CATEGORY BUDGET SCHEMA
// ============================================================================

const budgetPeriodSchema = z.enum(["monthly", "yearly"], {
  error: "Period must be 'monthly' or 'yearly'",
});

export const CategoryBudgetInputSchema = z.object({
  user_id: uuidSchema,
  category_id: uuidSchema,
  amount: z
    .number()
    .positive("Budget amount must be greater than 0")
    .finite("Amount must be a finite number"),
  period: budgetPeriodSchema,
});

export const CategoryBudgetUpdateSchema = CategoryBudgetInputSchema.partial().omit({
  user_id: true,
});

export type CategoryBudgetInput = z.infer<typeof CategoryBudgetInputSchema>;
export type CategoryBudgetUpdate = z.infer<typeof CategoryBudgetUpdateSchema>;

// ============================================================================
// USER SETTINGS SCHEMA
// ============================================================================

export const UserSettingsSchema = z.object({
  user_id: uuidSchema,
  currency: z.string().length(3, "Currency must be a 3-letter code").default("EUR"),
  language: z.string().min(2).max(5).default("en"),
  theme: z.enum(["light", "dark", "system"]).default("light"),
  accentColor: z.string().default("slate"),
  start_of_week: z.enum(["monday", "sunday"]).default("monday"),
  default_view: z.enum(["list", "grid"]).default("list"),
  include_investments_in_expense_totals: z.boolean().default(false),
  include_group_expenses: z.boolean().default(false),
  monthly_budget: z.number().positive().nullable().optional(),
});

export const UserSettingsUpdateSchema = UserSettingsSchema.partial().omit({
  user_id: true,
});

export type UserSettingsInput = z.infer<typeof UserSettingsSchema>;
export type UserSettingsUpdate = z.infer<typeof UserSettingsUpdateSchema>;

// ============================================================================
// VALIDATION HELPER
// ============================================================================

export class ValidationError extends Error {
  public errors: z.ZodIssue[];

  constructor(errors: z.ZodIssue[]) {
    const message = errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

/**
 * Validates data against a Zod schema.
 * Throws ValidationError if validation fails.
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }
  return result.data;
}

/**
 * Validates data and returns a result object instead of throwing.
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: result.error.issues };
  }
  return { success: true, data: result.data };
}
