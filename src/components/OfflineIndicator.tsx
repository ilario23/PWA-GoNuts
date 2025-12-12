import { useOnlineSync } from "@/hooks/useOnlineSync";

/**
 * Headless component to handle online/offline notifications.
 * Previously displayed a triangle indicator, now only ensures the sync hook is active.
 */
export function OfflineIndicator() {
  // Keep the hook active to trigger global event listeners (toasts)
  useOnlineSync();

  return null;
}
