import { useState, useEffect, useCallback } from 'react';
import { syncManager, SyncStatus, SyncError } from '../lib/sync';
import { TIMING } from '../lib/constants';

export interface UseSyncResult {
  /** Whether a sync operation is currently in progress */
  isSyncing: boolean;
  /** ISO timestamp of last successful sync */
  lastSyncAt: string | null;
  /** Number of items pending sync */
  pendingCount: number;
  /** Number of sync errors */
  errorCount: number;
  /** List of sync errors */
  errors: SyncError[];
  /** Trigger a manual sync */
  sync: () => Promise<void>;
  /** Retry a specific failed item */
  retryError: (errorKey: string) => Promise<void>;
  /** Retry all failed items */
  retryAllErrors: () => Promise<void>;
}

export function useSync(): UseSyncResult {
  const [status, setStatus] = useState<SyncStatus>(() =>
    syncManager.getStatus()
  );

  const sync = useCallback(async () => {
    await syncManager.sync();
  }, []);

  const retryError = useCallback(async (errorKey: string) => {
    await syncManager.retryError(errorKey);
  }, []);

  const retryAllErrors = useCallback(async () => {
    await syncManager.retryAllErrors();
  }, []);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncManager.onSyncChange(setStatus);

    // Initial sync on mount
    sync();

    // Optional: Sync every 5 minutes
    const interval = setInterval(sync, TIMING.SYNC_INTERVAL);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [sync]);

  return {
    isSyncing: status.isSyncing,
    lastSyncAt: status.lastSyncAt,
    pendingCount: status.pendingCount,
    errorCount: status.errorCount,
    errors: status.errors,
    sync,
    retryError,
    retryAllErrors,
  };
}
