# System Architecture

## Philosophy: Local-First & Offline-Capable

PWA GoNuts is built on the **Local-First** principle. This means the application behaves as if the local database is the *primary* database, and the server is merely a backup/synchronization point.

### Why Local-First?
1.  **Zero Latency**: UI interactions (adding a transaction, changing a category) are instant because they only write to IndexedDB.
2.  **Robustness**: The app works perfectly in airplanes, subways, or areas with poor connection.
3.  **Resilience**: Server downtime does not stop the user from managing their finances.

---

## High-Level Diagram

```mermaid
graph TD
    User[User / UI] <-->|Reads & Writes| Dexie[Local DB (Dexie.js)]
    Dexie <-->|Sync Engine| Sync[Sync Manager]
    Sync <-->|REST / Realtime| Supabase[Remote DB (Supabase)]
    
    subgraph Client [Browser / PWA]
        User
        Dexie
        Sync
    end
    
    subgraph Cloud
        Supabase
    end
```

## Core Components

### 1. The Local Database (Dexie.js)
*   **Role**: The Source of Truth for the UI.
*   **Implementation**: `src/lib/db.ts`
*   **Behavior**: ALL reads happening in React components come from here. We generally *never* `await supabase.from(...).select(...)` inside a UI component.
*   **Reactive**: We use `useLiveQuery` which automatically re-renders React components whenever the Dexie data changes (whether changed by the user or by the background sync).

### 2. The Sync Engine
*   **Role**: Keeping Local and Remote in sync.
*   **Implementation**: `src/lib/sync.ts` & `src/hooks/useRealtimeSync.ts`
*   **Strategy**: Hybrid strategy consisting of:
    *   **Push**: Watches for records with `pendingSync: 1` and uploads them (debounced).
    *   **Pull**: On-demand or scheduled delta fetch (watermark: `sync_token`).
    *   **Realtime**: Subscribes via `supabase.channel` to PostgreSQL changes for instant cross-device updates.

### 3. The Auth Provider
*   **Role**: Manages User Identity.
*   **Implementation**: `src/contexts/AuthProvider.tsx`
*   **Behavior**: It creates a "Session" that persists even if offline. If the app boots offline, it uses the cached user object to allow immediate access to the private data in Dexie.

### 4. Application Logic (Hooks)
*   **Role**: The bridge between UI and Data.
*   **Implementation**: `src/hooks/*.ts`
*   **Pattern**: Components use hooks like `useTransactions()`. These hooks encapsulate the `useLiveQuery` logic. The component doesn't know it's talking to IndexedDB; it just gets an array of data that updates automatically.

---

## Data Flow Scenarios

### Scenario A: User Adds a Transaction (Offline)
1.  User clicks "Save".
2.  `useTransactions.addTransaction()` is called.
3.  Record is written to Dexie:
    *   `id`: Generated UUID.
    *   `pendingSync`: **1**.
    *   `sync_token`: null.
4.  UI updates **instantly** (thanks to `useLiveQuery`).
5.  `SyncManager` detects change but sees no network. It waits.

### Scenario B: User Comes Online
1.  `useOnlineSync` detects `window.ononline` event.
2.  Triggers `syncManager.sync()`.
3.  **Push Phase**: Finds the transaction from Scenario A (`pendingSync: 1`).
4.  Sends `INSERT` to Supabase.
5.  Supabase returns the record with a `sync_token` and `created_at`.
6.  `SyncManager` updates the local record:
    *   `pendingSync`: **0**.
    *   `sync_token`: 10542 (example).
    *   `updated_at`: Server timestamp.
7.  **Pull Phase**: Checks if any other devices made changes.

### Scenario C: Another Device Updates a Shared Group
1.  Device B updates a Group Name.
2.  Supabase broadcasts a `postgres_changes` event (`UPDATE`).
3.  Device A (User) receives event via `useRealtimeSync`.
4.  `useRealtimeSync` writes the new name to Dexie.
5.  Dexie fires an event.
6.  UI re-renders with the new Group Name visible.
