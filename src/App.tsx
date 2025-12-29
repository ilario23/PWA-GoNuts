import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Suspense, lazy } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthPage } from "@/pages/AuthPage";
import { AuthProvider, useAuth } from "@/contexts/AuthProvider";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import { useSync } from "@/hooks/useSync";
import { useAutoGenerate } from "@/hooks/useAutoGenerate";
import { useBudgetNotifications } from "@/hooks/useBudgetNotifications";
import { Toaster } from "@/components/ui/sonner";
import { PWAUpdateNotification } from "@/components/PWAUpdateNotification";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ContentLoader } from "@/components/ui/content-loader";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { WifiOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WelcomeWizard } from "@/components/welcome/WelcomeWizard";
import { useWelcomeWizard } from "@/hooks/useWelcomeWizard";
import { IOSViewportFix } from "@/components/IOSViewportFix";

// Lazy-loaded pages for better initial bundle size
const Dashboard = lazy(() =>
  import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard }))
);
const TransactionsPage = lazy(() =>
  import("@/pages/Transactions").then((m) => ({ default: m.TransactionsPage }))
);
const RecurringTransactionsPage = lazy(() =>
  import("@/pages/RecurringTransactions").then((m) => ({
    default: m.RecurringTransactionsPage,
  }))
);
const CategoriesPage = lazy(() =>
  import("@/pages/Categories").then((m) => ({ default: m.CategoriesPage }))
);
const ContextsPage = lazy(() =>
  import("@/pages/Contexts").then((m) => ({ default: m.ContextsPage }))
);
const GroupsPage = lazy(() =>
  import("@/pages/Groups").then((m) => ({ default: m.GroupsPage }))
);
const GroupDetailPage = lazy(() =>
  import("@/pages/GroupDetail").then((m) => ({ default: m.GroupDetailPage }))
);
const StatisticsPage = lazy(() =>
  import("@/pages/Statistics").then((m) => ({ default: m.StatisticsPage }))
);
const SettingsPage = lazy(() =>
  import("@/pages/Settings").then((m) => ({ default: m.SettingsPage }))
);
const ProfilePage = lazy(() =>
  import("@/pages/Profile").then((m) => ({ default: m.ProfilePage }))
);

/**
 * Loading fallback for lazy-loaded pages
 */
function PageLoadingFallback() {
  return (
    <div className="p-6">
      <ContentLoader variant="card" count={2} />
    </div>
  );
}

/**
 * App-level loading state with offline awareness
 */
function AppLoadingState() {
  const { t } = useTranslation();
  const isOffline = !navigator.onLine;

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-4">
      {isOffline ? (
        <>
          <WifiOff className="h-12 w-12 text-muted-foreground animate-pulse" />
          <p className="text-lg font-medium text-muted-foreground">
            {t("loading_offline") || "Loading offline data..."}
          </p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {t("loading_offline_description") ||
              "You're offline. Loading your locally stored data."}
          </p>
        </>
      ) : (
        <>
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-lg font-medium text-muted-foreground">
            {t("loading") || "Loading..."}
          </p>
        </>
      )}
    </div>
  );
}

import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { syncManager } from "@/lib/sync";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isOffline } = useAuth();
  useOnlineSync(); // Auto-sync when coming online
  const { initialSyncComplete } = useSync(); // Read sync status
  useRealtimeSync(initialSyncComplete); // Subscribe to realtime changes only after initial sync
  useAutoGenerate(); // Generate recurring transactions on app load
  useBudgetNotifications(); // Monitor budget and show warnings

  // Welcome wizard state
  const welcomeWizard = useWelcomeWizard();

  // Handle initial sync and visibility changes
  useEffect(() => {
    // Initial sync
    const timer = setTimeout(() => {
      console.log("[App] Starting initial sync...");
      syncManager.sync();
    }, 1000);

    // Visibility listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        console.log("[App] App hidden, pushing pending changes...");
        syncManager.pushOnly();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return <AppLoadingState />;
  }

  // If offline and no cached user, show a friendly message
  if (!user && isOffline) {
    return <OfflineAuthFallback />;
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return (
    <>
      {children}
      <WelcomeWizard
        open={welcomeWizard.shouldShow}
        onComplete={welcomeWizard.complete}
        onSkip={welcomeWizard.skip}
      />
    </>
  );
}

/**
 * Fallback UI when offline with no cached session
 */
function OfflineAuthFallback() {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <WifiOff className="h-16 w-16 text-muted-foreground" />
      <h2 className="text-xl font-semibold">
        {t("offline_no_session_title") || "You're Offline"}
      </h2>
      <p className="text-muted-foreground max-w-md">
        {t("offline_no_session_description") ||
          "Please connect to the internet to sign in. Once signed in, you can use the app offline."}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("offline_no_session_hint") ||
          "The app will automatically reconnect when you're back online."}
      </p>
    </div>
  );
}

import { useSettings } from "@/hooks/useSettings";
import { useEffect } from "react";

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings?.theme) {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");

      if (settings.theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
        root.classList.add(systemTheme);
      } else {
        root.classList.add(settings.theme);
      }
    }
  }, [settings?.theme]);

  // Separate effect for favicon that ONLY listens to system theme
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateFavicon = () => {
      const isSystemDark = mediaQuery.matches;
      // Always use system theme for favicon, regardless of app theme
      const iconPath = isSystemDark ? "/vite-dark.svg" : "/vite.svg";

      const existingFavicons = document.querySelectorAll("link[rel='icon']");
      existingFavicons.forEach((link) => link.remove());

      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = iconPath;
      document.head.appendChild(link);
    };

    updateFavicon(); // Initial call

    mediaQuery.addEventListener("change", updateFavicon);
    return () => mediaQuery.removeEventListener("change", updateFavicon);
  }, []);


  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <ErrorBoundary section="Dashboard" minimal>
              <Suspense fallback={<PageLoadingFallback />}>
                <PageTransition>
                  <Dashboard />
                </PageTransition>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/transactions"
          element={
            <ErrorBoundary section="Transazioni" minimal>
              <Suspense fallback={<PageLoadingFallback />}>
                <PageTransition>
                  <TransactionsPage />
                </PageTransition>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/recurring"
          element={
            <ErrorBoundary section="Transazioni Ricorrenti" minimal>
              <Suspense fallback={<PageLoadingFallback />}>
                <PageTransition>
                  <RecurringTransactionsPage />
                </PageTransition>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/categories"
          element={
            <ErrorBoundary section="Categorie" minimal>
              <Suspense fallback={<PageLoadingFallback />}>
                <PageTransition>
                  <CategoriesPage />
                </PageTransition>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/contexts"
          element={
            <ErrorBoundary section="Contesti" minimal>
              <Suspense fallback={<PageLoadingFallback />}>
                <PageTransition>
                  <ContextsPage />
                </PageTransition>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/groups"
          element={
            <ErrorBoundary section="Gruppi" minimal>
              <Suspense fallback={<PageLoadingFallback />}>
                <PageTransition>
                  <GroupsPage />
                </PageTransition>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/groups/:groupId"
          element={
            <ErrorBoundary section="Dettaglio Gruppo" minimal>
              <Suspense fallback={<PageLoadingFallback />}>
                <PageTransition>
                  <GroupDetailPage />
                </PageTransition>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/statistics"
          element={
            <ErrorBoundary section="Statistiche" minimal>
              <Suspense fallback={<PageLoadingFallback />}>
                <PageTransition>
                  <StatisticsPage />
                </PageTransition>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/settings"
          element={
            <ErrorBoundary section="Impostazioni" minimal>
              <Suspense fallback={<PageLoadingFallback />}>
                <PageTransition>
                  <SettingsPage />
                </PageTransition>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route
          path="/profile"
          element={
            <ErrorBoundary section="Profilo" minimal>
              <Suspense fallback={<PageLoadingFallback />}>
                <PageTransition>
                  <ProfilePage />
                </PageTransition>
              </Suspense>
            </ErrorBoundary>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary section="App">
      <Router>
        <AuthProvider>
          <ThemeProvider>
            <Toaster />
            <PWAUpdateNotification />
            <PWAInstallPrompt />
            <OfflineIndicator />
            <IOSViewportFix />
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppShell>
                      <AppRoutes />
                    </AppShell>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </ThemeProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
