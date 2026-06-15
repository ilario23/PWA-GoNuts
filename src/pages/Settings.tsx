import React, { useState } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
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
import { Card, CardContent } from "@/components/ui/card";
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
  Check,
  Compass,
  BookOpen,
  History,
  Languages,
  PiggyBank,
  ArrowLeftRight,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";
import { HelpSystemWrapper } from "@/components/help/HelpSystem";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { THEME_COLORS } from "@/lib/theme-colors";
import { toast } from "sonner";
import { ImportWizard } from "@/components/import/ImportWizard";
import { ImportRulesManager } from "@/components/settings/ImportRulesManager";
import { cn } from "@/lib/utils";
import { useWelcomeWizard } from "@/hooks/useWelcomeWizard";
import { useAvailableYears } from "@/hooks/useAvailableYears";
import { exportTransactionsToCSV, exportTransactionsToJSON } from "@/lib/exportUtils";
import { exportFullBackup, importFullBackup } from "@/lib/backup";

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 pb-1 pt-4", className)}>
      {children}
    </p>
  );
}

function SettingsRow({
  icon: Icon,
  color,
  label,
  value,
  action,
  onClick,
  first = false,
}: {
  icon: React.ElementType;
  color: string;
  label: string;
  value?: React.ReactNode;
  action?: React.ReactNode;
  onClick?: () => void;
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3.5",
        !first && "border-t border-border/60",
        onClick && "cursor-pointer hover:bg-muted/40 transition-colors"
      )}
      onClick={onClick}
    >
      <span
        className="rounded-[10px] p-2 shrink-0"
        style={{ backgroundColor: color, color: "#fff" }}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 font-semibold text-sm">{label}</span>
      {value !== undefined && (
        <span className="text-sm text-muted-foreground">{value}</span>
      )}
      {action !== undefined ? action : <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { isOnline } = useOnlineSync();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
  const [manualSyncing, setManualSyncing] = useState(false);
  const [fullSyncing, setFullSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

  // Welcome wizard hook for "Review Tutorial" button
  const welcomeWizard = useWelcomeWizard();

  const availableYears = useAvailableYears();
  const [exportYear, setExportYear] = useState<string>(new Date().getFullYear().toString());
  const [exportMonth, setExportMonth] = useState<string>("all");
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const restoreInputRef = React.useRef<HTMLInputElement | null>(null);

  // Resolve the transaction set for the current year/month filter (shared by
  // the CSV and JSON exports so they always cover identical data).
  const getFilteredTransactions = async (userId: string) => {
    if (exportYear === "all") {
      const all = await db.transactions
        .filter((t) => t.user_id === userId && !t.deleted_at)
        .toArray();
      all.sort((a, b) => b.date.localeCompare(a.date));
      return all;
    }
    if (exportMonth === "all") {
      return db.transactions
        .where("year_month")
        .between(`${exportYear}-01`, `${exportYear}-12\uffff`)
        .filter((t) => t.user_id === userId && !t.deleted_at)
        .toArray();
    }
    return db.transactions
      .where("year_month")
      .equals(`${exportYear}-${exportMonth}`)
      .filter((t) => t.user_id === userId && !t.deleted_at)
      .toArray();
  };

  const handleCSVExport = async () => {
    if (!user) return;
    setIsExportingCSV(true);
    try {
      const transactions = await getFilteredTransactions(user.id);

      // Fetch related data for resolution
      const categories = await db.categories.toArray();
      const contexts = await db.contexts.toArray();
      const groups = await db.groups.toArray();
      const members = await db.group_members.toArray();

      exportTransactionsToCSV(
        transactions,
        categories,
        contexts,
        groups,
        members,
        t
      );
      toast.success(t("export_success"));
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(t("export_error") || "Export failed");
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleJSONExport = async () => {
    if (!user) return;
    setIsExportingJSON(true);
    try {
      const transactions = await getFilteredTransactions(user.id);
      exportTransactionsToJSON(transactions);
      toast.success(t("export_success"));
    } catch (error) {
      console.error("JSON export failed:", error);
      toast.error(t("export_error") || "Export failed");
    } finally {
      setIsExportingJSON(false);
    }
  };

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
    } catch (_error) {
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

  // Permanently delete the account + all server data via the delete_my_account
  // RPC (GDPR erasure), then wipe local data and sign out. Irreversible.
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!navigator.onLine) {
      toast.error(t("delete_account_offline", "You must be online to delete your account."));
      return;
    }
    setDeletingAccount(true);
    try {
      // RPC isn't in the generated Database types; cast the name only.
      const { error } = await supabase.rpc("delete_my_account" as never);
      if (error) throw error;
      await db.clearLocalCache();
      await signOut();
      toast.success(t("account_deleted", "Your account and all data have been deleted."));
      navigate("/auth");
    } catch (error) {
      console.error("[Settings] Account deletion failed:", error);
      toast.error(t("delete_account_error", "Account deletion failed. Please try again."));
    } finally {
      setDeletingAccount(false);
      setDeleteConfirm("");
    }
  };

  const handleImportComplete = async (stats?: { transactions: number; categories: number }) => {
    await safeSync("handleImportComplete");
    toast.success(t("import_success", {
      transactions: stats?.transactions || 0,
      categories: stats?.categories || 0
    }) || "Import successful");
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
    <div className="space-y-1 pb-[calc(5rem+env(safe-area-inset-bottom))] overflow-x-hidden">
      <h2 className="text-2xl font-bold tracking-tight mb-1">{t("settings")}</h2>

      {/* ── GENERAL ─────────────────────────────────────── */}
      <Eyebrow>{t("general") || "General"}</Eyebrow>
      <Card className="overflow-hidden">
        <SettingsRow first icon={Languages} color="#3D7CB8" label={t("language")}
          action={
            <Select value={settings.language || "en"} onValueChange={(value) => {
              updateSettings({ language: value });
              import("@/i18n").then(({ default: i18n }) => { i18n.changeLanguage(value); });
            }}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("language_en")}</SelectItem>
                <SelectItem value="it">{t("language_it")}</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <SettingsRow icon={Sun} color="#D08A1E" label={t("theme")}
          action={
            <div className="flex gap-1">
              {([{ value: "light", icon: Sun }, { value: "dark", icon: Moon }, { value: "system", icon: Monitor }] as const).map(({ value, icon: Icon }) => (
                <button key={value} onClick={() => handleThemeChange(value)}
                  className={cn("h-8 w-8 rounded-[8px] flex items-center justify-center transition-all",
                    settings.theme === value ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}>
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          }
        />
      </Card>

      <Eyebrow>{t("accent_color")}</Eyebrow>
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
            {Object.values(THEME_COLORS).map((color) => {
              const isSelected = (settings.accentColor || "slate") === color.name;
              return (
                <button key={color.name} onClick={() => updateSettings({ accentColor: color.name })}
                  className={cn("relative h-8 w-full rounded-[8px] transition-all touch-manipulation hover:scale-105 active:scale-95",
                    isSelected ? "ring-2 ring-offset-2 ring-foreground" : ""
                  )}
                  style={{ backgroundColor: `hsl(${mounted && resolvedTheme === "dark" ? color.dark.primary : color.light.primary})` }}
                  title={t(color.name)}>
                  {isSelected && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-md" />}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">{t((settings.accentColor || "slate"))}</p>
        </CardContent>
      </Card>

      {/* ── TOTALS ───────────────────────────────────────── */}
      <Eyebrow>{t("monthly_budget")}</Eyebrow>
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 items-center">
            <span className="rounded-[10px] p-2 shrink-0 bg-[#D14A8A] text-white">
              <PiggyBank className="h-3.5 w-3.5" />
            </span>
            <Input key={settings.monthly_budget ?? "empty"} type="number" step="1" min="0"
              placeholder={t("budget_placeholder")}
              defaultValue={settings.monthly_budget ?? ""}
              onBlur={(e) => {
                const value = e.target.value;
                if (value && parseFloat(value) < 0) { e.target.value = ""; updateSettings({ monthly_budget: null }); return; }
                updateSettings({ monthly_budget: value ? parseFloat(value) : null });
              }}
              onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
              className="flex-1 h-10 touch-manipulation"
            />
            {settings.monthly_budget !== null && settings.monthly_budget !== undefined && (
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive"
                aria-label={t("clear", "Clear")}
                onClick={() => updateSettings({ monthly_budget: null })}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 pl-11">
            {settings.monthly_budget ? `€${settings.monthly_budget.toFixed(2)} / ${t("monthly").toLowerCase()}` : t("budget_not_set")}
          </p>
        </CardContent>
      </Card>

      {/* ── DATA ─────────────────────────────────────────── */}
      <Eyebrow>{t("data_management")}</Eyebrow>
      <Card className="overflow-hidden">
        <SettingsRow first icon={Upload} color="#2F9E5A" label={t("import_data")}
          value={<span className="text-xs text-muted-foreground">{t("import_data_desc")}</span>}
          onClick={() => setIsImportWizardOpen(true)}
        />
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-[10px] p-2 shrink-0 text-white" style={{ backgroundColor: "#2F7C3E" }}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="font-semibold text-sm">{t("export_csv") || "Export CSV"}</p>
              <p className="text-xs text-muted-foreground">{t("export_csv_desc") || "Download transactions for spreadsheets"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={exportYear} onValueChange={setExportYear}>
              <SelectTrigger className={cn("flex-1", exportYear === "all" && "bg-primary text-primary-foreground border-primary hover:bg-primary/90")}>
                <SelectValue placeholder={t("year")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-primary">{t("all_years") || "All Years"}</SelectItem>
                {availableYears.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={exportMonth} onValueChange={setExportMonth} disabled={exportYear === "all"}>
              <SelectTrigger className="flex-1 disabled:opacity-50">
                <SelectValue placeholder={t("month")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("all_year") || "Whole Year"}</SelectItem>
                {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m, i) => (
                  <SelectItem key={m} value={m}>{t(["january","february","march","april","may","june","july","august","september","october","november","december"][i])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11 gap-2" onClick={handleCSVExport} disabled={isExportingCSV || isExportingJSON}>
              {isExportingCSV ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-gonuts-good" />}
              {t("download_csv") || "Download CSV"}
            </Button>
            <Button variant="outline" className="h-11 gap-2" onClick={handleJSONExport} disabled={isExportingCSV || isExportingJSON}>
              {isExportingJSON ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 text-gonuts-good" />}
              {t("download_json") || "Download JSON"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-[10px] p-2 shrink-0 text-white" style={{ backgroundColor: "#4F82D9" }}>
              <Download className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="font-semibold text-sm">{t("full_backup", "Full backup")}</p>
              <p className="text-xs text-muted-foreground">{t("full_backup_desc", "All data as JSON: transactions, categories, budgets, groups, rules")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 gap-2"
              disabled={isBackingUp}
              onClick={async () => {
                setIsBackingUp(true);
                try {
                  await exportFullBackup();
                  toast.success(t("backup_created", "Backup downloaded"));
                } catch (error) {
                  console.error("Backup failed:", error);
                  toast.error(t("backup_error", "Backup failed"));
                } finally {
                  setIsBackingUp(false);
                }
              }}
            >
              {isBackingUp ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t("backup_download", "Download")}
            </Button>
            <Button
              variant="outline"
              className="h-11 gap-2"
              disabled={isRestoring}
              onClick={() => restoreInputRef.current?.click()}
            >
              {isRestoring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {t("backup_restore", "Restore")}
            </Button>
          </div>
          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setIsRestoring(true);
              try {
                const restored = await importFullBackup(file);
                toast.success(
                  t("backup_restored", {
                    defaultValue: "Restored {{count}} records",
                    count: restored,
                  })
                );
              } catch (error) {
                console.error("Restore failed:", error);
                toast.error(
                  error instanceof Error
                    ? error.message
                    : t("backup_restore_error", "Restore failed")
                );
              } finally {
                setIsRestoring(false);
              }
            }}
          />
        </CardContent>
      </Card>

      <ImportRulesManager />

      {/* ── SYNC ─────────────────────────────────────────── */}
      <Eyebrow>{t("sync")}</Eyebrow>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-[10px] p-2 shrink-0 bg-[#1A1714] text-white dark:bg-[#FAF6EF] dark:text-[#1A1714]">
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </span>
            <SyncIndicator isSyncing={isSyncing} isOnline={isOnline} lastSyncTime={lastSyncTime} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleManualSync} disabled={isSyncing || !isOnline} variant="outline" className="h-11">
              <RefreshCw className={cn("mr-2 h-4 w-4", manualSyncing && "animate-spin")} />
              {t("sync_now")}
            </Button>
            <Button onClick={handleFullSync} disabled={isSyncing || !isOnline} variant="secondary" className="h-11">
              <RefreshCw className={cn("mr-2 h-4 w-4", fullSyncing && "animate-spin")} />
              {t("full_sync")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("full_sync_hint")}</p>
        </CardContent>
      </Card>

      {/* ── ABOUT ─────────────────────────────────────────── */}
      <Eyebrow>{t("help_and_resources", "Help & Resources")}</Eyebrow>
      <Card className="overflow-hidden">
        <HelpSystemWrapper triggerAsChild>
          <div>
            <SettingsRow first icon={BookOpen} color="#4F82D9" label={t("open_user_guide", "Open User Guide")}
              value={<span className="text-xs text-muted-foreground">{t("user_guide_desc", "Docs & tips")}</span>}
            />
          </div>
        </HelpSystemWrapper>
        <SettingsRow icon={Compass} color="#9B5CF6" label={t("welcome.review_tutorial")}
          value={<span className="text-xs text-muted-foreground">{t("welcome.review_tutorial_desc")}</span>}
          onClick={() => welcomeWizard.reset()}
        />
        <SettingsRow icon={History} color="#E66A3C" label={t("changelog")}
          value={<span className="text-xs text-muted-foreground">{t("changelog_desc", "What's new")}</span>}
          onClick={() => window.location.href = "/changelog"}
        />
      </Card>

      {/* ── DANGER ────────────────────────────────────────── */}
      <Eyebrow className="text-destructive">{t("danger_zone")}</Eyebrow>
      <Card className="overflow-hidden border-destructive/30">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div>
              <SettingsRow first icon={Trash2} color="#D14545" label={t("clear_local_cache")}
                value={clearingCache ? <RefreshCw className="h-4 w-4 animate-spin" /> : undefined}
                action={<ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
                onClick={undefined}
              />
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />{t("clear_cache_confirm_title")}
              </AlertDialogTitle>
              <AlertDialogDescription>{t("clear_cache_confirm_desc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearCache} className="bg-destructive text-destructive-foreground">{t("clear")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog onOpenChange={(open) => { if (!open) setDeleteConfirm(""); }}>
          <AlertDialogTrigger asChild>
            <div>
              <SettingsRow icon={Trash2} color="#B11D1D" label={t("delete_account", "Delete account")}
                value={<span className="text-xs text-muted-foreground">{t("delete_account_desc", "Permanently delete your account and all data")}</span>}
                action={deletingAccount ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4 text-muted-foreground/50" />}
                onClick={undefined}
              />
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />{t("delete_account_confirm_title", "Delete account?")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                {t("delete_account_confirm_desc", "This permanently deletes your account and all of your data from the server. This cannot be undone.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">
                {t("delete_account_type_email", "Type your email to confirm:")}
              </label>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={user?.email ?? ""}
                autoComplete="off"
                autoCapitalize="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirm("")}>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirm.trim().toLowerCase() !== (user?.email ?? "").toLowerCase()}
                className="bg-destructive text-destructive-foreground"
              >
                {t("delete_account_button", "Delete forever")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      <ImportWizard open={isImportWizardOpen} onOpenChange={setIsImportWizardOpen} onImportComplete={handleImportComplete} />
    </div>
  );
}
