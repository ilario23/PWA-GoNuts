import { useEffect } from "react";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useSettings } from "@/hooks/useSettings";
import { applyThemeColor } from "@/lib/theme-colors";
import { useTheme } from "next-themes";
import { PendingChangesIndicator } from "@/components/PendingChangesIndicator";
import { BottomNav } from "@/components/BottomNav";

// Desktop-only top bar. On mobile the header is hidden by design; navigation
// (including back-out of secondary pages) lives in the bottom nav, and detail
// pages such as GroupDetail render their own in-content back button.
function AppHeader() {
  return (
    <header className="hidden md:flex sticky top-0 z-40 w-full bg-background/80 backdrop-blur-lg border-b border-border/40 pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 shrink-0 items-center gap-2 transition-[height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 md:px-0">
        <div className="flex items-center gap-2 px-4 safe-x md:px-4 relative w-full pt-2 md:pt-0">
          <SidebarTrigger className="ml-1" />
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
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-6xl space-y-6 min-w-0">{children}</div>
        </main>
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  );
}
