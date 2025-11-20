import { db } from './db';
import { supabase } from './supabase';

const TABLES = ['transactions', 'categories', 'contexts', 'recurring_transactions'] as const;

export class SyncManager {
    private isSyncing = false;

    async sync() {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await this.pushPending(user.id);
            await this.pullDelta(user.id);
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    private async pushPending(userId: string) {
        for (const tableName of TABLES) {
            const table = db.table(tableName);
            const pendingItems = await table.where('pendingSync').equals(1).toArray();

            if (pendingItems.length === 0) continue;

            const itemsToPush = pendingItems.map(item => {
                const { pendingSync, year_month, ...rest } = item; // Remove local-only fields
                return { ...rest, user_id: userId, updated_at: new Date().toISOString() }; // Ensure user_id and updated_at
            });

            const { error } = await supabase.from(tableName).upsert(itemsToPush);

            if (error) {
                console.error(`Failed to push ${tableName}:`, error);
                continue;
            }

            // Mark as synced locally
            await db.transaction('rw', table, async () => {
                for (const item of pendingItems) {
                    await table.update(item.id, { pendingSync: 0 });
                }
            });
        }
    }

    private async pullDelta(_userId: string) {
        const userSettings = await db.user_settings.get(_userId);
        const lastSyncToken = userSettings?.last_sync_token || 0;
        let maxToken = lastSyncToken;

        for (const tableName of TABLES) {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .gt('sync_token', lastSyncToken);

            if (error) {
                console.error(`Failed to pull ${tableName}:`, error);
                continue;
            }

            if (!data || data.length === 0) continue;

            await db.transaction('rw', db.table(tableName), async () => {
                for (const item of data) {
                    // Calculate year_month for transactions if missing
                    let localItem = { ...item, pendingSync: 0 };
                    if (tableName === 'transactions' && item.date) {
                        localItem.year_month = item.date.substring(0, 7);
                    }

                    await db.table(tableName).put(localItem);
                    if (item.sync_token > maxToken) {
                        maxToken = item.sync_token;
                    }
                }
            });
        }

        if (maxToken > lastSyncToken) {
            if (userSettings) {
                await db.user_settings.update(_userId, { last_sync_token: maxToken });
            } else {
                // Create settings if not exist (should exist though)
                await db.user_settings.add({
                    user_id: _userId,
                    currency: 'EUR',
                    language: 'en',
                    theme: 'light',
                    start_of_week: 'monday',
                    default_view: 'list',
                    include_investments_in_expense_totals: false,
                    last_sync_token: maxToken,
                    updated_at: new Date().toISOString(),
                });
            }
        }
    }
}

export const syncManager = new SyncManager();
