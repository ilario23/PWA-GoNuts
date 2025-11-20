import { useLiveQuery } from 'dexie-react-hooks';
import { db, Category } from '../lib/db';
import { v4 as uuidv4 } from 'uuid';

export function useCategories() {
    const categories = useLiveQuery(() =>
        db.categories.toArray()
    );

    // Filter out deleted items in JS if Dexie query is tricky with null
    const activeCategories = categories?.filter(c => !c.deleted_at) || [];

    const addCategory = async (category: Omit<Category, 'id' | 'sync_token' | 'pendingSync' | 'deleted_at' | 'active'>) => {
        const id = uuidv4();
        await db.categories.add({
            ...category,
            id,
            active: 1,
            pendingSync: 1,
            deleted_at: null,
        });
    };

    const updateCategory = async (id: string, updates: Partial<Omit<Category, 'id' | 'sync_token' | 'pendingSync'>>) => {
        await db.categories.update(id, {
            ...updates,
            pendingSync: 1,
        });
    };

    const deleteCategory = async (id: string) => {
        await db.categories.update(id, {
            deleted_at: new Date().toISOString(),
            pendingSync: 1,
        });
    };

    return {
        categories: activeCategories,
        addCategory,
        updateCategory,
        deleteCategory,
    };
}
