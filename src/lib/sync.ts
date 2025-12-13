/**
 * @fileoverview Bidirectional sync engine for local-first offline support.
 *
 * Implements a robust synchronization strategy between IndexedDB (local) and
 * Supabase (remote) with:
 * - Exponential backoff retry logic for transient failures
 * - Batch processing to avoid overwhelming the server
 * - Error quarantine for persistently failing items
 * - Last-write-wins conflict resolution
 * - Delta sync using server-assigned sync tokens
 *
 * @module lib/sync
 */

import {
  db,
  Group,
  GroupMember,
  Transaction,
  Category,
  Context,
  RecurringTransaction,
  CategoryBudget,
  Profile,
  Setting,
} from "./db";
import { processRecurringTransactions } from "./recurring";
import { supabase } from "./supabase";
import { Tables, TablesInsert } from "../types/supabase";
import { toast } from "sonner";
import i18n from "@/i18n";
import { UNCATEGORIZED_CATEGORY } from "./constants";
import {
  encryptFields,
  decryptFields,
  ENCRYPTED_FIELDS,
} from "./crypto-middleware";

const TABLES = [
  "profiles",
  "groups",
  "group_members",
  "contexts",
  "categories",
  "transactions",
  "recurring_transactions",
  "category_budgets",
] as const;

type TableName = (typeof TABLES)[number];

type LocalTableMap = {
  groups: Group;
  group_members: GroupMember;
  transactions: Transaction;
  categories: Category;
  contexts: Context;
  recurring_transactions: RecurringTransaction;
  category_budgets: CategoryBudget;
  profiles: Profile;
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_LIMIT = 1000;

const SYNC_CONFIG = {
  /** Maximum retry attempts for a single item */
  maxRetries: 3,
  /** Base delay for exponential backoff (ms) */
  baseRetryDelay: 1000,
  /** Maximum delay between retries (ms) */
  maxRetryDelay: 30000,
  /** Batch size for pushing items */
  batchSize: 50,
  /** Items that fail more than this many times are quarantined */
  quarantineThreshold: 5,
  /** Delay for debounced push (ms) - 0 for immediate sync when online */
  pushDelay: 0,
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface SyncError {
  id: string;
  table: TableName;
  operation: "push" | "pull";
  error: string;
  attempts: number;
  lastAttempt: string;
  isQuarantined: boolean;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: string | null;
  pendingCount: number;
  errorCount: number;
  errors: SyncError[];
  initialSyncComplete: boolean;
}

type SyncListener = (status: SyncStatus) => void;

// ============================================================================
// SYNC MANAGER
// ============================================================================

export class SyncManager {
  private isSyncing = false;
  private lastSyncAt: string | null = null;
  private syncListeners: Set<SyncListener> = new Set();
  private errorMap: Map<string, SyncError> = new Map();
  private pushTimer: NodeJS.Timeout | null = null;
  private initialSyncComplete = false;
  private onLogout: (() => void) | null = null;

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Schedule a push of pending changes with debounce.
   * Used to batch multiple local changes into a single network request.
   */
  schedulePush(): void {
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
    }

    console.log(`[Sync] Scheduling push in ${SYNC_CONFIG.pushDelay}ms...`);

    this.pushTimer = setTimeout(() => {
      console.log("[Sync] Push timer fired");
      this.pushOnly();
      this.pushTimer = null;
    }, SYNC_CONFIG.pushDelay);
  }

  /**
   * Register a callback to be invoked when a 403 Forbidden error occurs.
   * This allows the AuthProvider to handle the actual logout.
   */
  registerLogoutHandler(callback: () => void): void {
    this.onLogout = callback;
  }

  /**
   * Main sync function - pushes local changes then pulls remote changes.
   * Implements retry logic with exponential backoff for failed items.
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log("[Sync] Already syncing, skipping...");
      return;
    }

    // Clear any pending scheduled push since we are syncing now
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError && authError.status === 403) {
        console.error("[Sync] 403 Forbidden during sync - triggering logout");
        if (this.onLogout) this.onLogout();
        return;
      }

      if (!user) {
        console.log("[Sync] No user, skipping sync");
        return;
      }

      console.log("[Sync] Starting sync...");

      // Push local changes with retry
      await this.pushPendingWithRetry(user.id);

      // Pull remote changes
      await this.pullDelta(user.id);

      // Pull user settings (separate table with different structure)
      await this.pullUserSettings(user.id);

      this.lastSyncAt = new Date().toISOString();
      this.initialSyncComplete = true;
      console.log("[Sync] Sync completed successfully");
    } catch (error) {
      console.error("[Sync] Sync failed:", error);

      // Show error toast to user
      toast.error(
        i18n.t("sync_error_title", { defaultValue: "Sync Failed" }),
        {
          description: i18n.t("sync_error_description", {
            defaultValue: "Could not sync your data. Changes are saved locally and will sync when online.",
          }),
          duration: 6000,
        }
      );
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Push only - for when Realtime handles pulls
   */
  async pushOnly(): Promise<void> {
    if (this.isSyncing) return;

    // Clear any pending scheduled push since we are pushing now
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError && authError.status === 403) {
        console.error("[Sync] 403 Forbidden during push - triggering logout");
        if (this.onLogout) this.onLogout();
        return;
      }

      if (!user) return;

      console.log("[Sync] Pushing pending changes...");
      await this.pushPendingWithRetry(user.id);
      console.log("[Sync] Push completed");
    } catch (error) {
      console.error("[Sync] Push failed:", error);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Full sync - ignores sync_token and pulls ALL data from server.
   * Use this when data seems out of sync or after direct database modifications.
   * This will overwrite local data with server data (except pending local changes).
   */
  async fullSync(): Promise<void> {
    if (this.isSyncing) {
      console.log("[Sync] Already syncing, skipping...");
      return;
    }

    // Clear any pending scheduled push since we are syncing now
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError && authError.status === 403) {
        console.error("[Sync] 403 Forbidden during full sync - triggering logout");
        if (this.onLogout) this.onLogout();
        return;
      }

      if (!user) {
        console.log("[Sync] No user, skipping full sync");
        return;
      }

      console.log("[Sync] Starting FULL sync (ignoring sync_token)...");

      // Push local changes first
      await this.pushPendingWithRetry(user.id);

      // Pull ALL remote changes (ignoring sync_token)
      await this.pullAll(user.id);

      // Pull user settings (separate table with different structure)
      await this.pullUserSettings(user.id);

      this.lastSyncAt = new Date().toISOString();
      this.initialSyncComplete = true;
      console.log("[Sync] Full sync completed successfully");
    } catch (error) {
      console.error("[Sync] Full sync failed:", error);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncChange(callback: SyncListener): () => void {
    this.syncListeners.add(callback);
    // Immediately notify with current status
    this.getStatus().then((status) => callback(status));
    return () => this.syncListeners.delete(callback);
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatus> {
    return {
      isSyncing: this.isSyncing,
      lastSyncAt: this.lastSyncAt,
      pendingCount: await this.getPendingCount(),
      errorCount: this.errorMap.size,
      errors: Array.from(this.errorMap.values()),
      initialSyncComplete: this.initialSyncComplete,
    };
  }

  /**
   * Clear a specific error from the error map (retry single item)
   */
  async retryError(errorKey: string): Promise<void> {
    const error = this.errorMap.get(errorKey);
    if (!error) return;

    // Reset the error and trigger sync
    this.errorMap.delete(errorKey);
    this.notifyListeners();
    await this.sync();
  }

  /**
   * Clear all errors and retry sync
   */
  async retryAllErrors(): Promise<void> {
    this.errorMap.clear();
    this.notifyListeners();
    await this.sync();
  }

  /**
   * Get count of pending items across all tables
   */
  private async getPendingCount(): Promise<number> {
    let total = 0;

    for (const tableName of TABLES) {
      const count = await db
        .table(tableName)
        .where("pendingSync")
        .equals(1)
        .count();
      total += count;
    }

    return total;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async notifyListeners(): Promise<void> {
    const status = await this.getStatus();
    this.syncListeners.forEach((cb) => {
      try {
        cb(status);
      } catch (e) {
        console.error("[Sync] Listener error:", e);
      }
    });
  }

  /**
   * Calculate delay for exponential backoff
   */
  private getRetryDelay(attempt: number): number {
    const delay = SYNC_CONFIG.baseRetryDelay * Math.pow(2, attempt);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return Math.min(delay + jitter, SYNC_CONFIG.maxRetryDelay);
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Push all pending local changes to Supabase with retry logic
   */
  private async pushPendingWithRetry(userId: string): Promise<void> {
    for (const tableName of TABLES) {
      const table = db.table(tableName);
      let pendingItems = await table.where("pendingSync").equals(1).toArray();

      if (pendingItems.length === 0) continue;

      // Special handling for categories: Ensure topological sort (Parents before Children)
      if (tableName === "categories") {
        pendingItems = this.sortCategoriesTopologically(pendingItems as Category[]);
      }

      // Guard: Filter out transactions/recurring with UNCATEGORIZED_CATEGORY
      // These cannot sync as the category doesn't exist in remote DB
      if (tableName === "transactions" || tableName === "recurring_transactions") {
        const originalCount = pendingItems.length;
        pendingItems = pendingItems.filter(
          (item: any) => item.category_id !== UNCATEGORIZED_CATEGORY.ID
        );
        const skippedCount = originalCount - pendingItems.length;
        if (skippedCount > 0) {
          console.log(
            `[Sync] Skipping ${skippedCount} ${tableName} with uncategorized category (need user review)`
          );
        }
      }

      console.log(
        `[Sync] Pushing ${pendingItems.length} items to ${tableName}`
      );

      // Process in batches to avoid overwhelming the server
      for (let i = 0; i < pendingItems.length; i += SYNC_CONFIG.batchSize) {
        const batch = pendingItems.slice(i, i + SYNC_CONFIG.batchSize);
        await this.pushBatchWithRetry(tableName, batch, userId);
      }
    }
  }

  /**
   * Push a batch of items with retry logic
   */
  private async pushBatchWithRetry<T extends TableName>(
    tableName: T,
    items: LocalTableMap[T][],
    userId: string
  ): Promise<void> {
    // Decrypt items before pushing to server (data is stored encrypted locally)
    const decryptedItems = await Promise.all(
      items.map((item) => this.decryptItemForPush(item, tableName))
    );
    const itemsToPush = decryptedItems.map((item) =>
      this.prepareItemForPush(item, tableName, userId)
    );

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < SYNC_CONFIG.maxRetries; attempt++) {
      try {
        // Use .select() to get the updated server data immediately (including new sync_token)
        const { data, error } = await supabase
          .from(tableName)
          .upsert(itemsToPush as any)
          .select();

        if (error) {
          throw new Error(error.message);
        }

        // Success - update local items with server data (sync_token, updated_at, etc.)
        if (data) {
          await db.transaction("rw", db.table(tableName), async () => {
            for (const serverItem of data) {
              const item = serverItem as any;
              // Prepare item for local storage (handles type conversions and encryption)
              const localUpdate = await this.prepareItemForLocal(item, tableName);

              // Update local DB ensuring pendingSync is 0
              await db.table(tableName).update(item.id, {
                ...localUpdate,
                pendingSync: 0,
              });

              // Clear any previous errors for this item
              this.errorMap.delete(`${tableName}:${item.id}`);
            }
          });
        }

        return; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[Sync] Attempt ${attempt + 1}/${SYNC_CONFIG.maxRetries
          } failed for ${tableName}:`,
          error
        );

        if (attempt < SYNC_CONFIG.maxRetries - 1) {
          const delay = this.getRetryDelay(attempt);
          console.log(`[Sync] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed - track errors for each item
    console.error(
      `[Sync] Failed to push ${items.length} items to ${tableName} after ${SYNC_CONFIG.maxRetries} attempts`
    );

    for (const item of items) {
      const errorKey = `${tableName}:${item.id}`;
      const existingError = this.errorMap.get(errorKey);
      const attempts = (existingError?.attempts || 0) + 1;

      this.errorMap.set(errorKey, {
        id: item.id,
        table: tableName,
        operation: "push",
        error: lastError?.message || "Unknown error",
        attempts,
        lastAttempt: new Date().toISOString(),
        isQuarantined: attempts >= SYNC_CONFIG.quarantineThreshold,
      });
    }
  }

  /**
   * Prepare an item for pushing to Supabase
   */
  private prepareItemForPush<T extends TableName>(
    item: LocalTableMap[T],
    tableName: T,
    userId: string
  ): TablesInsert<T> {
    // Remove local-only fields
    const itemCopy = { ...item } as any;
    delete itemCopy.pendingSync;
    delete itemCopy.year_month;

    const pushItem = {
      ...itemCopy,
      updated_at: new Date().toISOString(),
    };

    // Add user_id only if the table uses it (not groups)
    if (tableName !== "groups" && tableName !== "group_members") {
      pushItem.user_id = userId;
    }

    // Cast to unknown first to avoid type overlap issues, then to TablesInsert<T>
    // This is safe because we're constructing a valid insert object based on the schema
    return pushItem as unknown as TablesInsert<T>;
  }

  /**
   * Sort categories topologically so that parents appear before children.
   * This prevents foreign key violations during sync.
   */
  private sortCategoriesTopologically(categories: Category[]): Category[] {
    const sorted: Category[] = [];
    const visited = new Set<string>();
    const processing = new Set<string>();
    const categoryMap = new Map<string, Category>();

    // Index by ID
    categories.forEach(c => categoryMap.set(c.id, c));

    const visit = (category: Category) => {
      if (visited.has(category.id)) return;
      if (processing.has(category.id)) {
        // Cycle detected (should not happen in valid tree), just push to break
        console.warn(`[Sync] Cycle detected for category ${category.name} (${category.id})`);
        return;
      }

      processing.add(category.id);

      // Visit parent first
      if (category.parent_id) {
        // If parent is in the CURRENT batch, visit it first
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          visit(parent);
        }
        // If parent is not in this batch, we assume it's already synced or invalid.
        // We proceed.
      }

      processing.delete(category.id);
      visited.add(category.id);
      sorted.push(category);
    };

    categories.forEach(category => visit(category));

    return sorted;
  }

  /**
   * Pull changes from Supabase that are newer than our last sync token.
   */
  private async pullDelta(userId: string): Promise<void> {
    const userSettings = await db.user_settings.get(userId);
    const lastSyncToken = userSettings?.last_sync_token || 0;
    let maxToken = lastSyncToken;
    const newGroupTransactions: any[] = [];

    for (const tableName of TABLES) {
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select("*")
            .gt("sync_token", lastSyncToken)
            .order("sync_token", { ascending: true })
            .range(page * SUPABASE_LIMIT, (page + 1) * SUPABASE_LIMIT - 1);

          if (error) {
            console.error(`[Sync] Failed to pull ${tableName}:`, error);
            this.trackPullError(tableName, error.message);
            hasMore = false; // Stop on error
            continue;
          }

          if (!data || data.length === 0) {
            hasMore = false;
            continue;
          }

          console.log(`[Sync] Pulled ${data.length} items from ${tableName}`);

          const tables = [db.table(tableName)];
          if (tableName === "transactions") {
            tables.push(db.group_members);
          }

          await db.transaction("rw", tables, async () => {
            for (const item of data) {
              const updateResult = await this.shouldUpdateLocal(tableName, item);

              if (!updateResult.shouldUpdate) {
                // Only log conflicts (pending changes), skip silent for already-synced items
                if (updateResult.reason === 'pending') {
                  console.log(
                    `[Sync] Conflict: ${tableName} ${item.id} has pending local changes`
                  );
                }
                // Don't log 'already_synced' - too noisy for normal operation
                continue;
              }

              // Track new group transactions for toast notification
              if (
                tableName === "transactions" &&
                "group_id" in item &&
                item.group_id &&
                "user_id" in item &&
                item.user_id !== userId
              ) {
                // Check if I am a member of this group
                const membership = await db.group_members
                  .where("group_id")
                  .equals(item.group_id as string)
                  .and((m: any) => m.user_id === userId && !m.removed_at)
                  .first();

                if (membership) {
                  newGroupTransactions.push(item);
                }
              }

              // Prepare item for local storage (type conversions + encryption)
              const localItem = await this.prepareItemForLocal(item, tableName);
              await db.table(tableName).put(localItem);

              if ((item.sync_token || 0) > maxToken) {
                maxToken = item.sync_token || 0;
              }
            }
          });

          // Check if we need to fetch more pages
          if (data.length < SUPABASE_LIMIT) {
            hasMore = false;
          } else {
            page++;
            console.log(`[Sync] Fetching next page for ${tableName} (page ${page})...`);
          }
        } catch (error) {
          console.error(`[Sync] Error pulling ${tableName}:`, error);
          this.trackPullError(tableName, (error as Error).message);
          hasMore = false; // Stop on error
        }
      }

      // Update last sync token
      if (maxToken > lastSyncToken) {
        console.log(`[Sync] Updating last_sync_token to ${maxToken} after processing ${tableName}`);
        await this.updateLastSyncToken(userId, maxToken, userSettings);
      }

      // Show toast notification for new and modified group transactions  
      await this.showGroupTransactionToast(newGroupTransactions, "new");
      const modifiedGroupTransactions: any[] = []; // Track modified separately if needed
      await this.showGroupTransactionToast(modifiedGroupTransactions, "modified");

      // Process recurring transactions
      const addedCount = await processRecurringTransactions();
      if (addedCount > 0) {
        toast.success(
          i18n.t("recurring_expenses_added", {
            count: addedCount,
            defaultValue: "{{count}} recurring expenses added",
          })
        );
      }
    }
  }

  /**
   * Pull ALL data from Supabase, ignoring sync_token.
   * Used for full sync when data might be out of sync.
   */
  private async pullAll(userId: string): Promise<void> {
    let maxToken = 0;
    const newGroupTransactions: any[] = [];
    const modifiedGroupTransactions: any[] = [];

    for (const tableName of TABLES) {
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        try {
          // Query ALL data, no sync_token filter
          const { data, error } = await supabase
            .from(tableName)
            .select("*")
            .order("sync_token", { ascending: true })
            .range(page * SUPABASE_LIMIT, (page + 1) * SUPABASE_LIMIT - 1);

          if (error) {
            console.error(`[Sync] Failed to pull all ${tableName}:`, error);
            this.trackPullError(tableName, error.message);
            continue;
          }

          if (!data || data.length === 0) {
            console.log(`[Sync] No data in ${tableName}`);
            hasMore = false;
            continue;
          }

          console.log(`[Sync] Full pull: ${data.length} items from ${tableName}`);

          const tables = [db.table(tableName)];
          if (tableName === "transactions") {
            tables.push(db.group_members);
          }

          await db.transaction("rw", tables, async () => {
            for (const item of data) {
              const updateResult = await this.shouldUpdateLocal(tableName, item);

              if (!updateResult.shouldUpdate) {
                // Only log conflicts (pending changes), skip silent for already-synced items
                if (updateResult.reason === 'pending') {
                  console.log(
                    `[Sync] Conflict: ${tableName} ${item.id} has pending local changes`
                  );
                }
                continue;
              }

              // Track new group transactions for toast notification
              if (
                tableName === "transactions" &&
                "group_id" in item &&
                item.group_id &&
                "user_id" in item &&
                item.user_id !== userId
              ) {
                // Check if I am a member of this group
                const membership = await db.group_members
                  .where("group_id")
                  .equals(item.group_id as string)
                  .and((m: any) => m.user_id === userId && !m.removed_at)
                  .first();

                if (membership) {
                  // Check if this is a new or modified transaction
                  const existingTxn = await db.transactions.get(item.id);
                  if (existingTxn) {
                    modifiedGroupTransactions.push(item);
                  } else {
                    newGroupTransactions.push(item);
                  }
                }
              }

              // Prepare item for local storage (type conversions + encryption)
              const localItem = await this.prepareItemForLocal(item, tableName);
              await db.table(tableName).put(localItem);

              // Track max sync_token for future delta syncs
              if (item.sync_token && item.sync_token > maxToken) {
                maxToken = item.sync_token;
              }
            }
          });

          // Check if we need to fetch more pages
          if (data.length < SUPABASE_LIMIT) {
            hasMore = false;
          } else {
            page++;
            console.log(`[Sync] Full sync: Fetching next page for ${tableName} (page ${page})...`);
          }
        } catch (error) {
          console.error(`[Sync] Error pulling all ${tableName}:`, error);
          this.trackPullError(tableName, (error as Error).message);
          hasMore = false; // Stop on error
        }
      }

      // Update last sync token
      if (maxToken > 0) {
        const userSettings = await db.user_settings.get(userId);
        await this.updateLastSyncToken(userId, maxToken, userSettings);
      }

      // Show toast notification for new and modified group transactions
      await this.showGroupTransactionToast(newGroupTransactions, "new");
      await this.showGroupTransactionToast(modifiedGroupTransactions, "modified");

      // Process recurring transactions
      const addedCount = await processRecurringTransactions();
      if (addedCount > 0) {
        toast.success(
          i18n.t("recurring_expenses_added", {
            count: addedCount,
            defaultValue: "{{count}} recurring expenses added",
          })
        );
      }
    }
  }

  /**
   * Check if we should update local with remote data.
   * Implements last-write-wins conflict resolution.
   * Returns an object with the decision and reason for better logging.
   */
  private async shouldUpdateLocal<T extends TableName>(
    tableName: T,
    remoteItem: Tables<T>
  ): Promise<{ shouldUpdate: boolean; reason: 'new' | 'pending' | 'already_synced' | 'remote_newer' }> {
    const existing = await db.table(tableName).get(remoteItem.id);

    // New item - always accept
    if (!existing) {
      return { shouldUpdate: true, reason: 'new' };
    }

    // Local has pending changes - ALWAYS keep local to avoid overwriting user work
    if (existing.pendingSync === 1) {
      return { shouldUpdate: false, reason: 'pending' };
    }

    // Compare sync tokens - only update if remote has a newer version
    const localToken = existing.sync_token || 0;
    const remoteToken = remoteItem.sync_token || 0;

    if (remoteToken > localToken) {
      return { shouldUpdate: true, reason: 'remote_newer' };
    }

    // Already synced or local is newer - no action needed
    return { shouldUpdate: false, reason: 'already_synced' };
  }

  /**
   * Prepare a remote item for local storage.
   * Normalizes data types that differ between Supabase (PostgreSQL) and IndexedDB.
   * Also encrypts sensitive fields before storing locally.
   */
  private async prepareItemForLocal<T extends TableName>(
    item: Tables<T>,
    tableName: T
  ): Promise<LocalTableMap[T]> {
    const localItem: any = { ...item, pendingSync: 0 };

    // Calculate year_month for transactions
    if (tableName === "transactions" && "date" in item && item.date) {
      localItem.year_month = (item.date as string).substring(0, 7);
    }

    // Normalize boolean -> number for 'active' field
    // Supabase stores as boolean, IndexedDB needs number for indexing
    if ("active" in localItem) {
      localItem.active = localItem.active ? 1 : 0;
    }

    // Encrypt sensitive fields before storing locally
    const fieldsToEncrypt = ENCRYPTED_FIELDS[tableName] || [];
    if (fieldsToEncrypt.length > 0) {
      return encryptFields(localItem, fieldsToEncrypt) as Promise<LocalTableMap[T]>;
    }

    return localItem;
  }

  /**
   * Prepare a local item for decryption before push.
   * Decrypts sensitive fields that were encrypted in local storage.
   */
  private async decryptItemForPush<T extends TableName>(
    item: LocalTableMap[T],
    tableName: T
  ): Promise<LocalTableMap[T]> {
    const fieldsToDecrypt = ENCRYPTED_FIELDS[tableName] || [];
    if (fieldsToDecrypt.length > 0) {
      const decrypted = await decryptFields(item as unknown as Record<string, unknown>, fieldsToDecrypt);
      return decrypted as unknown as LocalTableMap[T];
    }
    return item;
  }

  /**
   * Show toast notification for new group transactions.
   * If one transaction, show full details. If multiple, show summary.
   */
  private async showGroupTransactionToast(
    transactions: any[],
    action: "new" | "modified" = "new"
  ): Promise<void> {
    if (transactions.length === 0) return;

    if (transactions.length === 1) {
      // Single transaction - show detailed toast with user's share
      const txn = transactions[0];
      const group = await db.groups.get(txn.group_id);
      const groupName = group?.name || "Unknown Group";

      // Get current user's membership to calculate their share
      const userId = (await supabase.auth.getUser()).data.user?.id;
      let userShare = 100; // Default to 100% if we can't find membership
      if (userId) {
        const membership = await db.group_members
          .where("group_id")
          .equals(txn.group_id)
          .and((m: any) => m.user_id === userId && !m.removed_at)
          .first();
        if (membership) {
          userShare = membership.share;
        }
      }

      // Calculate user's portion
      const totalAmount = Number(txn.amount);
      const userAmount = (totalAmount * userShare) / 100;

      // Get payer name
      let payerName = "Someone";
      if (txn.paid_by_member_id) {
        const member = await db.group_members.get(txn.paid_by_member_id);
        if (member) {
          if (member.is_guest) {
            payerName = member.guest_name || "Guest";
          } else if (member.user_id) {
            const payerProfile = await db.profiles.get(member.user_id);
            payerName =
              payerProfile?.full_name || payerProfile?.email || "Someone";
          }
        }
      }

      // Get category name for context
      let categoryName = "";
      if (txn.category_id) {
        const category = await db.categories.get(txn.category_id);
        categoryName = category ? ` • ${category.name}` : "";
      }

      // Build description with richer formatting
      const description = [
        `💰 ${i18n.t("total_amount", { defaultValue: "Total" })}: €${totalAmount.toFixed(2)}`,
        `👤 ${i18n.t("your_share", { defaultValue: "Your share" })}: €${userAmount.toFixed(2)} (${userShare}%)`,
        `📝 ${txn.description}${categoryName}`,
      ].join("\n");

      // Different message based on action
      const titleKey = action === "modified"
        ? "modified_group_transaction_from"
        : "new_group_transaction_from";
      const defaultTitle = action === "modified"
        ? "{{payer}} modified a transaction in {{group}}"
        : "{{payer}} added a transaction in {{group}}";

      toast.info(
        `${i18n.t(titleKey, {
          defaultValue: defaultTitle,
          payer: payerName,
          group: groupName,
        })}`,
        {
          description,
          duration: 6000,
        }
      );
    } else {
      // Multiple transactions - show summary with total
      const totalAmount = transactions.reduce(
        (sum, txn) => sum + Number(txn.amount),
        0
      );

      // Group transactions by group
      const groupedByGroup = new Map<string, number>();
      for (const txn of transactions) {
        const count = groupedByGroup.get(txn.group_id) || 0;
        groupedByGroup.set(txn.group_id, count + 1);
      }

      // Get group names
      const groupSummaries: string[] = [];
      for (const [groupId, count] of groupedByGroup.entries()) {
        const group = await db.groups.get(groupId);
        const groupName = group?.name || "Unknown";
        groupSummaries.push(`• ${groupName}: ${count}`);
      }

      const description = [
        `💰 ${i18n.t("total_amount", { defaultValue: "Total" })}: €${totalAmount.toFixed(2)}`,
        ...groupSummaries,
      ].join("\n");

      const titleKey = action === "modified"
        ? "modified_group_transactions"
        : "new_group_transactions";
      const defaultTitle = action === "modified"
        ? "{{count}} modified group transactions"
        : "{{count}} new group transactions";

      toast.info(
        i18n.t(titleKey, {
          defaultValue: defaultTitle,
          count: transactions.length,
        }),
        {
          description,
          duration: 6000,
        }
      );
    }
  }

  /**
   * Track a pull error
   */
  private trackPullError(tableName: TableName, errorMessage: string): void {
    const errorKey = `pull:${tableName}`;
    const existingError = this.errorMap.get(errorKey);
    const attempts = (existingError?.attempts || 0) + 1;

    this.errorMap.set(errorKey, {
      id: tableName,
      table: tableName,
      operation: "pull",
      error: errorMessage,
      attempts,
      lastAttempt: new Date().toISOString(),
      isQuarantined: attempts >= SYNC_CONFIG.quarantineThreshold,
    });
  }

  /**
   * Update the last sync token in user settings
   */
  private async updateLastSyncToken(
    userId: string,
    maxToken: number,
    existingSettings: Setting | undefined
  ): Promise<void> {
    if (existingSettings) {
      await db.user_settings.update(userId, { last_sync_token: maxToken });
    } else {
      // Create settings if not exist
      await db.user_settings.add({
        user_id: userId,
        currency: "EUR",
        language: "en",
        theme: "light",
        accentColor: "slate",
        start_of_week: "monday",
        default_view: "list",
        include_investments_in_expense_totals: false,
        include_group_expenses: false,
        last_sync_token: maxToken,
        updated_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Pull user_settings from Supabase.
   * Settings use user_id as primary key, not id like other tables.
   * Uses last-write-wins based on updated_at timestamp.
   */
  private async pullUserSettings(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("[Sync] Failed to pull user_settings:", error);
        return;
      }

      if (!data) return;

      const localSettings = await db.user_settings.get(userId);

      // Last-write-wins conflict resolution
      if (localSettings) {
        const localTime = localSettings.updated_at
          ? new Date(localSettings.updated_at).getTime()
          : 0;
        const remoteTime = data.updated_at
          ? new Date(data.updated_at).getTime()
          : 0;

        // Skip if local is newer
        if (localTime >= remoteTime) {
          console.log("[Sync] Local settings are newer, skipping pull");
          return;
        }
      }

      // Map Supabase column names to local field names
      const localItem = {
        user_id: data.user_id,
        currency: data.currency || "EUR",
        language: data.language || "en",
        theme: (data.theme as any) || "light",
        accentColor: data.accent_color || "slate", // Map snake_case to camelCase
        start_of_week: (data.start_of_week as any) || "monday",
        default_view: (data.default_view as any) || "list",
        include_investments_in_expense_totals:
          data.include_investments_in_expense_totals || false,
        include_group_expenses: data.include_group_expenses || false,
        monthly_budget: data.monthly_budget,
        cached_month: data.cached_month || undefined,
        last_sync_token: localSettings?.last_sync_token || 0, // Preserve local sync token
        updated_at: data.updated_at || undefined,
      };

      await db.user_settings.put(localItem);
      console.log("[Sync] Pulled user_settings from Supabase");
    } catch (error) {
      console.error("[Sync] Error pulling user_settings:", error);
    }
  }
}

export const syncManager = new SyncManager();

/**
 * Safe wrapper for syncManager.sync() that prevents concurrent sync calls.
 * Use this instead of calling syncManager.sync() directly to avoid race conditions.
 *
 * @param source - Optional source identifier for logging
 * @returns Promise that resolves when sync completes or is skipped
 *
 * @example
 * ```typescript
 * await safeSync("handleManualSync");
 * await safeSync("handleOnline");
 * ```
 */
export async function safeSync(source?: string): Promise<void> {
  const status = await syncManager.getStatus();

  if (status.isSyncing) {
    console.log(
      `[Sync] Already syncing, skipping${source ? ` (source: ${source})` : ""}`
    );
    return;
  }

  console.log(`[Sync] Starting sync${source ? ` (source: ${source})` : ""}`);
  await syncManager.sync();
}
