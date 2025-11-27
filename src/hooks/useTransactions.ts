import { useLiveQuery } from "dexie-react-hooks";
import { db, Transaction } from "../lib/db";
import { syncManager } from "../lib/sync";
import { v4 as uuidv4 } from "uuid";
import {
  TransactionInputSchema,
  TransactionUpdateSchema,
  validate,
  ValidationError,
} from "../lib/validation";

export function useTransactions(
  limit?: number,
  yearMonth?: string,
  groupId?: string | null
) {
  const transactions = useLiveQuery(() => {
    if (yearMonth) {
      // If yearMonth is just a year (e.g. "2024"), filter by date range
      if (yearMonth.length === 4) {
        return db.transactions
          .where("date")
          .between(`${yearMonth}-01-01`, `${yearMonth}-12-31\uffff`)
          .reverse()
          .sortBy("date");
      }

      return db.transactions
        .where("year_month")
        .equals(yearMonth)
        .reverse()
        .sortBy("date");
    }

    let collection = db.transactions.orderBy("date").reverse();
    if (limit) {
      return collection.limit(limit).toArray();
    }
    return collection.toArray();
  }, [limit, yearMonth]);

  // Filter by group if specified
  const filteredTransactions = useLiveQuery(async () => {
    if (!transactions) return undefined;

    if (groupId === undefined) {
      // Return all transactions (no group filter)
      return transactions;
    } else if (groupId === null) {
      // Return only personal transactions
      return transactions.filter((t) => !t.group_id);
    } else {
      // Return only transactions for specific group
      return transactions.filter((t) => t.group_id === groupId);
    }
  }, [transactions, groupId]);

  const addTransaction = async (
    transaction: Omit<
      Transaction,
      "id" | "sync_token" | "pendingSync" | "deleted_at"
    >
  ) => {
    // Validate input data
    const validatedData = validate(TransactionInputSchema, transaction);
    
    const id = uuidv4();
    await db.transactions.add({
      ...validatedData,
      id,
      pendingSync: 1,
      deleted_at: null,
    });
    syncManager.sync();
  };

  const updateTransaction = async (
    id: string,
    updates: Partial<Omit<Transaction, "id" | "sync_token" | "pendingSync">>
  ) => {
    // Validate update data (partial validation)
    const validatedUpdates = validate(TransactionUpdateSchema, updates);
    
    await db.transactions.update(id, {
      ...validatedUpdates,
      pendingSync: 1,
    });
    syncManager.sync();
  };

  const deleteTransaction = async (id: string) => {
    // Soft delete
    await db.transactions.update(id, {
      deleted_at: new Date().toISOString(),
      pendingSync: 1,
    });
  };

  return {
    transactions: groupId !== undefined ? filteredTransactions : transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
