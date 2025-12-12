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
