import { useTranslation } from "react-i18next";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnlineSync } from "@/hooks/useOnlineSync";

/**
 * Non-invasive banner showing offline status.
 * Displays at the bottom of the screen when offline,
 * with sync status when back online.
 */
export function OfflineIndicator() {
  const { t } = useTranslation();
  const { isOnline } = useOnlineSync();

  // Only show when offline
  if (isOnline) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-all duration-300",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        isOnline
          ? "bg-primary text-primary-foreground"
          : "bg-destructive text-destructive-foreground"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" aria-hidden="true" />
        <span>{t("offline_banner_message")}</span>
      </div>
    </div>
  );
}
