import { useState, useEffect } from 'react';
import { syncManager } from '../lib/sync';

export function useOnlineSync() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            console.log('Back online, syncing...');
            setIsSyncing(true);
            await syncManager.sync();
            setIsSyncing(false);
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


