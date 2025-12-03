import { useState, useEffect } from "react";
import { syncManager } from "../lib/sync";
import { toast } from "sonner";
import i18n from "@/i18n";

// Singleton to ensure only one instance shows toasts and triggers sync
let globalHandlersRegistered = false;
const onlineListeners: Set<(isOnline: boolean) => void> = new Set();

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
    // Toast removed as per user request
    // toast.success(i18n.t("back_online"), {
    //   description: i18n.t("back_online_description"),
    //   duration: 3000,
    // });

    // ✅ Sync completo (push + pull) per recuperare modifiche perse offline
    console.log("[OnlineSync] Back online, syncing...");
    await syncManager.sync();
  };

  const handleOffline = () => {
    // Notify all listeners
    onlineListeners.forEach((cb) => cb(false));

    // Show toast only once (globally) - small toast at top
    toast.warning(i18n.t("gone_offline"), {
      description: i18n.t("gone_offline_description"),
      duration: 3000,
      position: "top-center",
    });

    console.log("[OnlineSync] Gone offline");
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
}

/**
 * Hook for managing online/offline state.
 *
 * Uses a singleton pattern to ensure:
 * - Toast notifications are shown only once (not per component)
 * - Push is triggered only once when coming back online
 * - All components using this hook stay in sync
 *
 * @returns Object containing:
 *   - `isOnline`: Whether the browser is currently online
 */
export function useOnlineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Register global handlers (only happens once across all instances)
    ensureGlobalHandlers();

    // Subscribe this component to state changes
    const onlineCallback = (online: boolean) => setIsOnline(online);
    onlineListeners.add(onlineCallback);

    return () => {
      onlineListeners.delete(onlineCallback);
    };
  }, []);

  return { isOnline };
}
