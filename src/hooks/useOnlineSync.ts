import { useState, useEffect } from "react";
import { syncManager } from "../lib/sync";
import { toast } from "sonner";
import i18n from "@/i18n";

// Singleton to ensure only one instance shows toasts and triggers sync
let globalHandlersRegistered = false;
let onlineListeners: Set<(isOnline: boolean) => void> = new Set();
let syncingListeners: Set<(isSyncing: boolean) => void> = new Set();

/**
 * Register global event handlers once (singleton pattern).
 * This ensures toasts are shown only once regardless of how many
 * components use the useOnlineSync hook.
 */
function ensureGlobalHandlers() {
  if (globalHandlersRegistered) return;
  globalHandlersRegistered = true;

  const handleOnline = async () => {
    // Notify all listeners
    onlineListeners.forEach((cb) => cb(true));

    // Show toast only once (globally)
    toast.success(i18n.t("back_online"), {
      description: i18n.t("back_online_description"),
      duration: 3000,
    });

    console.log("[OnlineSync] Back online, syncing...");
    syncingListeners.forEach((cb) => cb(true));
    await syncManager.sync();
    syncingListeners.forEach((cb) => cb(false));
  };

  const handleOffline = () => {
    // Notify all listeners
    onlineListeners.forEach((cb) => cb(false));

    // Show toast only once (globally)
    toast.warning(i18n.t("gone_offline"), {
      description: i18n.t("gone_offline_description"),
      duration: 5000,
    });

    console.log("[OnlineSync] Gone offline");
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
}

/**
 * Hook for managing online/offline state with automatic sync.
 *
 * Uses a singleton pattern to ensure:
 * - Toast notifications are shown only once (not per component)
 * - Sync is triggered only once when coming back online
 * - All components using this hook stay in sync
 *
 * @returns Object containing:
 *   - `isOnline`: Whether the browser is currently online
 *   - `isSyncing`: Whether a sync operation is in progress
 */
export function useOnlineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Register global handlers (only happens once across all instances)
    ensureGlobalHandlers();

    // Subscribe this component to state changes
    const onlineCallback = (online: boolean) => setIsOnline(online);
    const syncingCallback = (syncing: boolean) => setIsSyncing(syncing);

    onlineListeners.add(onlineCallback);
    syncingListeners.add(syncingCallback);

    return () => {
      onlineListeners.delete(onlineCallback);
      syncingListeners.delete(syncingCallback);
    };
  }, []);

  return { isOnline, isSyncing };
}
