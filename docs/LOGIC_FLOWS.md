# Logic Flows & Processes

This document details the exact sequence of events for critical application processes.

## 1. Authentication & Boot Process
**Goal**: Show the user their data as fast as possible (Instant Load), even if offline.

**File**: `src/contexts/AuthProvider.tsx`

1.  **App Mounts**: `AuthProvider` initializes.
2.  **Cache Check**: Checks `localStorage` for `expense_tracker_cached_user`.
    *   *Found*: Immediately sets `user` state. App renders the Dashboard. (Time: ~50ms)
    *   *Not Found*: App shows loading spinner.
3.  **Network Check**:
    *   **If Offline**: Stays in "Cached" mode. User can work normally.
    *   **If Online**: Fires `supabase.auth.getSession()` in the background to validate the token.
        *   *Valid*: Updates user state if metadata changed.
        *   *Invalid/Expired*:
            *   If using Cached User: Starts "Session Expired" countdown (5s toast).
            *   If No Cache: Redirects to `/auth`.
4.  **Cleanup**: After 10s, runs `cleanupSoftDeletedRecords()` to retain DB hygiene.

---

## 2. Synchronization Loop
**Goal**: Ensure local data matches server data without conflicts.

**File**: `src/lib/sync.ts`

### The `sync()` function:
1.  **Check Pre-conditions**: Is a sync already running? Is the user logged in?
2.  **PUSH (Local -> Remote)**:
    *   Queries Dexie for all tables where `pendingSync == 1`.
    *   **Topological Sort**: For Categories, ensures Parents are pushed before Children to avoid Foreign Key errors.
    *   **Batching**: Sends items in chunks (Size: 50) to avoid timeouts.
    *   **Retry Logic**: If a push fails, retries 3 times with exponential backoff (1s, 2s, 4s).
    *   *Success*: Updates local record: `pendingSync = 0`.
    *   *Failure*: Marks item in `ErrorMap` (Quarantine).
3.  **PULL (Remote -> Local)**:
    *   Reads `user_settings.last_sync_token`.
    *   Queries Supabase: `SELECT * FROM table WHERE sync_token > last_sync_token`.
    *   **Conflict Resolution**:
        *   Incoming item has `updated_at`. Local item has `updated_at`.
        *   If `Local.pendingSync == 1` AND `Local.updated_at > Remote.updated_at`: **IGNORE Remote**. (Local Unsynced Change wins).
        *   Otherwise: **OVERWRITE Local**.
    *   *Notifications*: If a new Transaction appears in a Shared Group (and I didn't create it), show a Toast notification.
    *   *Completion*: Updates `last_sync_token` in `user_settings`.

---

## 3. Recurring Transactions Logic
**Goal**: Automatically create transactions from templates (e.g., "Netflix Subscription").

**File**: `src/hooks/useAutoGenerate.ts` & `src/lib/recurring.ts`

1.  **Trigger**: Runs on App Mount (inside `ProtectedRoute`) and after every Sync.
2.  **Query**: Fetches active `recurring_transactions` from Dexie.
3.  **Evaluation**: For each template:
    *   Calculates `next_due_date` based on `last_generated` (or `start_date` if never generated) + formula (`frequency`).
    *   *Check*: Is `next_due_date <= TODAY`?
4.  **Generation**:
    *   If due, creates a **NEW** Transaction record in Dexie.
    *   Updates the Template's `last_generated` date to the new transaction date.
    *   *Loop*: Repeats if multiple periods were missed (e.g., app wasn't opened for 3 months -> generates 3 entries).
5.  **Sync**: Since these are new Dexie writes, they get `pendingSync: 1`. The next Sync cycle will push them to the server.

---

## 5. Category Deletion & Migration
**Goal**: Safeguard data integrity when removing categories with associated data.

**File**: `src/pages/Categories.tsx` & `src/components/categories/CategoryMigrationDialog.tsx`

1.  **Conflict Detection**: Before deleting, the system checks for:
    *   Associated Transactions.
    *   Associated Recurring Transactions.
    *   Child Categories (Subcategories).
2.  **Sequential Resolution**:
    *   **Phase 1 (Transactions)**: User must choose to either **Migrate** transactions to a new category or **Delete All** (dangerous action).
    *   **Phase 2 (Subcategories)**: Once transactions are handled, if subcategories exist, the user must decide to move them to the parent level or delete them.
3.  **Execution**:
    *   Updates are performed in a Dexie transaction to ensure atomicity.
    *   `pendingSync` is set for all affected records.

---

## 6. Bank Import Wizard
**Goal**: Flexible CSV/JSON data ingestion with mobile optimization.

**File**: `src/components/import/ImportWizard.tsx`

1.  **File Loading**: Supports JSON (legacy app) and CSV (custom mapping).
2.  **Preview Phase**: Displays a card-based summary of incoming data.
3.  **Mapping Phase**: User maps CSV columns to Transaction fields (Amount, Date, Description).
4.  **Reconciliation**: Categorizes transactions based on keyword matching or manual selection.
5.  **Finalize**: Batch writes validated records to Dexie.

---

## 7. Category Color Semantic Palette
**Goal**: Assign meaningful colors based on category types.

**File**: `src/lib/colors.ts`

1.  **Type-Based Seed**:
    *   `Expense`: Warm colors (Reds/Oranges).
    *   `Income`: Green tones.
    *   `Investment`: Blue/Vibrant Indigo.
2.  **Variation Engine**: Uses a HSL-based generator to produce unique variations for subcategories, ensuring siblings are distinguishable while maintaining type-consistency.

---

## 4. Reset & Clear Data
**Goal**: Handle logout or "Fresh Start".

**File**: `src/lib/db.ts` -> `clearLocalCache()`

1.  User clicks Logout.
2.  **Safety Check**: `useSafeLogout` checks `pendingCount` from Sync Manager.
    *   *Pending Changes*: Shows `SafeLogoutDialog` warning user they will lose unsynced data.
    *   *No Changes*: Proceeds to logout.
3.  If confirmed, `AuthProvider` calls `db.clearLocalCache()`.
4.  **Dexie Truncate**: Runs `table.clear()` on ALL tables.
    *   *Note*: This wipes IndexedDB but leaves Supabase untouched.
5.  `localStorage` cache is cleared.
6.  Redirect to `/auth`.
