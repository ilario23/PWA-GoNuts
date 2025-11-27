import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

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
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error("[PWA] Service Worker registration error:", error);
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
