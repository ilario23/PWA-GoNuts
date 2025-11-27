import { db } from "./db";
import { supabase } from "./supabase";

const TABLES = [
  "groups",
  "group_members",
  "transactions",
  "categories",
  "contexts",
  "recurring_transactions",
  "category_budgets",
] as const;

type TableName = (typeof TABLES)[number];

// ============================================================================
// CONFIGURATION
// ============================================================================

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

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Main sync function - pushes local changes then pulls remote changes.
   * Implements retry logic with exponential backoff for failed items.
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log("[Sync] Already syncing, skipping...");
      return;
    }
    
    this.isSyncing = true;
    this.notifyListeners();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("[Sync] No user, skipping sync");
        return;
      }

      console.log("[Sync] Starting sync...");
      
      // Push local changes with retry
      await this.pushPendingWithRetry(user.id);
      
      // Pull remote changes
      await this.pullDelta(user.id);
      
      this.lastSyncAt = new Date().toISOString();
      console.log("[Sync] Sync completed successfully");
    } catch (error) {
      console.error("[Sync] Sync failed:", error);
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
    this.isSyncing = true;
    this.notifyListeners();

    try {
      const { data: { user } } = await supabase.auth.getUser();
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
   * Subscribe to sync status changes
   */
  onSyncChange(callback: SyncListener): () => void {
    this.syncListeners.add(callback);
    // Immediately notify with current status
    callback(this.getStatus());
    return () => this.syncListeners.delete(callback);
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return {
      isSyncing: this.isSyncing,
      lastSyncAt: this.lastSyncAt,
      pendingCount: this.getPendingCount(),
      errorCount: this.errorMap.size,
      errors: Array.from(this.errorMap.values()),
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
  private getPendingCount(): number {
    // This is a sync method, so we return 0 if we can't calculate
    // In real use, this would be updated when the db changes
    return 0;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private notifyListeners(): void {
    const status = this.getStatus();
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
      const pendingItems = await table.where("pendingSync").equals(1).toArray();

      if (pendingItems.length === 0) continue;

      console.log(`[Sync] Pushing ${pendingItems.length} items to ${tableName}`);

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
  private async pushBatchWithRetry(
    tableName: TableName,
    items: any[],
    userId: string
  ): Promise<void> {
    const itemsToPush = items.map((item) => this.prepareItemForPush(item, tableName, userId));
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < SYNC_CONFIG.maxRetries; attempt++) {
      try {
        const { error } = await supabase.from(tableName).upsert(itemsToPush);

        if (error) {
          throw new Error(error.message);
        }

        // Success - mark items as synced
        await db.transaction("rw", db.table(tableName), async () => {
          for (const item of items) {
            await db.table(tableName).update(item.id, { pendingSync: 0 });
            // Clear any previous errors for this item
            this.errorMap.delete(`${tableName}:${item.id}`);
          }
        });

        return; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[Sync] Attempt ${attempt + 1}/${SYNC_CONFIG.maxRetries} failed for ${tableName}:`,
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
    console.error(`[Sync] Failed to push ${items.length} items to ${tableName} after ${SYNC_CONFIG.maxRetries} attempts`);
    
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
  private prepareItemForPush(item: any, tableName: TableName, userId: string): any {
    // Remove local-only fields
    const { pendingSync, year_month, ...rest } = item;

    const pushItem = {
      ...rest,
      updated_at: new Date().toISOString(),
    };

    // Add user_id only if the table uses it (not groups)
    if (tableName !== "groups" && tableName !== "group_members") {
      pushItem.user_id = userId;
    }

    return pushItem;
  }

  /**
   * Pull changes from Supabase that are newer than our last sync token.
   */
  private async pullDelta(userId: string): Promise<void> {
    const userSettings = await db.user_settings.get(userId);
    const lastSyncToken = userSettings?.last_sync_token || 0;
    let maxToken = lastSyncToken;

    for (const tableName of TABLES) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select("*")
          .gt("sync_token", lastSyncToken);

        if (error) {
          console.error(`[Sync] Failed to pull ${tableName}:`, error);
          this.trackPullError(tableName, error.message);
          continue;
        }

        if (!data || data.length === 0) continue;

        console.log(`[Sync] Pulled ${data.length} items from ${tableName}`);

        await db.transaction("rw", db.table(tableName), async () => {
          for (const item of data) {
            const shouldUpdate = await this.shouldUpdateLocal(tableName, item);
            
            if (!shouldUpdate) {
              console.log(`[Sync] Skipping ${tableName} ${item.id} - local is newer`);
              continue;
            }

            // Calculate year_month for transactions if missing
            const localItem = this.prepareItemForLocal(item, tableName);
            await db.table(tableName).put(localItem);
            
            if (item.sync_token > maxToken) {
              maxToken = item.sync_token;
            }
          }
        });
      } catch (error) {
        console.error(`[Sync] Error pulling ${tableName}:`, error);
        this.trackPullError(tableName, (error as Error).message);
      }
    }

    // Update last sync token
    if (maxToken > lastSyncToken) {
      await this.updateLastSyncToken(userId, maxToken, userSettings);
    }
  }

  /**
   * Check if we should update local with remote data
   * Implements last-write-wins conflict resolution
   */
  private async shouldUpdateLocal(tableName: TableName, remoteItem: any): Promise<boolean> {
    const existing = await db.table(tableName).get(remoteItem.id);
    
    if (!existing) return true;
    if (existing.pendingSync !== 1) return true;

    // Local has pending changes - compare timestamps
    const localTime = existing.updated_at
      ? new Date(existing.updated_at).getTime()
      : 0;
    const remoteTime = remoteItem.updated_at
      ? new Date(remoteItem.updated_at).getTime()
      : 0;

    return remoteTime > localTime;
  }

  /**
   * Prepare a remote item for local storage
   */
  private prepareItemForLocal(item: any, tableName: TableName): any {
    const localItem = { ...item, pendingSync: 0 };
    
    // Calculate year_month for transactions
    if (tableName === "transactions" && item.date) {
      localItem.year_month = item.date.substring(0, 7);
    }
    
    return localItem;
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
    existingSettings: any
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
}

export const syncManager = new SyncManager();
