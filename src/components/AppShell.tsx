import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Squirrel } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { applyThemeColor } from "@/lib/theme-colors";
import { useTheme } from "next-themes";
import { PendingChangesIndicator } from "@/components/PendingChangesIndicator";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
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
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 md:px-0">
          <div className="flex items-center gap-2 px-4 safe-x md:px-4 relative w-full pt-2 md:pt-0">
            <SidebarTrigger className="ml-1 text-primary" />
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 mt-1">
              <Squirrel className="size-5 text-primary" />
              <h1 className="font-semibold text-lg">{t("app_title")}</h1>
            </div>
            {/* Pending Changes Indicator */}
            <div className="ml-auto">
              <PendingChangesIndicator />
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-6xl space-y-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
