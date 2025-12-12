# Hooks & Development Guide

This guide explains how to develop new features using the GoNuts hook ecosystem. 

## The Golden Rule
**"Read from Disk, Sync in Background."**

When building UI components:
1.  **NEVER** import `supabase` directly to fetch data (`supabase.from('...').select()`).
2.  **ALWAYS** use the custom entity hooks (`useTransactions`, `useCategories`, etc.).
3.  **ALWAYS** let the `SyncManager` handle the network.

---

## Core Data Hooks

All data hooks are reactive. They use `useLiveQuery` from Dexie, meaning your component will **automatically re-render** whenever the data on disk changes (whether by user action or background sync).

### `useTransactions(limit?, yearMonth?, groupId?)`
Fetches transactions with optional filtering.
*   `limit`: Number (e.g., restricted list for Dashboard).
*   `yearMonth`: String "YYYY-MM" (e.g., "2024-11"). High-performance filter using the `year_month` index.
*   `groupId`: String. Filter by specific group (or `null` for personal only).

```tsx
// Example: Recent transactions
const { transactions, addTransaction } = useTransactions(5);

// Example: November 2024 Personal Expenses
const { transactions } = useTransactions(undefined, "2024-11", null);
```

### `useCategories()`
Fetches categories, automatically sorted by type and hierarchy.
*   **Returns**: `categories` (flat list), `incomeCategories`, `expenseCategories`.
*   **Usage**: Use this for Dropdowns/Selects.

### `useGroups()`
Fetches groups the user belongs to.
*   **Returns**: `groups` (list) and crud methods (`createGroup`, `updateGroup`).

### `useSettings()`
Access user preferences.
*   **Returns**: `settings` object (currency, theme, language).
*   **Note**: Changes here (e.g., switching theme) are instantly applied to the DB and synced.

---

## Utility Hooks

### `useAuth()`
*   **Context**: Global.
*   **Returns**: `user` (Supabase User object), `loading`, `isOffline`.
*   **Usage**: Check specific user attributes or ID. `if (!user) return null;`

### `useOnlineSync()`
*   **Context**: Global / Component.
*   **Returns**: `isOnline` boolean.
*   **Usage**: Show "Offline" badges or disable features that strictly require network (though most shouldn't).

### `useSafeLogout()`
*   **Returns**: `handleLogout`, `isDialogOpen`, `confirmLogout`, `pendingCount`.
*   **Purpose**: Prevents data loss by checking for unsynced changes before logging out.
*   **Usage**: Use this instead of `signOut` from `useAuth` in UI components.

---

## Creating New Data Hooks
If you need to query data in a new way (e.g., "Sum of expenses by category"):

1.  Create `src/hooks/useNewQuery.ts`.
2.  Import `useLiveQuery`.
3.  Write the Dexie query.

```typescript
export function useExpensesByCategory(month: string) {
  return useLiveQuery(async () => {
    // 1. Get transactions for month
    const txs = await db.transactions
        .where('year_month').equals(month)
        .toArray();
    
    // 2. Aggregate manually (Dexie is NoSQL-like)
    const totals = {}; 
    txs.forEach(t => { /* ... */ });
    
    return totals;
  }, [month]); // Dependency array matches the query inputs
}
```
