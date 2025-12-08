import React, { useState, useRef } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import { useAuth } from "@/contexts/AuthProvider";
import { db, Transaction, Category, RecurringTransaction, CategoryBudget } from "@/lib/db";
import { safeSync, syncManager } from "@/lib/sync";
import { AVAILABLE_ICONS } from "@/lib/icons";
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
import { ContentLoader } from "@/components/ui/content-loader";
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
import { Progress } from "@/components/ui/progress";

import { v4 as uuidv4 } from "uuid";

// Default fallback icon for unsupported icons
const DEFAULT_FALLBACK_ICON = "DollarSign";

// Set of valid icon names for fast lookup
const VALID_ICON_NAMES = new Set(AVAILABLE_ICONS.map(i => i.name));

/**
 * Validates an icon name and returns it if valid, otherwise returns the fallback icon.
 * @param iconName The icon name to validate
 * @returns The validated icon name or the fallback
 */
function validateIcon(iconName: string | undefined | null): string {
  if (!iconName || !VALID_ICON_NAMES.has(iconName)) {
    return DEFAULT_FALLBACK_ICON;
  }
  return iconName;
}

interface ImportStats {
  categories: number;
  transactions: number;
  recurring: number;
  budgets: number;
  iconsNotPreserved: number;
  orphansDetected: number;
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
  const [importProgress, setImportProgress] = useState<{
    phase: 'idle' | 'parsing' | 'importing' | 'syncing' | 'complete';
    current: number;
    total: number;
    pendingSync: number;
  }>({ phase: 'idle', current: 0, total: 0, pendingSync: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Subscribe to sync manager to track pending items during sync phase
  React.useEffect(() => {
    if (importProgress.phase === 'syncing') {
      const unsubscribe = syncManager.onSyncChange((status) => {
        setImportProgress(prev => ({
          ...prev,
          pendingSync: status.pendingCount
        }));
      });
      return unsubscribe;
    }
  }, [importProgress.phase]);

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
      // Update progress: Parsing
      setImportProgress({ phase: 'parsing', current: 0, total: 0, pendingSync: 0 });
      // Small delay to let UI update
      await new Promise(r => setTimeout(r, 10));

      const data = JSON.parse(text);

      // Check if this is a Vue export
      const isVueExport = data.source === 'vue-firebase-expense-tracker';

      // Track valid category IDs to prevent FK violations
      const validCategoryIds = new Set<string>();

      // Helper to ensure fallback category exists
      let fallbackCategoryId: string | null = null;
      const ensureFallbackCategory = async (): Promise<string> => {
        if (fallbackCategoryId) return fallbackCategoryId;

        // Check if already imported or exists
        const existingFallback = await db.categories.where('name').equalsIgnoreCase('Uncategorized').first();
        if (existingFallback) {
          fallbackCategoryId = existingFallback.id;
          validCategoryIds.add(existingFallback.id);
          return existingFallback.id;
        }

        // Create new
        const newFallbackId = uuidv4();
        const fallbackCat: Category = {
          id: newFallbackId,
          user_id: user.id,
          name: "Uncategorized",
          icon: "HelpCircle",
          color: "#94a3b8", // slate-400
          type: "expense",
          active: 1,
          deleted_at: null,
          pendingSync: 1
        };
        await db.categories.put(fallbackCat);
        fallbackCategoryId = newFallbackId;
        validCategoryIds.add(newFallbackId);
        return newFallbackId;
      };

      if (isVueExport) {
        // VUE MIGRATION LOGIC
        console.log("Starting migration from Vue export...");

        // Calculate total items to import
        const totalItems =
          (data.data.categories?.length || 0) +
          (data.data.transactions?.length || 0) +
          (data.data.recurringExpenses?.length || 0);

        setImportProgress({ phase: 'importing', current: 0, total: totalItems, pendingSync: 0 });

        let importedTransactions = 0;
        let importedCategories = 0;
        let importedRecurring = 0;
        let importedBudgets = 0;
        let iconsNotPreserved = 0;
        let orphansDetected = 0;
        let processedItems = 0;

        // 1. Import Categories
        const categoryIdMap = new Map<string, string>(); // Old Firebase ID -> New UUID

        if (data.data.categories && Array.isArray(data.data.categories)) {
          for (const vueCat of data.data.categories) {
            // Update progress occasionally
            processedItems++;
            if (processedItems % 5 === 0) {
              setImportProgress(prev => ({ ...prev, current: processedItems }));
              await new Promise(r => setTimeout(r, 0)); // Yield to main thread
            }

            // Map type: 1=expense, 2=income, 3=investment
            let type: "expense" | "income" | "investment" = "expense";
            if (vueCat.type === 2) type = "income";
            if (vueCat.type === 3) type = "investment";

            // Validate icon - use fallback if not supported
            const originalIcon = vueCat.icon;
            const validatedIcon = validateIcon(originalIcon);
            if (originalIcon && originalIcon !== validatedIcon) {
              iconsNotPreserved++;
              console.log(`Icon "${originalIcon}" not supported, using fallback "${validatedIcon}" for category "${vueCat.title}"`);
            }

            // Generate NEW UUID
            const newId = uuidv4();
            if (vueCat.id) categoryIdMap.set(vueCat.id, newId);

            // Resolve Parent
            const newParentId = vueCat.parentCategoryId ? categoryIdMap.get(vueCat.parentCategoryId) : undefined;

            const category: Category = {
              id: newId,
              user_id: user.id,
              name: vueCat.title,
              icon: validatedIcon,
              color: vueCat.color || "#6366f1",
              type: type,
              parent_id: newParentId,
              active: vueCat.active ? 1 : 0,
              deleted_at: null,
              pendingSync: 1,
            };

            await db.categories.put(category);
            validCategoryIds.add(newId); // Track valid NEW ID
            importedCategories++;

            // Handle Budget (move to category_budgets table)
            if (vueCat.budget && vueCat.budget > 0) {
              const budget: CategoryBudget = {
                id: uuidv4(),
                user_id: user.id,
                category_id: newId, // Use new ID
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
            processedItems++;
            if (processedItems % 10 === 0) {
              setImportProgress(prev => ({ ...prev, current: processedItems }));
              await new Promise(r => setTimeout(r, 0));
            }

            // Infer type from category if possible
            // We need to look up the NEW category ID using the map
            let finalCategoryId = "";
            let type: "expense" | "income" | "investment" = "expense";

            if (vueTx.categoryId) {
              const mappedId = categoryIdMap.get(vueTx.categoryId);
              if (mappedId) {
                finalCategoryId = mappedId;
                // Get type from inserted category (or memory if optimizable, but DB is safer source of truth for types)
                const cat = await db.categories.get(mappedId);
                if (cat) type = cat.type;
              } else {
                // Orphan
                console.warn(`Orphan transaction detected! ID: ${vueTx.id}, Missing Category: ${vueTx.categoryId}`);
                finalCategoryId = await ensureFallbackCategory();
                orphansDetected++;
              }
            } else {
              finalCategoryId = await ensureFallbackCategory();
              orphansDetected++;
            }

            const transaction: Transaction = {
              id: uuidv4(), // Always new UUID
              user_id: user.id,
              category_id: finalCategoryId,
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
            processedItems++;
            setImportProgress(prev => ({ ...prev, current: processedItems }));
            await new Promise(r => setTimeout(r, 0));

            // Map frequency
            let frequency: "daily" | "weekly" | "monthly" | "yearly" = "monthly";
            if (vueRec.frequency === "WEEKLY") frequency = "weekly";
            if (vueRec.frequency === "YEARLY") frequency = "yearly";

            // Resolve Category
            let finalCategoryId = "";
            let type: "expense" | "income" | "investment" = "expense";

            if (vueRec.categoryId) {
              const mappedId = categoryIdMap.get(vueRec.categoryId);
              if (mappedId) {
                finalCategoryId = mappedId;
                const cat = await db.categories.get(mappedId);
                if (cat) type = cat.type;
              } else {
                console.warn(`Orphan recurring detected! ID: ${vueRec.id}, Missing Category: ${vueRec.categoryId}`);
                finalCategoryId = await ensureFallbackCategory();
                orphansDetected++;
              }
            } else {
              finalCategoryId = await ensureFallbackCategory();
              orphansDetected++;
            }

            const recurring: RecurringTransaction = {
              id: uuidv4(), // Always new UUID
              user_id: user.id,
              category_id: finalCategoryId,
              type: type, // Derived from category
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
          iconsNotPreserved: iconsNotPreserved,
          orphansDetected: orphansDetected,
          isVueMigration: true
        });
        setShowImportSuccess(true);

      } else {
        // STANDARD IMPORT LOGIC
        // Validate structure (more loosely now as we support partial imports)
        if (!data.transactions && !data.categories && !data.contexts && !data.recurring_transactions) {
          throw new Error(
            "Invalid format: must contain at least one data type (transactions, categories, contexts, etc.)"
          );
        }

        let importedTransactions = 0;
        let importedCategories = 0;
        let importedContexts = 0;
        let importedRecurring = 0;
        let importedBudgets = 0;
        let iconsNotPreserved = 0;
        let orphansDetected = 0;

        // ID Mappings: Old ID -> New ID (or Existing ID)
        const categoryIdMap = new Map<string, string>();
        const contextIdMap = new Map<string, string>();

        const totalItems =
          (data.categories?.length || 0) +
          (data.transactions?.length || 0) +
          (data.contexts?.length || 0) +
          (data.recurring_transactions?.length || 0) +
          (data.category_budgets?.length || 0);

        setImportProgress({ phase: 'importing', current: 0, total: totalItems, pendingSync: 0 });
        let processedItems = 0;

        // 1. Import Contexts (Merge by Name)
        if (data.contexts && Array.isArray(data.contexts)) {
          for (const ctx of data.contexts) {
            processedItems++;
            if (processedItems % 5 === 0) {
              setImportProgress(prev => ({ ...prev, current: processedItems }));
              await new Promise(r => setTimeout(r, 0));
            }

            // Check if context with same name exists
            const existingCtx = await db.contexts
              .where({ name: ctx.name, user_id: user.id })
              .first();

            if (existingCtx) {
              // Map old ID to existing ID
              if (ctx.id) contextIdMap.set(ctx.id, existingCtx.id);
            } else {
              // Create new
              const newId = uuidv4();
              if (ctx.id) contextIdMap.set(ctx.id, newId);

              await db.contexts.put({
                id: newId,
                user_id: user.id,
                name: ctx.name,
                description: ctx.description,
                active: 1,
                deleted_at: null,
                pendingSync: 1
              });
              importedContexts++;
            }
          }
        }

        // 2. Import Categories (Merge by Name)
        // First pass: create map and identify potential merges
        // Second pass: insert new ones. 
        // We do this in one loop if we are careful about parents. 
        // Actually, for parents to work, we need to map all IDs first? 
        // If "Merge by Name", we might need to check if parent exists too.
        // Let's do a "Map Preparation" pass for Categories if we want to support self-referential parent_ids in random order.
        // But typically imports are ordered or we can just do 2 passes.

        // Let's stick to the robust 2-pass approach from previous step, but adding "Check DB"

        // Pre-load all existing categories for fast lookup? Or query one by one? 
        // Querying one by one is safer for memory if many cats, but slower. 
        // Given < 100 cats usually, let's just query.

        if (data.categories && Array.isArray(data.categories)) {
          // Pass 1: Build Map (Check existing names)
          for (const cat of data.categories) {
            if (!cat.id) continue;

            const existingCat = await db.categories
              .where({ name: cat.name, user_id: user.id })
              .first();

            if (existingCat) {
              categoryIdMap.set(cat.id, existingCat.id);
            } else {
              // Will need to create new
              categoryIdMap.set(cat.id, uuidv4());
            }
          }

          // Pass 2: Insert New
          for (const cat of data.categories) {
            processedItems++;
            if (processedItems % 5 === 0) setImportProgress(prev => ({ ...prev, current: processedItems }));

            const mappedId = categoryIdMap.get(cat.id);
            if (!mappedId) continue; // Should not happen

            // Check if it was mapped to existing DB item
            const existsInDb = await db.categories.get(mappedId);

            if (!existsInDb) {
              // We need to insert it
              // Validate icon
              const originalIcon = cat.icon;
              const validatedIcon = validateIcon(originalIcon);
              if (originalIcon && originalIcon !== validatedIcon) {
                iconsNotPreserved++;
              }

              // Resolve Parent
              let newParentId = undefined;
              if (cat.parent_id) {
                newParentId = categoryIdMap.get(cat.parent_id);
                // If not found in map, maybe it's in DB (orphaned reference?) 
                // If not in map, we drop it.
              }

              await db.categories.put({
                id: mappedId,
                user_id: user.id,
                name: cat.name,
                icon: validatedIcon,
                color: cat.color || "#6366f1",
                type: cat.type || "expense",
                parent_id: newParentId,
                active: 1,
                deleted_at: null,
                pendingSync: 1,
              });
              importedCategories++;
            }

            validCategoryIds.add(mappedId);
          }
        }

        // 3. Category Budgets
        if (data.category_budgets && Array.isArray(data.category_budgets)) {
          for (const budget of data.category_budgets) {
            processedItems++;
            setImportProgress(prev => ({ ...prev, current: processedItems }));

            const mappedCatId = categoryIdMap.get(budget.category_id);
            if (!mappedCatId) continue; // Skip if category not found

            // Always create new budget entry to avoid complex merge logic for now, 
            // unless we want to overwrite existing budget for that category?
            // "Merge by Category" -> if budget exists for this cat, update it.
            const existingBudget = await db.category_budgets
              .where('category_id').equals(mappedCatId)
              .first();

            if (existingBudget) {
              // Update existing
              await db.category_budgets.update(existingBudget.id, {
                amount: budget.amount,
                period: budget.period,
                pendingSync: 1,
                updated_at: new Date().toISOString()
              });
              // We count this as imported? sure.
              importedBudgets++;
            } else {
              // Create new
              await db.category_budgets.put({
                id: uuidv4(),
                user_id: user.id,
                category_id: mappedCatId,
                amount: budget.amount,
                period: budget.period,
                deleted_at: null,
                pendingSync: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
              importedBudgets++;
            }
          }
        }

        // 4. Recurring Transactions
        if (data.recurring_transactions && Array.isArray(data.recurring_transactions)) {
          for (const rec of data.recurring_transactions) {
            processedItems++;
            setImportProgress(prev => ({ ...prev, current: processedItems }));

            // Resolve FKs
            const catId = categoryIdMap.get(rec.category_id);
            // If category not found, use fallback
            let finalCatId = catId;
            if (!finalCatId) {
              finalCatId = await ensureFallbackCategory();
              orphansDetected++;
            }

            const ctxId = rec.context_id ? contextIdMap.get(rec.context_id) : undefined;

            // Always create new recurring transaction (hard to merge by "similarity")
            await db.recurring_transactions.put({
              id: uuidv4(),
              user_id: user.id,
              category_id: finalCatId,
              context_id: ctxId,
              type: rec.type,
              amount: parseFloat(rec.amount),
              description: rec.description,
              frequency: rec.frequency,
              start_date: rec.start_date,
              end_date: rec.end_date,
              active: rec.active !== undefined ? rec.active : 1,
              deleted_at: null,
              pendingSync: 1,
              // Group stuff?
              group_id: null, // Reset group for safety
              paid_by_member_id: null
            });
            importedRecurring++;
          }
        }

        // 5. Transactions
        if (data.transactions && Array.isArray(data.transactions)) {
          for (const tx of data.transactions) {
            processedItems++;
            if (processedItems % 10 === 0) {
              setImportProgress(prev => ({ ...prev, current: processedItems }));
              await new Promise(r => setTimeout(r, 0));
            }

            // Resolve FKs
            let finalCategoryId = "";
            if (tx.category_id) {
              const mapped = categoryIdMap.get(tx.category_id);
              if (mapped) finalCategoryId = mapped;
              else {
                finalCategoryId = await ensureFallbackCategory();
                orphansDetected++;
              }
            } else {
              finalCategoryId = await ensureFallbackCategory();
              orphansDetected++;
            }

            const finalContextId = tx.context_id ? contextIdMap.get(tx.context_id) : undefined;

            const transaction: Transaction = {
              id: uuidv4(), // Always new ID
              user_id: user.id,
              category_id: finalCategoryId,
              context_id: finalContextId,
              type: tx.type || "expense",
              amount: parseFloat(tx.amount) || 0,
              date: tx.date || new Date().toISOString().split("T")[0],
              year_month:
                tx.date?.substring(0, 7) ||
                new Date().toISOString().substring(0, 7),
              description: tx.description || "",
              group_id: null, // Reset group
              paid_by_member_id: null,
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
          recurring: importedRecurring,
          budgets: importedBudgets,
          iconsNotPreserved: iconsNotPreserved,
          orphansDetected: orphansDetected,
          isVueMigration: false
        });
        setShowImportSuccess(true);
      }

      // Update phase to syncing
      // Recalculate pending sync count
      const tables = [db.transactions, db.categories, db.contexts, db.recurring_transactions, db.category_budgets];
      let pendingCount = 0;
      for (const table of tables) {
        pendingCount += await table.where('pendingSync').equals(1).count();
      }

      setImportProgress({ phase: 'syncing', current: 0, total: 0, pendingSync: pendingCount });

      // Sync to server
      await safeSync("handleImportData");
      setImportProgress({ phase: 'complete', current: 0, total: 0, pendingSync: 0 });
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(t("import_error") || `Import failed: ${error.message}`);
    } finally {
      setImportingData(false);
      // Reset progress after a short delay if not successful (success dialog handles its own flow)
      if (!showImportSuccess) {
        setImportProgress({ phase: 'idle', current: 0, total: 0, pendingSync: 0 });
      }
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
        `Exported ${transactions.length} tx, ${categories.length} cat, ${recurring.length} recurring`
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
        <ContentLoader variant="card" count={1} />
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
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
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

              {/* Warning for unsupported icons */}
              {importStats.iconsNotPreserved > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    {t("icons_not_preserved_warning", { count: importStats.iconsNotPreserved }) ||
                      `${importStats.iconsNotPreserved} ${importStats.iconsNotPreserved === 1 ? "category had an unsupported icon" : "categories had unsupported icons"} and ${importStats.iconsNotPreserved === 1 ? "was" : "were"} assigned a default icon.`}
                  </span>
                </div>
              )}

              {/* Warning for orphaned items */}
              {importStats.orphansDetected > 0 && (
                <div className="flex items-start gap-2 p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    {t("orphaned_warning", { count: importStats.orphansDetected }) ||
                      `Warning: ${importStats.orphansDetected} item(s) had missing categories and were moved to 'Uncategorized'.`}
                  </span>
                </div>
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

      {/* Progress Dialog */}
      <Dialog open={importProgress.phase !== 'idle' && importProgress.phase !== 'complete'} onOpenChange={() => {
        // Prevent closing while importing
        if (importProgress.phase === 'complete') {
          setImportProgress({ phase: 'idle', current: 0, total: 0, pendingSync: 0 });
        }
      }}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>
              {importProgress.phase === 'syncing'
                ? (t('syncing') || "Syncing data...")
                : (t('import_data') || "Import Data")}
            </DialogTitle>
            <DialogDescription>
              {importProgress.phase === 'parsing' && (t('loading') || "Loading...")}
              {importProgress.phase === 'importing' && t('import_processing', {
                current: importProgress.current,
                total: importProgress.total,
                defaultValue: `Importing... ${importProgress.current}/${importProgress.total}`
              })}
              {importProgress.phase === 'syncing' && t('sync_in_progress', {
                pending: importProgress.pendingSync,
                defaultValue: `Syncing with cloud... ${importProgress.pendingSync} items remaining`
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {importProgress.phase === 'importing' && (
              <Progress value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0} />
            )}
            {importProgress.phase === 'syncing' && (
              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground text-center">
                  {t('offline_banner_message') || "Changes will sync when connected"}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
