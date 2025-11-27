import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Dashboard } from "@/pages/Dashboard";
import { AuthPage } from "@/pages/AuthPage";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import { useAutoGenerate } from "@/hooks/useAutoGenerate";
import { useBudgetNotifications } from "@/hooks/useBudgetNotifications";
import { Toaster } from "@/components/ui/sonner";
import { PWAUpdateNotification } from "@/components/PWAUpdateNotification";

import { TransactionsPage } from "@/pages/Transactions";
import { RecurringTransactionsPage } from "@/pages/RecurringTransactions";
import { CategoriesPage } from "@/pages/Categories";
import { ContextsPage } from "@/pages/Contexts";
import { GroupsPage } from "@/pages/Groups";
import { GroupDetailPage } from "@/pages/GroupDetail";

import { StatisticsPage } from "@/pages/Statistics";

import { SettingsPage } from "@/pages/Settings";

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
    <Router>
      <ThemeProvider>
        <Toaster />
        <PWAUpdateNotification />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route
                      path="/transactions"
                      element={<TransactionsPage />}
                    />
                    <Route
                      path="/recurring"
                      element={<RecurringTransactionsPage />}
                    />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/contexts" element={<ContextsPage />} />
                    <Route path="/groups" element={<GroupsPage />} />
                    <Route
                      path="/groups/:groupId"
                      element={<GroupDetailPage />}
                    />
                    <Route path="/statistics" element={<StatisticsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AppShell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </ThemeProvider>
    </Router>
  );
}

export default App;
