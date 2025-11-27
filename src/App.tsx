import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthPage } from "@/pages/AuthPage";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import { useAutoGenerate } from "@/hooks/useAutoGenerate";
import { useBudgetNotifications } from "@/hooks/useBudgetNotifications";
import { Toaster } from "@/components/ui/sonner";
import { PWAUpdateNotification } from "@/components/PWAUpdateNotification";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { OfflineIndicator } from "@/components/OfflineIndicator";

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

/**
 * Loading fallback for lazy-loaded pages
 */
function PageLoadingFallback() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  useOnlineSync(); // Auto-sync when coming online
  useAutoGenerate(); // Generate recurring transactions on app load
  useBudgetNotifications(); // Monitor budget and show warnings

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return <>{children}</>;
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

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary section="App">
      <Router>
        <ThemeProvider>
          <Toaster />
          <PWAUpdateNotification />
          <OfflineIndicator />
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Routes>
                      <Route
                        path="/"
                        element={
                          <ErrorBoundary section="Dashboard" minimal>
                            <Suspense fallback={<PageLoadingFallback />}>
                              <Dashboard />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/transactions"
                        element={
                          <ErrorBoundary section="Transazioni" minimal>
                            <Suspense fallback={<PageLoadingFallback />}>
                              <TransactionsPage />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/recurring"
                        element={
                          <ErrorBoundary
                            section="Transazioni Ricorrenti"
                            minimal
                          >
                            <Suspense fallback={<PageLoadingFallback />}>
                              <RecurringTransactionsPage />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/categories"
                        element={
                          <ErrorBoundary section="Categorie" minimal>
                            <Suspense fallback={<PageLoadingFallback />}>
                              <CategoriesPage />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/contexts"
                        element={
                          <ErrorBoundary section="Contesti" minimal>
                            <Suspense fallback={<PageLoadingFallback />}>
                              <ContextsPage />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/groups"
                        element={
                          <ErrorBoundary section="Gruppi" minimal>
                            <Suspense fallback={<PageLoadingFallback />}>
                              <GroupsPage />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/groups/:groupId"
                        element={
                          <ErrorBoundary section="Dettaglio Gruppo" minimal>
                            <Suspense fallback={<PageLoadingFallback />}>
                              <GroupDetailPage />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/statistics"
                        element={
                          <ErrorBoundary section="Statistiche" minimal>
                            <Suspense fallback={<PageLoadingFallback />}>
                              <StatisticsPage />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <ErrorBoundary section="Impostazioni" minimal>
                            <Suspense fallback={<PageLoadingFallback />}>
                              <SettingsPage />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </AppShell>
                </ProtectedRoute>
              }
            />
          </Routes>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
