import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Squirrel, ArrowLeft } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { applyThemeColor } from "@/lib/theme-colors";
import { useTheme } from "next-themes";
import { PendingChangesIndicator } from "@/components/PendingChangesIndicator";
import { Button } from "@/components/ui/button";

function AppHeader() {
  const { t } = useTranslation();
  const { isMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  const isDashboard = location.pathname === "/";

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-lg border-b border-border/40 pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 shrink-0 items-center gap-2 transition-[height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 md:px-0">
        <div className="flex items-center gap-2 px-4 safe-x md:px-4 relative w-full pt-2 md:pt-0">
          <SidebarTrigger className="ml-1" />
          {isMobile && !isDashboard && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className=""
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 mt-1">
            <Squirrel className="size-5 text-primary" />
            <h1 className="font-semibold text-lg">{t("app_title")} <span className="text-[10px] opacity-30">V10</span></h1>
          </div>
          {/* Pending Changes Indicator */}
          <div className="ml-auto">
            <PendingChangesIndicator />
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const { theme } = useTheme();

  // Apply accent color when settings or theme changes
  useEffect(() => {
    if (settings?.accentColor) {
      const isDark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      applyThemeColor(settings.accentColor, isDark);
    }
  }, [settings?.accentColor, theme]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="pt-0">
        <AppHeader />
        <div className="flex-1 p-4 md:p-8 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] min-h-0">
          <div className="mx-auto max-w-6xl space-y-6 min-w-0">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
