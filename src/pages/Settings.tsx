import React, { useState, useRef } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import { useAuth } from "@/contexts/AuthProvider";
import { db, Transaction, Category, RecurringTransaction, CategoryBudget } from "@/lib/db";
import { safeSync, syncManager } from "@/lib/sync";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { SyncIndicator } from "@/components/SyncStatus";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Trash2,
  AlertTriangle,
  Upload,
  Download,
  FileJson,
  X,
  CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { THEME_COLORS } from "@/lib/theme-colors";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { v4 as uuidv4 } from "uuid";

interface ImportStats {
  categories: number;
  transactions: number;
  recurring: number;
  budgets: number;
  isVueMigration: boolean;
}

export function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { isOnline } = useOnlineSync();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  const [manualSyncing, setManualSyncing] = useState(false);
  const [fullSyncing, setFullSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avoid hydration mismatch
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
      await db.clearLocalCache();
      toast.success(t("cache_cleared"));
      // Trigger a sync to repopulate from server
      await safeSync("handleClearCache");
    } catch (error) {
      toast.error(t("cache_clear_error") || "Failed to clear cache");
    } finally {
      setClearingCache(false);
    }
  };

  const handleImportData = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setImportingData(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Check if this is a Vue export
      const isVueExport = data.source === 'vue-firebase-expense-tracker';

      if (isVueExport) {
        // VUE MIGRATION LOGIC
        console.log("Starting migration from Vue export...");
        let importedTransactions = 0;
        let importedCategories = 0;
        let importedRecurring = 0;
        let importedBudgets = 0;

        // 1. Import Categories
        const categoryMap = new Map<string, string>(); // Old ID -> New ID (though we try to keep IDs)

        if (data.data.categories && Array.isArray(data.data.categories)) {
          for (const vueCat of data.data.categories) {
            // Map type: 1=expense, 2=income, 3=investment
            let type: "expense" | "income" | "investment" = "expense";
            if (vueCat.type === 2) type = "income";
            if (vueCat.type === 3) type = "investment";

            const category: Category = {
              id: vueCat.id, // Try to preserve ID
              user_id: user.id,
              name: vueCat.title,
              icon: vueCat.icon || "CircleDollarSign",
              color: vueCat.color || "#6366f1",
              type: type,
              parent_id: vueCat.parentCategoryId || undefined,
              active: vueCat.active ? 1 : 0,
              deleted_at: null,
              pendingSync: 1,
            };

            await db.categories.put(category);
            categoryMap.set(vueCat.id, vueCat.id);
            importedCategories++;

            // Handle Budget (move to category_budgets table)
            if (vueCat.budget && vueCat.budget > 0) {
              const budget: CategoryBudget = {
                id: uuidv4(),
                user_id: user.id,
                category_id: vueCat.id,
                amount: vueCat.budget,
                period: "monthly",
                deleted_at: null,
                pendingSync: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              await db.category_budgets.put(budget);
              importedBudgets++;
            }
          }
        }

        // 2. Import Transactions
        if (data.data.transactions && Array.isArray(data.data.transactions)) {
          for (const vueTx of data.data.transactions) {
            // Infer type from category if possible, otherwise default to expense
            // We need to look up the category to get the type
            const category = await db.categories.get(vueTx.categoryId);
            const type = category?.type || "expense";

            const transaction: Transaction = {
              id: vueTx.id, // Try to preserve ID
              user_id: user.id,
              category_id: vueTx.categoryId,
              type: type,
              amount: parseFloat(vueTx.amount),
              date: vueTx.timestamp.split("T")[0],
              year_month: vueTx.timestamp.substring(0, 7),
              description: vueTx.description || "",
              deleted_at: null,
              pendingSync: 1,
            };

            await db.transactions.put(transaction);
            importedTransactions++;
          }
        }

        // 3. Import Recurring Expenses
        if (data.data.recurringExpenses && Array.isArray(data.data.recurringExpenses)) {
          for (const vueRec of data.data.recurringExpenses) {
            // Map frequency
            let frequency: "daily" | "weekly" | "monthly" | "yearly" = "monthly";
            if (vueRec.frequency === "WEEKLY") frequency = "weekly";
            if (vueRec.frequency === "YEARLY") frequency = "yearly";

            // Look up category for type
            const category = await db.categories.get(vueRec.categoryId);
            const type = category?.type || "expense";

            const recurring: RecurringTransaction = {
              id: vueRec.id,
              user_id: user.id,
              category_id: vueRec.categoryId,
              type: type,
              amount: parseFloat(vueRec.amount),
              description: vueRec.description || "",
              frequency: frequency,
              start_date: vueRec.startDate.split("T")[0],
              active: vueRec.isActive ? 1 : 0,
              deleted_at: null,
              pendingSync: 1,
            };

            await db.recurring_transactions.put(recurring);
            importedRecurring++;
          }
        }

        setImportStats({
          categories: importedCategories,
          transactions: importedTransactions,
          recurring: importedRecurring,
          budgets: importedBudgets,
          isVueMigration: true
        });
        setShowImportSuccess(true);

      } else {
        // EXISTING IMPORT LOGIC
        // Validate structure
        if (!data.transactions && !data.categories) {
          throw new Error(
            "Invalid format: must contain transactions and/or categories"
          );
        }

        let importedTransactions = 0;
        let importedCategories = 0;

        // Import categories first (transactions may depend on them)
        if (data.categories && Array.isArray(data.categories)) {
          for (const cat of data.categories) {
            const category: Category = {
              id: cat.id || uuidv4(),
              user_id: user.id,
              name: cat.name,
              icon: cat.icon || "CircleDollarSign",
              color: cat.color || "#6366f1",
              type: cat.type || "expense",
              parent_id: cat.parent_id,
              active: 1,
              deleted_at: null,
              pendingSync: 1,
            };
            await db.categories.put(category);
            importedCategories++;
          }
        }

        // Import transactions
        if (data.transactions && Array.isArray(data.transactions)) {
          for (const tx of data.transactions) {
            const transaction: Transaction = {
              id: tx.id || uuidv4(),
              user_id: user.id,
              category_id: tx.category_id || "",
              type: tx.type || "expense",
              amount: parseFloat(tx.amount) || 0,
              date: tx.date || new Date().toISOString().split("T")[0],
              year_month:
                tx.date?.substring(0, 7) ||
                new Date().toISOString().substring(0, 7),
              description: tx.description || "",
              context_id: tx.context_id,
              group_id: tx.group_id,
              paid_by_user_id: tx.paid_by_user_id,
              deleted_at: null,
              pendingSync: 1,
            };
            await db.transactions.put(transaction);
            importedTransactions++;
          }
        }

        setImportStats({
          categories: importedCategories,
          transactions: importedTransactions,
          recurring: 0,
          budgets: 0,
          isVueMigration: false
        });
        setShowImportSuccess(true);
      }

      // Sync to server
      await safeSync("handleImportData");
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(t("import_error") || `Import failed: ${error.message}`);
    } finally {
      setImportingData(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleExportData = async () => {
    if (!user) return;

    setExportingData(true);
    try {
      // Fetch all data
      const transactions = await db.transactions
        .filter((t) => t.user_id === user.id && !t.deleted_at)
        .toArray();
      const categories = await db.categories
        .filter((c) => c.user_id === user.id && !c.deleted_at)
        .toArray();
      const contexts = await db.contexts
        .filter((c) => c.user_id === user.id && !c.deleted_at)
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
      };

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `expense-tracker-export-${new Date().toISOString().split("T")[0]
        }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        t("export_success") ||
        `Exported ${transactions.length} transactions, ${categories.length} categories, ${contexts.length} contexts`
      );
    } catch (error: any) {
      toast.error(t("export_error") || `Export failed: ${error.message}`);
    } finally {
      setExportingData(false);
    }
  };

  if (!settings) {
    return (
      <div className="space-y-6 pb-10">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">{t("settings")}</h2>
        <p className="text-muted-foreground">{t("settings_general_desc")}</p>
      </div>
      <div className="grid gap-6">
        {/* 1. General */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings_general")}</CardTitle>
            <CardDescription>{t("settings_general_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="language">{t("language")}</Label>
              <Select
                value={settings.language || "en"}
                onValueChange={(value) => {
                  updateSettings({ language: value });
                  import("@/i18n").then(({ default: i18n }) => {
                    i18n.changeLanguage(value);
                  });
                }}
              >
                <SelectTrigger id="language" className="max-w-[200px]">
                  <SelectValue placeholder={t("select_language")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {mounted && resolvedTheme === "dark" ? (
                  <Moon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Sun className="h-4 w-4 text-muted-foreground" />
                )}
                <Label className="text-sm font-medium">
                  {t("theme")} & {t("accent_color")}
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="theme"
                    className="text-xs text-muted-foreground"
                  >
                    {t("theme")}
                  </Label>
                  <Select
                    value={settings.theme}
                    onValueChange={(value) => updateSettings({ theme: value })}
                  >
                    <SelectTrigger id="theme" className="h-12 touch-manipulation">
                      <SelectValue placeholder={t("select_theme")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          {t("light")}
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          {t("dark")}
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          {t("system")}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="accentColor"
                    className="text-xs text-muted-foreground"
                  >
                    {t("accent_color")}
                  </Label>
                  <Select
                    value={settings.accentColor || "slate"}
                    onValueChange={(value) =>
                      updateSettings({ accentColor: value })
                    }
                  >
                    <SelectTrigger id="accentColor" className="h-12 touch-manipulation">
                      <SelectValue placeholder={t("select_accent_color")} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(THEME_COLORS).map((color) => (
                        <SelectItem key={color.name} value={color.name}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full border"
                              style={{
                                backgroundColor: `hsl(${color.light.primary})`,
                              }}
                            />
                            {t(color.name)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Monthly Budget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("monthly_budget")}
            </CardTitle>
            <CardDescription>{t("monthly_budget_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="monthly-budget">{t("monthly_budget")}</Label>
              <div className="flex gap-2 items-center">
                <span className="text-muted-foreground">€</span>
                <Input
                  key={settings.monthly_budget ?? "empty"}
                  id="monthly-budget"
                  type="number"
                  step="1"
                  min="0"
                  placeholder={t("budget_placeholder")}
                  defaultValue={settings.monthly_budget ?? ""}
                  onBlur={(e) => {
                    const value = e.target.value;
                    updateSettings({
                      monthly_budget: value ? parseFloat(value) : null,
                    });
                  }}
                  className="max-w-[200px]"
                />
                {settings.monthly_budget !== null &&
                  settings.monthly_budget !== undefined && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => updateSettings({ monthly_budget: null })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
              </div>
              <p className="text-xs text-muted-foreground">
                {settings.monthly_budget
                  ? `€${settings.monthly_budget.toFixed(2)} / ${t(
                    "monthly"
                  ).toLowerCase()}`
                  : t("budget_not_set")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Synchronization */}
        <Card>
          <CardHeader>
            <CardTitle>{t("sync")}</CardTitle>
            <CardDescription>{t("sync_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <SyncIndicator
                isSyncing={isSyncing}
                isOnline={isOnline}
                lastSyncTime={lastSyncTime}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleManualSync}
                  disabled={isSyncing || !isOnline}
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${manualSyncing ? "animate-spin" : ""
                      }`}
                  />
                  {t("sync_now")}
                </Button>
                <Button
                  onClick={handleFullSync}
                  disabled={isSyncing || !isOnline}
                  size="sm"
                  variant="secondary"
                  className="flex-1 sm:flex-none"
                  title={
                    t("full_sync_desc") || "Re-download all data from server"
                  }
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${fullSyncing ? "animate-spin" : ""
                      }`}
                  />
                  {t("full_sync") || "Full Sync"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("full_sync_hint") ||
                "Use 'Full Sync' if data seems out of sync after direct database changes."}
            </p>
          </CardContent>
        </Card>

        {/* 4. Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>{t("data_management")}</CardTitle>
            <CardDescription>{t("data_management_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Clear Local Cache */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                  {t("clear_local_cache")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("clear_local_cache_desc")}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={clearingCache}
                    className="w-full sm:w-auto"
                  >
                    {clearingCache ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      t("clear")
                    )}
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
            </div>

            <Separator />

            {/* Export Data */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  {t("export_data")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("export_data_desc")}
                </p>
              </div>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                  disabled={exportingData}
                  className="w-full sm:w-auto"
                >
                  {exportingData ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileJson className="h-4 w-4 mr-2" />
                  )}
                  {t("export_json")}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Import Data (Dev Feature) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  {t("import_data")}
                  <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1.5 py-0.5 rounded">
                    DEV
                  </span>
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("import_data_desc")}
                </p>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importingData}
                  className="w-full sm:w-auto"
                >
                  {importingData ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileJson className="h-4 w-4 mr-2" />
                  )}
                  {t("import_json")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showImportSuccess} onOpenChange={setShowImportSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              {t("import_success_title") || "Import Successful"}
            </DialogTitle>
            <DialogDescription>
              {t("import_success_desc") || "Your data has been successfully imported into the application."}
            </DialogDescription>
          </DialogHeader>

          {importStats && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="flex flex-col items-center p-3 bg-secondary/20 rounded-lg">
                <span className="text-2xl font-bold">{importStats.categories}</span>
                <span className="text-xs text-muted-foreground uppercase">{t("categories") || "Categories"}</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-secondary/20 rounded-lg">
                <span className="text-2xl font-bold">{importStats.transactions}</span>
                <span className="text-xs text-muted-foreground uppercase">{t("transactions") || "Transactions"}</span>
              </div>
              {importStats.isVueMigration && (
                <>
                  <div className="flex flex-col items-center p-3 bg-secondary/20 rounded-lg">
                    <span className="text-2xl font-bold">{importStats.recurring}</span>
                    <span className="text-xs text-muted-foreground uppercase">{t("recurring") || "Recurring"}</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-secondary/20 rounded-lg">
                    <span className="text-2xl font-bold">{importStats.budgets}</span>
                    <span className="text-xs text-muted-foreground uppercase">{t("budgets") || "Budgets"}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowImportSuccess(false)}>
              {t("close") || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
