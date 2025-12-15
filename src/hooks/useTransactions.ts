import { useLiveQuery } from "dexie-react-hooks";
import { db, Transaction } from "../lib/db";
import { syncManager } from "../lib/sync";
import { v4 as uuidv4 } from "uuid";
import {
  getTransactionInputSchema,
  getTransactionUpdateSchema,
  validate,
} from "../lib/validation";
import { useTranslation } from "react-i18next";

/**
 * Hook for managing transactions with optional filtering.
 *
 * @param limit - Maximum number of transactions to return (optional)
 * @param yearMonth - Filter by year-month "YYYY-MM" or year "YYYY" (optional)
 * @param groupId - Filter by group: undefined = all, null = personal only, string = specific group
 */
export function useTransactions(
  limit?: number,
  yearMonth?: string,
  groupId?: string | null
) {
  const { t } = useTranslation();

  // Single unified query that handles all filtering in one operation
  const transactions = useLiveQuery(async () => {
    let collection: any;

    if (yearMonth) {
      // 1. Filter by Year/Month (Most selective)
      if (yearMonth.length === 4) {
        collection = db.transactions
          .where("date")
          .between(`${yearMonth}-01-01`, `${yearMonth}-12-31\uffff`);
      } else {
        collection = db.transactions.where("year_month").equals(yearMonth);
      }
    } else if (groupId && typeof groupId === "string") {
      // 2. Filter by Group ID (if no date filter) - Uses Index!
      collection = db.transactions.where("group_id").equals(groupId);
    } else {
      // 3. No filters or Personal only (fallback to date sort)
      collection = db.transactions.orderBy("date");
    }

    // Apply remaining filters
    let results: Transaction[] = await collection.reverse().toArray();

    // Apply group filter if not already applied via index
    // (e.g. if we queried by yearMonth, or if we want personal only)
    if (groupId !== undefined) {
      if (groupId === null) {
        // Return only personal transactions
        results = results.filter((tOrG) => !tOrG.group_id);
      } else if (yearMonth) {
        // If we queried by yearMonth, we still need to filter by group
        results = results.filter((tOrG) => tOrG.group_id === groupId);
      }
    }

    // Apply limit if needed (and not already applied effectively)
    if (limit && results.length > limit) {
      results = results.slice(0, limit);
    }

    // Sort by date descending (most recent first)
    // We sort here because some query paths don't guarantee order
    results.sort((a: Transaction, b: Transaction) =>
      b.date.localeCompare(a.date)
    );

    return results;
  }, [limit, yearMonth, groupId]);

  const addTransaction = async (
    transaction: Omit<
      Transaction,
      "id" | "sync_token" | "pendingSync" | "deleted_at"
    >
  ) => {
    // Validate input data
    const validatedData = validate(getTransactionInputSchema(t), transaction);

    const id = uuidv4();
    await db.transactions.add({
      ...validatedData,
      id,
      pendingSync: 1,
      deleted_at: null,
    });
    syncManager.schedulePush();
  };

  const updateTransaction = async (
    id: string,
    updates: Partial<Omit<Transaction, "id" | "sync_token" | "pendingSync">>
  ) => {
    // Validate update data (partial validation)
    const validatedUpdates = validate(getTransactionUpdateSchema(t), updates);

    await db.transactions.update(id, {
      ...validatedUpdates,
      pendingSync: 1,
    });
    syncManager.schedulePush();
  };

  const deleteTransaction = async (id: string) => {
    // Soft delete
    await db.transactions.update(id, {
      deleted_at: new Date().toISOString(),
      pendingSync: 1,
    });
    syncManager.schedulePush();
  };

  return {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
