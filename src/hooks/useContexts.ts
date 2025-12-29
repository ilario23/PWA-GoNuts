import { useLiveQuery } from "dexie-react-hooks";
import { db, Context } from "../lib/db";
import { syncManager } from "../lib/sync";
import { v4 as uuidv4 } from "uuid";
import {
  getContextInputSchema,
  getContextUpdateSchema,
  validate,
} from "../lib/validation";
import { useTranslation } from "react-i18next";

/**
 * Hook for managing transaction contexts (e.g., "Work", "Personal", "Vacation").
 *
 * Contexts provide an additional dimension for categorizing transactions
 * beyond the category hierarchy. Useful for tracking spending by project,
 * trip, or life area.
 *
 * @returns Object containing:
 *   - `contexts`: Array of active (non-deleted) contexts
 *   - `addContext`: Create a new context
 *   - `updateContext`: Update an existing context
 *   - `deleteContext`: Soft-delete a context
 *
 * @example
 * ```tsx
 * const { contexts, addContext } = useContexts();
 *
 * // Create a new context
 * await addContext({
 *   user_id: 'user-123',
 *   name: 'Summer Vacation 2024'
 * });
 * ```
 */
export function useContexts() {
  const { t } = useTranslation();
  const contexts = useLiveQuery(() => db.contexts.toArray());

  const activeContexts = contexts?.filter((c) => !c.deleted_at) || [];

  const addContext = async (
    context: Omit<
      Context,
      "id" | "sync_token" | "pendingSync" | "deleted_at" | "active"
    > & { active?: boolean }
  ) => {
    // Validate input data (schema expects boolean for active)
    const validatedData = validate(getContextInputSchema(t), {
      ...context,
      active: context.active !== undefined ? (context.active ? 1 : 0) : 1, // Validation schema expects number? Let's check validation.ts
    });

    const { active, ...rest } = validatedData;

    const id = uuidv4();
    await db.contexts.add({
      ...rest,
      description: rest.description === null ? undefined : rest.description,
      active: active, // Schema active is number, validatedData.active is number
      id,
      pendingSync: 1,
      deleted_at: null,
    });
    syncManager.schedulePush();
  };

  const updateContext = async (
    id: string,
    updates: Partial<Omit<Context, "id" | "sync_token" | "pendingSync" | "active">> & { active?: boolean | number }
  ) => {
    // Prepare updates for validation (which expects number for active)
    const updatesForValidation = { ...updates };
    if (typeof updates.active === 'boolean') {
      updatesForValidation.active = updates.active ? 1 : 0;
    }

    // Validate update data
    const validatedUpdates = validate(getContextUpdateSchema(t), updatesForValidation);

    // Convert active boolean to number safely (if validation passed through boolean? no schema enforces number)
    const { active, description, ...rest } = validatedUpdates;
    const finalUpdates: Partial<Context> = { ...rest };
    if (active !== undefined) {
      finalUpdates.active = active; // validatedData active is already number from schema
    }
    if (description !== undefined) {
      finalUpdates.description = description === null ? undefined : description;
    }

    await db.contexts.update(id, {
      ...finalUpdates,
      pendingSync: 1,
    });
    syncManager.schedulePush();
  };

  const deleteContext = async (id: string) => {
    // Transactional update: Detach from transactions AND soft delete context
    await db.transaction('rw', db.transactions, db.contexts, async () => {
      // 1. Detach from transactions (set context_id to null and mark for sync)
      await db.transactions
        .where("context_id")
        .equals(id)
        .modify({ context_id: null as unknown as string, pendingSync: 1 });

      // 2. Soft delete context
      await db.contexts.update(id, {
        deleted_at: new Date().toISOString(),
        pendingSync: 1,
      });
    });
    syncManager.schedulePush();
  };

  return {
    contexts: activeContexts,
    addContext,
    updateContext,
    deleteContext,
  };
}
