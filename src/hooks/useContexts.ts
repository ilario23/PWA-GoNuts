import { useLiveQuery } from 'dexie-react-hooks';
import { db, Context } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

export function useContexts() {
    const contexts = useLiveQuery(() =>
        db.contexts.toArray()
    );

    const activeContexts = contexts?.filter(c => !c.deleted_at) || [];

    const addContext = async (context: Omit<Context, 'id' | 'sync_token' | 'pendingSync' | 'deleted_at' | 'active'>) => {
        const id = uuidv4();
        await db.contexts.add({
            ...context,
            id,
            active: 1,
            pendingSync: 1,
            deleted_at: null,
        });
    };

    const updateContext = async (id: string, updates: Partial<Omit<Context, 'id' | 'sync_token' | 'pendingSync'>>) => {
        await db.contexts.update(id, {
            ...updates,
            pendingSync: 1,
        });
    };

    const deleteContext = async (id: string) => {
        await db.contexts.update(id, {
            deleted_at: new Date().toISOString(),
            pendingSync: 1,
        });
    };

    return {
        contexts: activeContexts,
        addContext,
        updateContext,
        deleteContext,
    };
}
