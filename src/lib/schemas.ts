import { z } from "zod";

export const recurringTransactionSchema = z.object({
    amount: z.coerce
        .number()
        .min(0.01, "Amount must be greater than 0"),
    description: z.string().min(1, "Description is required"),
    type: z.enum(["income", "expense", "investment"]),
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    start_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date",
    }),
    category_id: z.string().min(1, "Category is required"),
    context_id: z.string().optional().nullable(),
    group_id: z.string().optional().nullable(),
    paid_by_member_id: z.string().optional().nullable(),
});

export type RecurringTransactionFormValues = z.infer<
    typeof recurringTransactionSchema
>;

export const transactionSchema = z.object({
    amount: z.coerce
        .number()
        .min(0.01, "Amount must be greater than 0"),
    description: z.string().optional(),
    type: z.enum(["income", "expense", "investment"]),
    category_id: z.string().min(1, "Category is required"),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date",
    }),
    context_id: z.string().optional().nullable(),
    group_id: z.string().optional().nullable(),
    paid_by_member_id: z.string().optional().nullable(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;

export const categorySchema = z.object({
    name: z.string().min(1, "Name is required"),
    color: z.string().optional(),
    type: z.enum(["income", "expense", "investment"]),
    icon: z.string().optional(),
    parent_id: z.string().optional().nullable(),
    active: z.boolean(),
    budget: z.coerce.number().optional(),
    group_id: z.string().optional().nullable(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const groupSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
});

export type GroupFormValues = z.infer<typeof groupSchema>;

export const contextSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    active: z.boolean().optional().default(true),
});

export type ContextFormValues = z.infer<typeof contextSchema>;
