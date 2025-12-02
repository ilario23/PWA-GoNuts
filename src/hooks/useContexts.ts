import { useLiveQuery } from "dexie-react-hooks";
import { db, Context } from "../lib/db";
import { syncManager } from "../lib/sync";
import { v4 as uuidv4 } from "uuid";
import {
  ContextInputSchema,
  ContextUpdateSchema,
  validate,
} from "../lib/validation";

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
  const contexts = useLiveQuery(() => db.contexts.toArray());

  const activeContexts = contexts?.filter((c) => !c.deleted_at) || [];

  const addContext = async (
    context: Omit<
      Context,
      "id" | "sync_token" | "pendingSync" | "deleted_at" | "active"
    >
  ) => {
    // Validate input data
    const validatedData = validate(ContextInputSchema, {
      ...context,
      active: 1,
    });

    const id = uuidv4();
    await db.contexts.add({
      ...validatedData,
      id,
      pendingSync: 1,
      deleted_at: null,
    });
    syncManager.schedulePush();
  };

  const updateContext = async (
    id: string,
    updates: Partial<Omit<Context, "id" | "sync_token" | "pendingSync">>
  ) => {
    // Validate update data
    const validatedUpdates = validate(ContextUpdateSchema, updates);

    await db.contexts.update(id, {
      ...validatedUpdates,
      pendingSync: 1,
    });
    syncManager.schedulePush();
  };

  const deleteContext = async (id: string) => {
    await db.contexts.update(id, {
      deleted_at: new Date().toISOString(),
      pendingSync: 1,
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
