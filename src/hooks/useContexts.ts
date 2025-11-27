import { useLiveQuery } from 'dexie-react-hooks';
import { db, Context } from '../lib/db';
import { syncManager } from '../lib/sync';
import { v4 as uuidv4 } from 'uuid';
import {
  ContextInputSchema,
  ContextUpdateSchema,
  validate,
} from '../lib/validation';

export function useContexts() {
    const contexts = useLiveQuery(() =>
        db.contexts.toArray()
    );

    const activeContexts = contexts?.filter(c => !c.deleted_at) || [];

    const addContext = async (context: Omit<Context, 'id' | 'sync_token' | 'pendingSync' | 'deleted_at' | 'active'>) => {
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
        syncManager.sync();
    };

    const updateContext = async (id: string, updates: Partial<Omit<Context, 'id' | 'sync_token' | 'pendingSync'>>) => {
        // Validate update data
        const validatedUpdates = validate(ContextUpdateSchema, updates);
        
        await db.contexts.update(id, {
            ...validatedUpdates,
            pendingSync: 1,
        });
        syncManager.sync();
    };

    const deleteContext = async (id: string) => {
        await db.contexts.update(id, {
            deleted_at: new Date().toISOString(),
            pendingSync: 1,
        });
        syncManager.sync();
    };

    return {
        contexts: activeContexts,
        addContext,
        updateContext,
        deleteContext,
    };
}
