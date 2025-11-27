import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { handleError } from "@/lib/error-handler";
import { TIMING } from "@/lib/constants";

interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => Promise<void>;
  close: () => void;
}

export function usePWAUpdate(): PWAUpdateState {
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);

  const {
    needRefresh: [needRefreshSW, setNeedRefreshSW],
    offlineReady: [offlineReadySW, setOfflineReadySW],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log("[PWA] Service Worker registered:", swUrl);

      // Check for updates periodically (every hour)
      if (registration) {
        setInterval(() => {
          console.log("[PWA] Checking for updates...");
          registration.update();
        }, TIMING.PWA_UPDATE_CHECK_INTERVAL);
      }
    },
    onRegisterError(error) {
      handleError(
        error,
        "warning",
        {
          source: "usePWAUpdate",
          operation: "register",
        },
        { showToast: false }
      );
    },
  });

  useEffect(() => {
    setOfflineReady(offlineReadySW);
  }, [offlineReadySW]);

  useEffect(() => {
    setNeedRefresh(needRefreshSW);
  }, [needRefreshSW]);

  const close = () => {
    setOfflineReadySW(false);
    setNeedRefreshSW(false);
  };

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: () => updateServiceWorker(true),
    close,
  };
}
