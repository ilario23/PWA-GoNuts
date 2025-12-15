import { useLiveQuery } from "dexie-react-hooks";
import { db, Category } from "../lib/db";
import { syncManager } from "../lib/sync";
import { v4 as uuidv4 } from "uuid";
import {
  getCategoryInputSchema,
  getCategoryUpdateSchema,
  validate,
} from "../lib/validation";
import { useTranslation } from "react-i18next";
import { UNCATEGORIZED_CATEGORY } from "../lib/constants";

/**
 * Hook for managing expense/income categories with hierarchical support.
 *
 * Categories support parent-child relationships for nested organization.
 * All operations are validated with Zod and trigger sync with the server.
 *
 * @param groupId - Filter categories by group:
 *   - `undefined`: Return all categories (no filter)
 *   - `null`: Return only personal categories (no group_id)
 *   - `string`: Return categories for specific group + personal categories
 *
 * @returns Object containing:
 *   - `categories`: Filtered array of active categories
 *   - `addCategory`: Create a new category
 *   - `updateCategory`: Update an existing category
 *   - `deleteCategory`: Soft-delete a category
 *   - `reparentChildren`: Move child categories to a new parent
 *
 * @example
 * ```tsx
 * const { categories, addCategory } = useCategories();
 *
 * // Create a new category
 * await addCategory({
 *   user_id: 'user-123',
 *   name: 'Groceries',
 *   type: 'expense',
 *   color: '#22c55e',
 *   icon: 'shopping-cart'
 * });
 * ```
 */
export function useCategories(groupId?: string | null) {
  const { t } = useTranslation();
  const categories = useLiveQuery(() => db.categories.toArray());

  // Filter out deleted items, the local-only placeholder, and optionally by group
  const filteredCategories =
    categories?.filter((c) => {
      if (c.deleted_at) return false;

      // Exclude local-only "Uncategorized" placeholder category
      if (c.id === UNCATEGORIZED_CATEGORY.ID) return false;

      if (groupId === undefined) {
        // Return all categories (no group_id filter)
        return true;
      } else if (groupId === null) {
        // Return only personal categories
        return !c.group_id;
      } else {
        // Return only categories for specific group (no personal)
        return c.group_id === groupId;
      }
    }) || [];

  const addCategory = async (
    category: Omit<Category, "id" | "sync_token" | "pendingSync" | "deleted_at">
  ) => {
    // Validate input data
    const validatedData = validate(getCategoryInputSchema(t), {
      ...category,
      active: category.active ?? 1,
    });

    const id = uuidv4();
    await db.categories.add({
      ...validatedData,
      id,
      pendingSync: 1,
      deleted_at: null,
    });
    syncManager.schedulePush();
  };

  const updateCategory = async (
    id: string,
    updates: Partial<Omit<Category, "id" | "sync_token" | "pendingSync">>
  ) => {
    // Validate update data
    const validatedUpdates = validate(getCategoryUpdateSchema(t), updates);

    await db.categories.update(id, {
      ...validatedUpdates,
      pendingSync: 1,
    });
    syncManager.schedulePush();
  };

  const deleteCategory = async (id: string) => {
    await db.categories.update(id, {
      deleted_at: new Date().toISOString(),
      pendingSync: 1,
    });
    syncManager.schedulePush();
  };

  const reparentChildren = async (
    oldParentId: string,
    newParentId: string | undefined
  ) => {
    // Find all children of the old parent
    // Since parent_id is not indexed, we use filter
    await db.categories
      .filter((c) => c.parent_id === oldParentId)
      .modify({
        parent_id: newParentId,
        pendingSync: 1,
      });
    syncManager.schedulePush();
  };

  const migrateTransactions = async (
    oldCategoryId: string,
    newCategoryId: string
  ) => {
    // Find all transactions with the old category
    await db.transactions.where("category_id").equals(oldCategoryId).modify({
      category_id: newCategoryId,
      pendingSync: 1,
    });

    // Also migrate recurring transactions
    await db.recurring_transactions
      .where("category_id")
      .equals(oldCategoryId)
      .modify({
        category_id: newCategoryId,
        pendingSync: 1,
      });

    syncManager.schedulePush();
  };

  return {
    categories: filteredCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    reparentChildren,
    migrateTransactions,
  };
}
