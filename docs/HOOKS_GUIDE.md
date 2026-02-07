# Hooks & Development Guide

This guide explains how to develop new features using the GoNuts hook ecosystem. 

## The Golden Rule
**"Read from Disk, Sync in Background."**

When building UI components:
1.  **NEVER** import `supabase` directly to fetch data in a component.
2.  **ALWAYS** use the custom entity hooks (`useTransactions`, `useCategories`, etc.).
3.  **ALWAYS** let the `SyncManager` handle the network.

---

## Core Data Hooks

All data hooks are **reactive**. They use `useLiveQuery` from Dexie, meaning your component will **automatically re-render** whenever the data on IndexedDB changes.

### `useTransactions(limit?, yearMonth?, groupId?)`
Fetches transactions with optional high-performance filtering.
*   `limit`: Number (e.g., 5 for dashboard).
*   `yearMonth`: String "YYYY-MM". Uses the compound index for fast lookups.
*   `groupId`: String. Group ID or `null` (personal only).

```tsx
// Recent transactions
const { transactions } = useTransactions(5);

// Filter by Month & Group
const { transactions } = useTransactions(undefined, "2024-11", activeGroupId);
```

### `useCategories()`
Fetches categories, automatically sorted by type and hierarchy (updates in real-time).
*   **Returns**: `categories` (all), `incomeCategories`, `expenseCategories`.

### `useSettings()`
Access user preferences (Theme, Currency, etc.).
*   **Returns**: `settings` (object), `updateSettings` (function).
*   **Note**: Calling `updateSettings` writes to Dexie -> Triggering a re-render -> Triggering a Sync.

### `useAuth()`
*   **Returns**: `user` (Supabase User), `loading`, `isOffline`.
*   **Usage**: Global auth state. `if (loading) return <Loading />`.

---

## Utility Hooks

### `useOnlineSync()`
*   **Returns**: `isOnline` boolean.
*   **Usage**: Useful for disabling specific "Online Only" buttons (rare).

### `useSafeLogout()`
*   **Purpose**: Prevents data loss. Checks `SyncManager` for pending uploads before allowing logout.
*   **Usage**: Use this in Profile/Settings instead of direct `signOut`.

---

## Creating New Data Hooks

If you need a new query (e.g., "Total Spent by Category"), create a custom hook using `useLiveQuery`.

```typescript
// src/hooks/useCategoryTotal.ts
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export function useCategoryTotal(categoryId: string) {
  return useLiveQuery(async () => {
    const txs = await db.transactions
      .where('[category_id+year_month]') // Use index if possible
      .between([categoryId, Dexie.minKey], [categoryId, Dexie.maxKey])
      .toArray();
      
    return txs.reduce((acc, t) => acc + t.amount, 0);
  }, [categoryId]);
}
```
