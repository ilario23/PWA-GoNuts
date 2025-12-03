import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Small persistent offline indicator icon.
 * Displays a red triangle warning icon in the top-right corner when offline.
 * On desktop: shows info on hover
 * On mobile: shows info on click
 */
export function OfflineIndicator() {
  const { t } = useTranslation();
  const { isOnline } = useOnlineSync();

  // Only show when offline
  if (isOnline) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="fixed top-4 right-4 z-50 flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 rounded-sm p-1"
          role="status"
          aria-live="polite"
          aria-label={t("offline_tooltip")}
        >
          <AlertTriangle
            className="h-6 w-6 text-destructive animate-pulse"
            aria-hidden="true"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <div>
            <p className="text-sm font-medium">{t("offline_tooltip")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("gone_offline_description")}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
