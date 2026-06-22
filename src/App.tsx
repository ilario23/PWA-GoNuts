import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { Suspense, lazy, type ReactNode } from "react";
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
const GroupBalancePage = lazy(() =>
  import("@/pages/GroupBalance").then((m) => ({ default: m.GroupBalancePage }))
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
const RequestPasswordResetPage = lazy(() =>
  import("@/pages/RequestPasswordReset").then((m) => ({
    default: m.RequestPasswordResetPage,
  }))
);
const UpdatePasswordPage = lazy(() =>
  import("@/pages/UpdatePassword").then((m) => ({
    default: m.UpdatePasswordPage,
  }))
);
const ChangelogPage = lazy(() =>
  import("@/pages/Changelog").then((m) => ({ default: m.ChangelogPage }))
);
const MorePage = lazy(() =>
  import("@/pages/More").then((m) => ({ default: m.MorePage }))
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
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { useEffect } from "react";

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings?.theme) return;

    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      root.classList.remove("light", "dark");
      if (settings.theme === "system") {
        root.classList.add(mediaQuery.matches ? "dark" : "light");
      } else {
        root.classList.add(settings.theme);
      }
    };

    applyTheme();

    // When following the system, react to live OS theme changes (the user
    // flipping dark/light without reloading). Without this listener the class
    // is only computed once on mount, so "system" mode silently goes stale.
    if (settings.theme === "system") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
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

// PageTransition must wrap Suspense, not the other way around. If a lazy route
// chunk suspends *inside* the motion element, framer-motion's enter animation
// gets stranded at its initial keyframe (opacity 0) when the chunk resolves, and
// the page ships blank. With Suspense nested inside, the motion element mounts
// once and animates reliably while the fallback swaps to real content beneath it.
function AnimatedPage({
  section,
  children,
}: {
  section: string;
  children: ReactNode;
}) {
  return (
    <ErrorBoundary section={section} minimal>
      <PageTransition>
        <Suspense fallback={<PageLoadingFallback />}>{children}</Suspense>
      </PageTransition>
    </ErrorBoundary>
  );
}

function AppRoutes() {
  const location = useLocation();
  useVersionCheck();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedPage section="Dashboard"><Dashboard /></AnimatedPage>} />
        <Route path="/transactions" element={<AnimatedPage section="Transazioni"><TransactionsPage /></AnimatedPage>} />
        <Route path="/recurring" element={<AnimatedPage section="Transazioni Ricorrenti"><RecurringTransactionsPage /></AnimatedPage>} />
        <Route path="/categories" element={<AnimatedPage section="Categorie"><CategoriesPage /></AnimatedPage>} />
        <Route path="/contexts" element={<AnimatedPage section="Contesti"><ContextsPage /></AnimatedPage>} />
        <Route path="/groups" element={<AnimatedPage section="Gruppi"><GroupsPage /></AnimatedPage>} />
        <Route path="/groups/:groupId" element={<AnimatedPage section="Dettaglio Gruppo"><GroupDetailPage /></AnimatedPage>} />
        <Route path="/groups/:groupId/balance" element={<AnimatedPage section="Saldo Gruppo"><GroupBalancePage /></AnimatedPage>} />
        <Route path="/statistics" element={<AnimatedPage section="Statistiche"><StatisticsPage /></AnimatedPage>} />
        <Route path="/settings" element={<AnimatedPage section="Impostazioni"><SettingsPage /></AnimatedPage>} />
        <Route path="/profile" element={<AnimatedPage section="Profilo"><ProfilePage /></AnimatedPage>} />
        <Route path="/changelog" element={<AnimatedPage section="Changelog"><ChangelogPage /></AnimatedPage>} />
        <Route path="/more" element={<AnimatedPage section="More"><MorePage /></AnimatedPage>} />
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
            {/* Honor the OS "reduce motion" setting across every framer-motion
                animation in the app (framer does not do this automatically). */}
            <MotionConfig reducedMotion="user">
            <Toaster />
            <PWAUpdateNotification />
            <PWAInstallPrompt />
            <OfflineIndicator />
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/auth/reset-password"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <RequestPasswordResetPage />
                  </Suspense>
                }
              />
              <Route
                path="/update-password"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <UpdatePasswordPage />
                  </Suspense>
                }
              />
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
            </MotionConfig>
          </ThemeProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
