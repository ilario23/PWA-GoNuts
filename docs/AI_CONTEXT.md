# pwa-gonuts: Master Knowledge Document

> **For Future AI Models:** This document is your Source of Truth. Read it before analyzing files.

## 1. System Purpose & Vision
**Type:** Offline-First Progressive Web App (PWA) for Financial Tracking.
**Architecture:** **Local-First**.
*   The application functions 100% offline.
*   Data is stored locally in IndexedDB (via Dexie.js).
*   Synchronization with Supabase (PostgreSQL) happens in the background when online.
*   **The UI NEVER waits for the network.**

## 2. The Tech Stack Matrix

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 + Vite | Core application logic and building |
| **Language** | TypeScript | Type safety across the detailed schema |
| **Styling** | Tailwind CSS | Utility-first styling |
| **UI Components** | Radix UI / Shadcn | Accessible, unstyled primitives + styled composition |
| **Local Database** | Dexie.js | Wrapper for IndexedDB (The Source of Truth for UI) |
| **Remote Database** | Supabase | PostgreSQL backend for sync and backup |
| **State Management** | Hybrid | React Context (Auth) + Dexie `useLiveQuery` (Feature Data) |

## 3. The 'Source of Truth' Flow

**CRITICAL:** The UI **NEVER** communicates directly with Supabase for feature data (transactions, categories, etc.).

1.  **Reads:** Components use `useLiveQuery` (from `dexie-react-hooks`) to subscribe to Dexie.js.
    *   *Result:* The UI updates immediately when local data changes, without network latency.
2.  **Writes:** User actions (add transaction, update setting) write directly to Dexie.js.
    *   *Mechanism:* The write sets a `pendingSync: 1` flag on the modified record.
3.  **Sync:** The `SyncManager` (`src/lib/sync.ts`) observes changes and handles the bridge to Supabase.

```mermaid
graph LR
    UI[React Components] <-->|Read/Write| Dexie[IndexedDB (Dexie)]
    Dexie <-->|Background Sync| Sync[SyncManager]
    Sync <-->|REST/Realtime| Supabase[Supabase DB]
```

## 4. Detailed Sync Protocol

**Strategy:** `Last Write Wins` with **Client Priority**.

*   **Push (Client -> Server):**
    *   Items with `pendingSync: 1` are pushed to Supabase.
    *   Uses `upsert` on Supabase (Last Write Wins on server).
    *   On success, `pendingSync` is set to `0` and server-assigned data (like `sync_token`) is saved locally.
*   **Pull (Server -> Client):**
    *   Fetches records with `sync_token > last_sync_token`.
    *   **Client Priority:** If a local record has `pendingSync: 1`, the remote update is **IGNORED** to prevent overwriting unsaved user work.
    *   **Conflict:** If local is pending, it stays pending (will overwrite server on next push).
    *   **Update:** If local is synced (`pendingSync: 0`) and `remote.sync_token > local.sync_token`, the local record is updated.

## 5. Database & Schema Map

### Synced Tables
These tables exist in both Dexie and Supabase and are fully synchronized.
*   `profiles`: User metadata.
*   `groups`: Shared expense groups.
*   `group_members`: Memberships and equity share.
*   `transactions`: Core financial records.
*   `categories`: Income/Expense categories.
*   `contexts`: Tags/Labels (e.g., "Holiday", "Work").
*   `recurring_transactions`: Templates for auto-generation.
*   `category_budgets`: Budget limits per category.
*   `user_settings`: User preferences (Currency, Theme, etc. - synced via special logic).

### Local-Only Tables
These tables exist **ONLY** in Dexie (IndexedDB) on the specific device.
*   `import_rules`: Regex/Matching rules for CSV imports (Device-specific privacy/preference).
*   Note: While defined in `db.ts`, `import_rules` is **NOT** included in the `TABLES` array in `sync.ts`.

## 6. Key Directory Roadmap

*   **`src/components/ui`**: **Primitives**. Low-level, dumb components (Buttons, Inputs, Dialogs). Never contain business logic.
*   **`src/components/[feature]`**: **Compositions**. Feature-specific components (e.g., `TransactionList`, `DashboardChart`). Connect primitives to data.
*   **`src/pages`**: **Views**. Top-level route components.
*   **`src/lib/db.ts`**: **Schema Definition**. Defines the Dexie database structure and TypeScript interfaces.
*   **`src/lib/sync.ts`**: **The Engine**. Contains the complex `SyncManager` class handling the bidirectional sync protocol.
*   **`src/hooks`**: **Data Access**. Custom hooks like `useTransactions` that wrap `useLiveQuery` for easy UI consumption.

## 7. Common Developer Workflows

### (A) Adding a New Transaction Property
1.  **DB Schema:** Update `Transaction` interface in `src/lib/db.ts`.
2.  **Supabase:** Add column to `transactions` table in Supabase types and database.
3.  **Sync Mapping:** Update `prepareItemForPush` and `prepareItemForLocal` in `src/lib/sync.ts` to handle the new field (especially if type conversion is needed).
4.  **UI:** Update components to read/write the new field.

### (B) Creating a New UI Feature
1.  **Component:** Create `src/components/[feature]/MyFeature.tsx`.
2.  **Data:** usage `useLiveQuery` or an existing hook (e.g., `useTransactions`) to read data.
3.  **Page:** Add to `src/pages/[Page].tsx` or create a new page and add to `App.tsx` router.

### (C) Adding a New Synced Table
1.  **Local Schema:** Add table definition to `AppDatabase` in `src/lib/db.ts`.
2.  **Sync Config:** Add table name to `TABLES` array in `src/lib/sync.ts`.
3.  **Type Mapping:** Update `LocalTableMap` in `src/lib/sync.ts`.

## 8. Operational Constraints for Future AIs

1.  **NO FETCH:** Never suggest using `fetch` or direct Supabase client calls (`supabase.from(...).select()`) for feature data in UI components. **Always** use Dexie/Hooks.
2.  **NO DIRECT INSERTS:** Never suggest `supabase.from(...).insert()`. Insert into Dexie (`db.table.add()`) and let `SyncManager` handle the rest.
3.  **OFFLINE FIRST:** Always assume the user might be offline. Do not block UI actions on network requests.
4.  **HOOKS PREFERENCE:** Use `useLiveQuery` patterns for all data requirements.
5.  **SHADCN PATTERNS:** When modifying UI, strictly adhere to the Radix/Shadcn composition pattern found in `src/components/ui`.

## 9. Reference Library (Deep Dives)

For complex tasks, consult these specific guides:

| Topic | File | Why Read? |
| :--- | :--- | :--- |
| **Complex Logic** | `docs/LOGIC_FLOWS.md` | Auth state machine, Sync retry algorithms, Bank Import steps. |
| **Component Props** | `docs/COMPONENTS.md` | Proper prop interface patterns and folder structure. |
| **Database Schema** | `docs/DATA_STRUCTURE.md` | The definitive source for table fields and index definitions. |
| **Deployment** | `docs/DEPLOYMENT.md` | Env vars and build process. |
| **Testing** | `docs/TESTING.md` | How to mock Dexie/Supabase for unit tests. |

