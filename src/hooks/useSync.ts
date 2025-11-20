import { useState, useEffect } from 'react';
import { syncManager } from '../lib/sync';

export function useSync() {
    const [isSyncing, setIsSyncing] = useState(false);

    const sync = async () => {
        setIsSyncing(true);
        await syncManager.sync();
        setIsSyncing(false);
    };

    // Auto sync on mount (or use a more sophisticated interval/event listener)
    useEffect(() => {
        sync();

        // Optional: Sync every 5 minutes
        const interval = setInterval(sync, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return { isSyncing, sync };
}
