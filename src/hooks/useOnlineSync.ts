import { useState, useEffect, useRef } from 'react';
import { syncManager } from '../lib/sync';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * Hook for managing online/offline state with automatic sync.
 * 
 * Shows toast notifications when connectivity changes and
 * automatically triggers sync when coming back online.
 * 
 * @returns Object containing:
 *   - `isOnline`: Whether the browser is currently online
 *   - `isSyncing`: Whether a sync operation is in progress
 */
export function useOnlineSync() {
    const { t } = useTranslation();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    // Track if this is the first render to avoid toast on initial load
    const isFirstRender = useRef(true);

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            
            // Don't show toast on first render
            if (!isFirstRender.current) {
                toast.success(t('back_online'), {
                    description: t('back_online_description'),
                    duration: 3000,
                });
            }
            
            console.log('Back online, syncing...');
            setIsSyncing(true);
            await syncManager.sync();
            setIsSyncing(false);
        };

        const handleOffline = () => {
            setIsOnline(false);
            
            // Don't show toast on first render
            if (!isFirstRender.current) {
                toast.warning(t('gone_offline'), {
                    description: t('gone_offline_description'),
                    duration: 5000,
                });
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Mark first render complete after mount
        isFirstRender.current = false;

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [t]);

    return { isOnline, isSyncing };
}
