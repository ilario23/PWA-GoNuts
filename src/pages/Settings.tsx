import React, { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import { useAuth } from "@/contexts/AuthProvider";
import { db } from "@/lib/db";
import { safeSync, syncManager } from "@/lib/sync";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SyncIndicator } from "@/components/SyncStatus";
import { ContentLoader } from "@/components/ui/content-loader";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  Sun,
  Moon,
  Trash2,
  AlertTriangle,
  Upload,
  Download,
  Monitor,
  X,
  Palette,
  Database,
  Wrench,
  Check,
  Compass,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { THEME_COLORS } from "@/lib/theme-colors";
import { toast } from "sonner";
import { ImportWizard } from "@/components/import/ImportWizard";
import { ImportRulesManager } from "@/components/settings/ImportRulesManager";
import { cn } from "@/lib/utils";
import { UNCATEGORIZED_CATEGORY } from "@/lib/constants";
import { useWelcomeWizard } from "@/hooks/useWelcomeWizard";

export function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { isOnline } = useOnlineSync();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  const [manualSyncing, setManualSyncing] = useState(false);
  const [fullSyncing, setFullSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

  // Welcome wizard hook for "Review Tutorial" button
  const welcomeWizard = useWelcomeWizard();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isSyncing = manualSyncing || fullSyncing;

  const handleManualSync = async () => {
    setManualSyncing(true);
    await safeSync("handleManualSync");
    setLastSyncTime(new Date());
    setManualSyncing(false);
  };

  const handleFullSync = async () => {
    setFullSyncing(true);
    try {
      await syncManager.fullSync();
      setLastSyncTime(new Date());
      toast.success(t("full_sync_completed") || "Full sync completed!");
    } catch (error) {
      toast.error(t("sync_error") || "Sync failed");
    } finally {
      setFullSyncing(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await db.delete();
      await db.open();
      toast.success(t("cache_cleared"));
      await safeSync("handleClearCache");
    } catch (error) {
      console.error("Failed to clear cache:", error);
      toast.error(t("cache_clear_error") || "Failed to clear cache.");
    }
    setClearingCache(false);
  };

  const handleImportComplete = async (stats?: { transactions: number; categories: number }) => {
    await safeSync("handleImportComplete");
    toast.success(t("import_success", {
      transactions: stats?.transactions || 0,
      categories: stats?.categories || 0
    }) || "Import successful");
  };

  const handleExportData = async () => {
    if (!user) return;

    setExportingData(true);
    try {
      const transactions = await db.transactions
        .filter((t) => t.user_id === user.id && !t.deleted_at)
        .toArray();
      const categories = await db.categories
        .filter((c) => c.user_id === user.id && !c.deleted_at && c.id !== UNCATEGORIZED_CATEGORY.ID)
        .toArray();
      const contexts = await db.contexts
        .filter((c) => c.user_id === user.id && !c.deleted_at)
        .toArray();
      const recurring = await db.recurring_transactions
        .filter((r) => r.user_id === user.id && !r.deleted_at)
        .toArray();
      const budgets = await db.category_budgets
        .filter((b) => b.user_id === user.id && !b.deleted_at)
        .toArray();

      const exportData = {
        exportDate: new Date().toISOString(),
        userId: user.id,
        transactions: transactions.map(
          ({ pendingSync, deleted_at, ...rest }) => rest
        ),
        categories: categories.map(
          ({ pendingSync, deleted_at, ...rest }) => rest
        ),
        contexts: contexts.map(({ pendingSync, deleted_at, ...rest }) => rest),
        recurring_transactions: recurring.map(({ pendingSync, deleted_at, ...rest }) => rest),
        category_budgets: budgets.map(({ pendingSync, deleted_at, ...rest }) => rest),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `expense-tracker-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        t("export_success") ||
        `Exported ${transactions.length} tx, ${categories.length} cat, ${recurring.length} recurring`
      );
    } catch (error: any) {
      toast.error(t("export_error") || `Export failed: ${error.message}`);
    } finally {
      setExportingData(false);
    }
  };

  const handleThemeChange = (theme: string) => {
    updateSettings({ theme });
    setTheme(theme);
  };

  if (!settings) {
    return (
      <div className="space-y-6 pb-10">
        <ContentLoader variant="card" count={1} />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10 overflow-x-hidden">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight">{t("settings")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings_general_desc")}</p>
      </div>

      {/* Tab Navigation */}
      <Tabs defaultValue="appearance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-13 dark:bg-primary/20">
          <TabsTrigger value="appearance" className="gap-2 text-xs sm:text-sm">
            <Palette className="h-4 w-4 hidden sm:block" />
            {t("tab_appearance")}
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2 text-xs sm:text-sm">
            <Database className="h-4 w-4 hidden sm:block" />
            {t("tab_data")}
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-2 text-xs sm:text-sm">
            <Wrench className="h-4 w-4 hidden sm:block" />
            {t("tab_advanced")}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Appearance */}
        <TabsContent value="appearance" className="space-y-4 animate-fade-in">
          {/* Language */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("language")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.language || "en"}
                onValueChange={(value) => {
                  updateSettings({ language: value });
                  import("@/i18n").then(({ default: i18n }) => {
                    i18n.changeLanguage(value);
                  });
                }}
              >
                <SelectTrigger className="w-full h-12 touch-manipulation">
                  <SelectValue placeholder={t("select_language")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="it">🇮🇹 Italiano</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Theme Toggle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("theme")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[
                  { value: "light", icon: Sun, label: t("light") },
                  { value: "dark", icon: Moon, label: t("dark") },
                  { value: "system", icon: Monitor, label: t("system") },
                ].map(({ value, icon: Icon, label }) => (
                  <Button
                    key={value}
                    variant={settings.theme === value ? "default" : "outline"}
                    className={cn(
                      "flex-1 h-12 gap-2 transition-all touch-manipulation",
                      settings.theme === value && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => handleThemeChange(value)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Accent Color Palette */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("accent_color")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
                {Object.values(THEME_COLORS).map((color) => {
                  const isSelected = (settings.accentColor || "slate") === color.name;
                  return (
                    <button
                      key={color.name}
                      onClick={() => updateSettings({ accentColor: color.name })}
                      className={cn(
                        "relative h-8 w-full rounded-md border-2 transition-all touch-manipulation hover:scale-105 active:scale-95",
                        isSelected
                          ? "border-foreground ring-2 ring-offset-1 ring-foreground"
                          : "border-transparent hover:border-muted-foreground/50"
                      )}
                      style={{
                        backgroundColor: `hsl(${mounted && resolvedTheme === "dark" ? color.dark.primary : color.light.primary})`,
                      }}
                      title={t(color.name)}
                    >
                      {isSelected && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-md" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                {t((settings.accentColor || "slate"))}
              </p>
            </CardContent>
          </Card>

          {/* Review Tutorial */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("welcome.review_tutorial")}</CardTitle>
              <CardDescription>{t("welcome.review_tutorial_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full h-12 gap-3 touch-manipulation"
                onClick={() => welcomeWizard.reset()}
              >
                <Compass className="h-5 w-5 text-primary" />
                {t("welcome.review_tutorial")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Data */}
        <TabsContent value="data" className="space-y-4 animate-fade-in">
          {/* Monthly Budget */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("monthly_budget")}</CardTitle>
              <CardDescription>{t("monthly_budget_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 items-center">
                <span className="text-lg font-medium text-muted-foreground">€</span>
                <Input
                  key={settings.monthly_budget ?? "empty"}
                  type="number"
                  step="1"
                  min="0"
                  placeholder={t("budget_placeholder")}
                  defaultValue={settings.monthly_budget ?? ""}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (value && parseFloat(value) < 0) {
                      e.target.value = "";
                      updateSettings({ monthly_budget: null });
                      return;
                    }
                    updateSettings({
                      monthly_budget: value ? parseFloat(value) : null,
                    });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "-" || e.key === "e") {
                      e.preventDefault();
                    }
                  }}
                  className="flex-1 h-12 touch-manipulation text-lg"
                />
                {settings.monthly_budget !== null &&
                  settings.monthly_budget !== undefined && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-destructive"
                      onClick={() => updateSettings({ monthly_budget: null })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {settings.monthly_budget
                  ? `€${settings.monthly_budget.toFixed(2)} / ${t("monthly").toLowerCase()}`
                  : t("budget_not_set")}
              </p>
            </CardContent>
          </Card>

          {/* Export & Import */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("data_management")}</CardTitle>
              <CardDescription>{t("data_management_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Export */}
              <Button
                variant="outline"
                className="w-full h-14 justify-start gap-3 touch-manipulation"
                onClick={handleExportData}
                disabled={exportingData}
              >
                {exportingData ? (
                  <RefreshCw className="h-5 w-5 shrink-0 animate-spin" />
                ) : (
                  <Download className="h-5 w-5 shrink-0 text-primary" />
                )}
                <div className="text-left overflow-hidden min-w-0 flex-1">
                  <div className="font-medium truncate">{t("export_data")}</div>
                  <div className="text-xs text-muted-foreground truncate">{t("export_data_desc")}</div>
                </div>
              </Button>

              {/* Import */}
              <Button
                variant="outline"
                className="w-full h-14 justify-start gap-3 touch-manipulation"
                onClick={() => setIsImportWizardOpen(true)}
              >
                <Upload className="h-5 w-5 shrink-0 text-primary" />
                <div className="text-left overflow-hidden min-w-0 flex-1">
                  <div className="font-medium truncate">{t("import_data")}</div>
                  <div className="text-xs text-muted-foreground truncate">{t("import_data_desc")}</div>
                </div>
              </Button>
            </CardContent>
          </Card>

          <ImportRulesManager />
        </TabsContent>

        {/* Tab: Advanced */}
        <TabsContent value="advanced" className="space-y-4 animate-fade-in">
          {/* Sync */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("sync")}</CardTitle>
              <CardDescription>{t("sync_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SyncIndicator
                isSyncing={isSyncing}
                isOnline={isOnline}
                lastSyncTime={lastSyncTime}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleManualSync}
                  disabled={isSyncing || !isOnline}
                  variant="outline"
                  className="h-12 touch-manipulation"
                >
                  <RefreshCw
                    className={cn("mr-2 h-4 w-4", manualSyncing && "animate-spin")}
                  />
                  {t("sync_now")}
                </Button>
                <Button
                  onClick={handleFullSync}
                  disabled={isSyncing || !isOnline}
                  variant="secondary"
                  className="h-12 touch-manipulation"
                  title={t("full_sync_desc") || "Re-download all data from server"}
                >
                  <RefreshCw
                    className={cn("mr-2 h-4 w-4", fullSyncing && "animate-spin")}
                  />
                  {t("full_sync")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("full_sync_hint")}
              </p>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {t("danger_zone")}
              </CardTitle>
              <CardDescription>{t("danger_zone_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full h-12 touch-manipulation"
                    disabled={clearingCache}
                  >
                    {clearingCache ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    {t("clear_local_cache")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {t("clear_cache_confirm_title")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("clear_cache_confirm_desc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearCache}
                      className="bg-destructive text-destructive-foreground"
                    >
                      {t("clear")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-xs text-muted-foreground mt-2">
                {t("clear_local_cache_desc")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ImportWizard
        open={isImportWizardOpen}
        onOpenChange={setIsImportWizardOpen}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
