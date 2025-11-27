import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { usePWAUpdate } from "@/hooks/usePWAUpdate";
import { RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAUpdateNotification() {
  const { t } = useTranslation();
  const { needRefresh, offlineReady, updateServiceWorker, close } =
    usePWAUpdate();

  useEffect(() => {
    if (offlineReady) {
      toast.success(t("app_ready_offline") || "App ready for offline use", {
        icon: <Wifi className="h-4 w-4" />,
        duration: 4000,
      });
      close();
    }
  }, [offlineReady, close, t]);

  useEffect(() => {
    if (needRefresh) {
      toast(
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="font-medium">
              {t("update_available") || "Update available"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("update_available_description") ||
              "A new version is available. Reload to update."}
          </p>
          <div className="flex gap-2 mt-1">
            <Button
              size="sm"
              onClick={() => {
                updateServiceWorker();
              }}
              className="flex-1"
            >
              {t("reload") || "Reload"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                close();
                toast.dismiss();
              }}
              className="flex-1"
            >
              {t("later") || "Later"}
            </Button>
          </div>
        </div>,
        {
          duration: Infinity,
          id: "pwa-update",
          position: "bottom-center",
        }
      );
    }
  }, [needRefresh, updateServiceWorker, close, t]);

  return null;
}
