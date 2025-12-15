import { useLiveQuery } from "dexie-react-hooks";
import { db, RecurringTransaction } from "../lib/db";
import { syncManager } from "../lib/sync";
import { v4 as uuidv4 } from "uuid";

import {
  getRecurringTransactionInputSchema,
  getRecurringTransactionUpdateSchema,
  validate,
} from "../lib/validation";
import { processRecurringTransactions } from "../lib/recurring";
import { useTranslation } from "react-i18next";

export function useRecurringTransactions(groupId?: string | null) {
  const { t } = useTranslation();
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
    const validatedData = validate(getRecurringTransactionInputSchema(t), {
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
      getRecurringTransactionUpdateSchema(t),
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
    return await processRecurringTransactions();
  };

  return {
    recurringTransactions: activeRecurring,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    generateTransactions,
  };
}
