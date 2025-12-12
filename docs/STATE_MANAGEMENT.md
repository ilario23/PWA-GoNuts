# State Management Strategy

Understanding where data lives is crucial for debugging and extending GoNuts. We effectively have three layers of state.

## Layer 1: Global Auth State (Memory)
*   **Managed By**: `AuthProvider.tsx`
*   **Technology**: React Context + `useState` + `localStorage` (cache).
*   **Content**: "Who is the current user?"
*   **Persistence**: Ephemeral (Tabs), but backed by `localStorage` for offline boot.
*   **Access**: `useAuth()`.

## Layer 2: Entity State (Persistent Disk)
*   **Managed By**: `Dexie.js` (IndexedDB).
*   **Technology**: Browser Native DB.
*   **Content**: **All Business Data** (Transactions, Categories, Groups).
*   **Characteristic**: "The Truth". This is the only place we trust. Even if the server says X, if the user just typed Y offline, Y is the truth until synced.
*   **Access**: `useLiveQuery` hooks (`useTransactions`, etc.).

## Layer 3: Server State (Remote Backup)
*   **Managed By**: `Supabase` (PostgreSQL).
*   **Technology**: Postgres.
*   **Content**: The exact mirror of Layer 2, plus historical data for other devices.
*   **Characteristic**: "The Hub". Used to transport data from Device A to Device B.
*   **Access**: **Indirectly** via `SyncManager`. The UI never talks to Layer 3.

---

## State Flow Example: "Changing Currency"

1.  **UI Event**: User selects "USD" in Settings Page (Layer 3 - UI State).
2.  **Logic**: `updateSettings({ currency: 'USD' })` called.
3.  **Write**: Logic writes `currency = 'USD'` and `pendingSync = 1` to **Layer 2 (Dexie)**.
4.  **Reaction**: `useLiveQuery` inside `ThemeProvider` sees the change in Layer 2.
5.  **Render**: App re-renders with "$" symbols. (The user is happy instantly).
6.  **Background**: `SyncManager` wakes up, reads Layer 2 (`pendingSync=1`).
7.  **Sync**: Pushes `USD` to **Layer 3 (Supabase)**.
8.  **Confirmation**: Layer 3 confirms. Layer 2 updates `pendingSync = 0`.

## Common Pitfalls

### ❌ Storing Business Data in `useState`
Don't fetch data once and put it in a `const [txs, setTxs] = useState([])`.
**Why?** If a background sync pulls new data, your state won't update.
**Fix**: Use `useLiveQuery`. It *is* your state manager.

### ❌ "Loading" States
Because we read from local disk, "Loading" is rare.
*   **Initial Boot**: Encapsulated by `AppLoadingState` in `App.tsx`.
*   **Page Navigation**: Data is usually ready. If complex calculation is needed, `useLiveQuery` returns `undefined` initially -> Show skeleton.
