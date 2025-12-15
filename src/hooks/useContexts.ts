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
    >
  ) => {
    // Validate input data (schema expects boolean for active)
    const validatedData = validate(getContextInputSchema(t), {
      ...context,
      active: true,
    });

    const { active, ...rest } = validatedData;

    const id = uuidv4();
    await db.contexts.add({
      ...rest,
      description: rest.description === null ? undefined : rest.description,
      active: active ? 1 : 0,
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
    const validatedUpdates = validate(getContextUpdateSchema(t), updates);

    // Convert active boolean to number safely
    const { active, description, ...rest } = validatedUpdates;
    const finalUpdates: any = { ...rest };
    if (active !== undefined) {
      finalUpdates.active = active ? 1 : 0;
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
