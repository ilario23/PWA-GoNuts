import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Setting } from '../lib/db';
import { useAuth } from './useAuth';

export function useSettings() {
    const { user } = useAuth();

    const settings = useLiveQuery(
        () => (user ? db.user_settings.get(user.id) : undefined),
        [user]
    );

    React.useEffect(() => {
        if (user && settings === undefined) {
            db.user_settings.get(user.id).then((existing) => {
                if (!existing) {
                    db.user_settings.add({
                        user_id: user.id,
                        currency: 'EUR',
                        language: 'en',
                        theme: 'light',
                        start_of_week: 'monday',
                        default_view: 'list',
                        include_investments_in_expense_totals: false,
                        updated_at: new Date().toISOString(),
                    });
                }
            });
        }
    }, [user, settings]);

    const updateSettings = async (updates: Partial<Setting>) => {
        if (!user) return;

        const current = await db.user_settings.get(user.id);
        if (current) {
            await db.user_settings.update(user.id, {
                ...updates,
                updated_at: new Date().toISOString(),
            });
        } else {
            await db.user_settings.add({
                user_id: user.id,
                currency: 'EUR',
                language: 'en',
                theme: 'light',
                start_of_week: 'monday',
                default_view: 'list',
                include_investments_in_expense_totals: false,
                ...updates,
                updated_at: new Date().toISOString(),
            } as Setting);
        }
    };

    return {
        settings,
        updateSettings,
    };
}
