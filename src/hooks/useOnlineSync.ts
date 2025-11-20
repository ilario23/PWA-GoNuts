import { useState, useEffect } from 'react';
import { syncManager } from '../lib/sync';
import { db } from '../lib/db';

export function useOnlineSync() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);

            // Check if there are pending items to sync
            const hasPending = await checkPendingSync();

            if (hasPending) {
                console.log('Coming online with pending changes, syncing...');
                setIsSyncing(true);
                await syncManager.sync();
                setIsSyncing(false);
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { isOnline, isSyncing };
}

async function checkPendingSync(): Promise<boolean> {
    const tables = ['transactions', 'categories', 'contexts', 'recurring_transactions'];

    for (const tableName of tables) {
        const pending = await db.table(tableName)
            .where('pendingSync')
            .equals(1)
            .count();

        if (pending > 0) {
            return true;
        }
    }

    return false;
}
