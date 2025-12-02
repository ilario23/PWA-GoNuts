import { useLiveQuery } from "dexie-react-hooks";
import { db, RecurringTransaction } from "../lib/db";
import { syncManager } from "../lib/sync";
import { v4 as uuidv4 } from "uuid";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  parseISO,
  format,
} from "date-fns";
import {
  RecurringTransactionInputSchema,
  RecurringTransactionUpdateSchema,
  validate,
} from "../lib/validation";

export function useRecurringTransactions(groupId?: string | null) {
  const recurringTransactions = useLiveQuery(() =>
    db.recurring_transactions.toArray()
  );

  // Filter out deleted items and optionally by group
  const activeRecurring =
    recurringTransactions?.filter((r) => {
      if (r.deleted_at) return false;

      if (groupId === undefined) {
        // Return all recurring transactions (no group filter)
        return true;
      } else if (groupId === null) {
        // Return only personal recurring transactions
        return !r.group_id;
      } else {
        // Return only recurring transactions for specific group
        return r.group_id === groupId;
      }
    }) || [];

  const addRecurringTransaction = async (
    transaction: Omit<
      RecurringTransaction,
      | "id"
      | "sync_token"
      | "pendingSync"
      | "deleted_at"
      | "active"
      | "last_generated"
    >
  ) => {
    // Validate input data
    const validatedData = validate(RecurringTransactionInputSchema, {
      ...transaction,
      active: 1,
    });

    const id = uuidv4();
    await db.recurring_transactions.add({
      ...validatedData,
      id,
      pendingSync: 1,
      deleted_at: null,
      last_generated: undefined,
    });
    syncManager.schedulePush();
  };

  const updateRecurringTransaction = async (
    id: string,
    updates: Partial<
      Omit<RecurringTransaction, "id" | "sync_token" | "pendingSync">
    >
  ) => {
    // Validate update data
    const validatedUpdates = validate(
      RecurringTransactionUpdateSchema,
      updates
    );

    await db.recurring_transactions.update(id, {
      ...validatedUpdates,
      pendingSync: 1,
    });
    syncManager.schedulePush();
  };

  const deleteRecurringTransaction = async (id: string) => {
    await db.recurring_transactions.update(id, {
      deleted_at: new Date().toISOString(),
      pendingSync: 1,
    });
    syncManager.schedulePush();
  };

  const generateTransactions = async () => {
    const all = await db.recurring_transactions.toArray();
    const active = all.filter((rt) => !rt.deleted_at);
    const now = new Date();
    let changesMade = false;

    for (const rt of active) {
      if (!rt.active || rt.deleted_at) continue;

      let nextDate = rt.last_generated
        ? parseISO(rt.last_generated)
        : parseISO(rt.start_date);

      // If never generated, start from start_date. If generated, calculate next.
      if (rt.last_generated) {
        switch (rt.frequency) {
          case "daily":
            nextDate = addDays(nextDate, 1);
            break;
          case "weekly":
            nextDate = addWeeks(nextDate, 1);
            break;
          case "monthly":
            nextDate = addMonths(nextDate, 1);
            break;
          case "yearly":
            nextDate = addYears(nextDate, 1);
            break;
        }
      }

      // Generate all missed transactions up to today
      while (
        isBefore(nextDate, now) ||
        nextDate.toDateString() === now.toDateString()
      ) {
        // Check end_date
        if (rt.end_date && isBefore(parseISO(rt.end_date), nextDate)) break;

        // Create transaction
        const transactionId = uuidv4();
        // Use format to get local date string YYYY-MM-DD
        const dateStr = format(nextDate, "yyyy-MM-dd");

        await db.transactions.add({
          id: transactionId,
          user_id: rt.user_id,
          group_id: rt.group_id || null,
          paid_by_user_id: rt.paid_by_user_id || null,
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

        // Update last_generated with the date string we just generated for
        await db.recurring_transactions.update(rt.id, {
          last_generated: dateStr,
          pendingSync: 1,
        });

        changesMade = true;

        // Calculate next date for loop
        switch (rt.frequency) {
          case "daily":
            nextDate = addDays(nextDate, 1);
            break;
          case "weekly":
            nextDate = addWeeks(nextDate, 1);
            break;
          case "monthly":
            nextDate = addMonths(nextDate, 1);
            break;
          case "yearly":
            nextDate = addYears(nextDate, 1);
            break;
        }
      }
    }

    if (changesMade) {
      syncManager.schedulePush();
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
