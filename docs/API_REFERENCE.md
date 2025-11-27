# API Reference

This document provides a comprehensive reference for the custom hooks, interfaces, and utility functions available in the Personal Expense Tracker PWA.

## Table of Contents

- [Database Interfaces](#database-interfaces)
- [Custom Hooks](#custom-hooks)
- [Utility Functions](#utility-functions)
- [Component Props](#component-props)

## Database Interfaces

All database interfaces are defined in [src/lib/db.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/lib/db.ts).

### Transaction

```typescript
interface Transaction {
  id: string; // UUID
  user_id: string; // User identifier
  group_id?: string | null; // Group reference (null = personal)
  paid_by_user_id?: string | null; // Who paid (required for group transactions)
  category_id: string; // Category reference (required)
  context_id?: string; // Context reference (optional)
  type: "income" | "expense" | "investment";
  amount: number; // Transaction amount
  date: string; // ISO date string (YYYY-MM-DD)
  year_month: string; // Computed field (YYYY-MM)
  description: string; // Transaction description
  deleted_at?: string | null; // Soft delete timestamp
  pendingSync?: number; // 1 if needs sync, 0 if synced
  sync_token?: number; // Server sync token
}
```

### Category

```typescript
interface Category {
  id: string;
  user_id: string;
  group_id?: string | null; // Group reference (null = personal)
  name: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color name
  type: "income" | "expense" | "investment";
  parent_id?: string; // Parent category ID for hierarchy
  active: number; // 1 or 0 (boolean)
  deleted_at?: string | null;
  pendingSync?: number;
  sync_token?: number;
}
```

### Context

```typescript
interface Context {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  active: number; // 1 or 0 (boolean)
  deleted_at?: string | null;
  pendingSync?: number;
  sync_token?: number;
}
```

### RecurringTransaction

```typescript
interface RecurringTransaction {
  id: string;
  user_id: string;
  group_id?: string | null; // Group reference (null = personal)
  paid_by_user_id?: string | null; // Who pays (required for group)
  type: "income" | "expense" | "investment";
  category_id: string; // Required
  context_id?: string;
  amount: number;
  description: string; // Required
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  start_date: string; // ISO date string
  end_date?: string | null; // Optional end date
  active: number; // 1 or 0 (boolean)
  last_generated?: string; // Last generation timestamp
  deleted_at?: string | null;
  pendingSync?: number;
  sync_token?: number;
}
```

### Setting

```typescript
interface Setting {
  user_id: string; // Primary key
  currency: string; // e.g., 'EUR', 'USD'
  language: string; // e.g., 'en', 'it'
  theme: string; // 'light', 'dark', 'system'
  accentColor: string; // Tailwind color name
  start_of_week: string; // 'monday' or 'sunday'
  default_view: string; // 'list' or 'grid'
  include_investments_in_expense_totals: boolean;
  include_group_expenses: boolean; // Include group expenses in totals
  monthly_budget?: number; // Monthly spending limit (optional)
  cached_month?: number; // Currently cached month
  last_sync_token?: number; // Last synced token
  updated_at?: string;
}
```

### CategoryBudget

```typescript
interface CategoryBudget {
  id: string; // UUID
  user_id: string; // User identifier
  category_id: string; // Reference to category
  amount: number; // Budget limit amount
  period: "monthly" | "yearly"; // Budget period
  deleted_at?: string | null; // Soft delete timestamp
  pendingSync?: number; // 1 if needs sync
  sync_token?: number; // Server sync token
  updated_at?: string;
  created_at?: string;
}
```

## Custom Hooks

### useAuth

Authentication hook for managing user sessions.

**Location**: [src/hooks/useAuth.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/hooks/useAuth.ts)

```typescript
function useAuth(): {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};
```

**Returns**:

- `user`: Current authenticated user or null
- `loading`: True while checking authentication status
- `signOut`: Function to sign out the current user

**Example**:

```typescript
const { user, loading, signOut } = useAuth();

if (loading) return <div>Loading...</div>;
if (!user) return <Navigate to="/auth" />;
```

---

### useTransactions

Hook for managing transactions with CRUD operations.

**Location**: [src/hooks/useTransactions.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/hooks/useTransactions.ts)

```typescript
function useTransactions(
  limit?: number,
  yearMonth?: string
): {
  transactions: Transaction[] | undefined;
  addTransaction: (
    transaction: Omit<
      Transaction,
      "id" | "sync_token" | "pendingSync" | "deleted_at"
    >
  ) => Promise<void>;
  updateTransaction: (
    id: string,
    updates: Partial<Omit<Transaction, "id" | "sync_token" | "pendingSync">>
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
};
```

**Parameters**:

- `limit` (optional): Maximum number of transactions to return
- `yearMonth` (optional): Filter by year-month (YYYY-MM) or year (YYYY)

**Returns**:

- `transactions`: Array of transactions (reactive via useLiveQuery)
- `addTransaction`: Create a new transaction
- `updateTransaction`: Update an existing transaction
- `deleteTransaction`: Soft delete a transaction

**Example**:

```typescript
const { transactions, addTransaction, deleteTransaction } = useTransactions(
  10,
  "2024-11"
);

await addTransaction({
  user_id: user.id,
  category_id: "category-uuid",
  type: "expense",
  amount: 50.0,
  date: "2024-11-25",
  year_month: "2024-11",
  description: "Groceries",
});
```

---

### useCategories

Hook for managing hierarchical categories.

**Location**: [src/hooks/useCategories.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/hooks/useCategories.ts)

```typescript
function useCategories(): {
  categories: Category[];
  addCategory: (
    category: Omit<Category, "id" | "sync_token" | "pendingSync" | "deleted_at">
  ) => Promise<void>;
  updateCategory: (
    id: string,
    updates: Partial<Omit<Category, "id" | "sync_token" | "pendingSync">>
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reparentChildren: (
    oldParentId: string,
    newParentId: string | undefined
  ) => Promise<void>;
};
```

**Returns**:

- `categories`: Array of active categories (excludes soft-deleted)
- `addCategory`: Create a new category
- `updateCategory`: Update an existing category
- `deleteCategory`: Soft delete a category
- `reparentChildren`: Move children from one parent to another

**Example**:

```typescript
const { categories, addCategory, reparentChildren } = useCategories();

await addCategory({
  user_id: user.id,
  name: "Food",
  icon: "Utensils",
  color: "orange",
  type: "expense",
  active: 1,
});

// Move children when deleting a parent
await reparentChildren("old-parent-id", "new-parent-id");
```

---

### useContexts

Hook for managing transaction contexts.

**Location**: [src/hooks/useContexts.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/hooks/useContexts.ts)

```typescript
function useContexts(): {
  contexts: Context[];
  addContext: (
    context: Omit<Context, "id" | "sync_token" | "pendingSync" | "deleted_at">
  ) => Promise<void>;
  updateContext: (
    id: string,
    updates: Partial<Omit<Context, "id" | "sync_token" | "pendingSync">>
  ) => Promise<void>;
  deleteContext: (id: string) => Promise<void>;
};
```

---

### useRecurringTransactions

Hook for managing recurring transactions with automatic generation.

**Location**: [src/hooks/useRecurringTransactions.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/hooks/useRecurringTransactions.ts)

```typescript
function useRecurringTransactions(): {
  recurringTransactions: RecurringTransaction[];
  addRecurringTransaction: (
    rt: Omit<
      RecurringTransaction,
      "id" | "sync_token" | "pendingSync" | "deleted_at" | "last_generated"
    >
  ) => Promise<void>;
  updateRecurringTransaction: (
    id: string,
    updates: Partial<
      Omit<RecurringTransaction, "id" | "sync_token" | "pendingSync">
    >
  ) => Promise<void>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  generateTransactions: () => Promise<void>;
};
```

**Returns**:

- `generateTransactions`: Manually trigger transaction generation from recurring rules

**Example**:

```typescript
const { addRecurringTransaction, generateTransactions } =
  useRecurringTransactions();

await addRecurringTransaction({
  user_id: user.id,
  type: "expense",
  category_id: "rent-category-id",
  amount: 1200,
  description: "Monthly rent",
  frequency: "monthly",
  start_date: "2024-01-01",
  active: 1,
});

// Generate transactions from all active recurring rules
await generateTransactions();
```

---

### useStatistics

Hook for calculating financial statistics and analytics.

**Location**: [src/hooks/useStatistics.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/hooks/useStatistics.ts)

```typescript
interface UseStatisticsParams {
  selectedMonth?: string; // YYYY-MM format
  selectedYear?: string; // YYYY format
}

function useStatistics(params?: UseStatisticsParams): {
  // Monthly totals
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  netBalance: number;

  // Category breakdowns
  expensesByCategory: Array<{
    category: string;
    amount: number;
    color: string;
    percent: number;
  }>;
  incomeByCategory: Array<{
    category: string;
    amount: number;
    color: string;
    percent: number;
  }>;

  // Trend data
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;

  // And many more calculated statistics...
};
```

**Parameters**:

- `selectedMonth` (optional): Filter statistics by specific month
- `selectedYear` (optional): Filter statistics by specific year

**Returns**: Comprehensive statistics object with totals, breakdowns, and trend data

**Example**:

```typescript
const { totalIncome, totalExpenses, netBalance, expensesByCategory } =
  useStatistics({
    selectedMonth: "2024-11",
  });
```

---

### useSettings

Hook for managing user settings.

**Location**: [src/hooks/useSettings.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/hooks/useSettings.ts)

```typescript
function useSettings(): {
  settings: Setting | undefined;
  updateSettings: (updates: Partial<Setting>) => Promise<void>;
};
```

**Example**:

```typescript
const { settings, updateSettings } = useSettings();

await updateSettings({
  theme: "dark",
  currency: "USD",
  language: "it",
});
```

---

### useSync

Hook for manually triggering synchronization.

**Location**: [src/hooks/useSync.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/hooks/useSync.ts)

```typescript
function useSync(): {
  sync: () => Promise<void>;
  isSyncing: boolean;
};
```

**Example**:

```typescript
const { sync, isSyncing } = useSync();

<Button onClick={sync} disabled={isSyncing}>
  {isSyncing ? "Syncing..." : "Sync Now"}
</Button>;
```

---

### useOnlineSync

Hook that automatically syncs when the app comes back online.

**Location**: [src/hooks/useOnlineSync.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/hooks/useOnlineSync.ts)

```typescript
function useOnlineSync(): void;
```

**Usage**: Call once in a top-level component (already used in `ProtectedRoute`)

```typescript
function ProtectedRoute({ children }) {
  useOnlineSync(); // Auto-sync when coming online
  // ...
}
```

---

### useRealtimeSync

Hook for Supabase Realtime subscriptions - instant cross-device sync.

**Location**: [src/hooks/useRealtimeSync.ts](file:///src/hooks/useRealtimeSync.ts)

```typescript
function useRealtimeSync(): {
  isConnected: boolean;
};
```

**Returns**:

- `isConnected`: True if Realtime connection is active

**Features**:

- Automatically subscribes to all user data tables
- Updates local IndexedDB when remote changes detected
- Uses last-write-wins conflict resolution
- Shows connection status in UI

---

### useAutoGenerate

Hook that automatically generates recurring transactions on app load.

**Location**: [src/hooks/useAutoGenerate.ts](file:///src/hooks/useAutoGenerate.ts)

```typescript
function useAutoGenerate(): void;
```

**Features**:

- Runs once per app session
- Checks all active recurring transactions
- Generates missing transactions up to today
- Shows toast notification with count and total amount
- Triggers sync after generation

**Usage**: Called automatically in `ProtectedRoute`

---

### useBudgetNotifications

Hook that monitors budget usage and shows warnings.

**Location**: [src/hooks/useBudgetNotifications.ts](file:///src/hooks/useBudgetNotifications.ts)

```typescript
function useBudgetNotifications(): void;
```

**Features**:

- Monitors current month expenses vs monthly budget
- Shows warning toast at 80% budget usage
- Shows error toast when budget exceeded
- Each notification shown once per session per month

**Usage**: Called automatically in `ProtectedRoute`

---

### useCategoryBudgets

Hook for managing per-category spending budgets with progress tracking.

**Location**: [src/hooks/useCategoryBudgets.ts](file:///src/hooks/useCategoryBudgets.ts)

```typescript
interface CategoryBudgetWithSpent extends CategoryBudget {
  spent: number;
  percentage: number;
  remaining: number;
  isOverBudget: boolean;
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
}

function useCategoryBudgets(
  selectedMonth?: string,
  selectedYear?: string
): {
  categoryBudgets: CategoryBudgetWithSpent[];
  budgetsWithSpent: CategoryBudgetWithSpent[]; // Alias
  getBudgetForCategory: (
    categoryId: string,
    period?: "monthly" | "yearly"
  ) => CategoryBudgetWithSpent | undefined;
  setCategoryBudget: (
    categoryId: string,
    amount: number,
    period?: "monthly" | "yearly"
  ) => Promise<void>;
  removeCategoryBudget: (budgetId: string) => Promise<void>;
  overBudgetCategories: CategoryBudgetWithSpent[];
  warningCategories: CategoryBudgetWithSpent[];
};
```

**Parameters**:

- `selectedMonth` (optional): Filter by month (YYYY-MM format)
- `selectedYear` (optional): Filter by year (YYYY format)

**Returns**:

- `categoryBudgets`: All budgets with spent calculations
- `getBudgetForCategory`: Get budget info for specific category
- `setCategoryBudget`: Create or update a category budget
- `removeCategoryBudget`: Soft delete a budget
- `overBudgetCategories`: Categories exceeding their budget
- `warningCategories`: Categories at 80%+ budget usage

**Example**:

```typescript
const { budgetsWithSpent, setCategoryBudget, getBudgetForCategory } =
  useCategoryBudgets("2024-11");

// Set a monthly budget of €200 for groceries
await setCategoryBudget("groceries-category-id", 200, "monthly");

// Get budget info
const groceriesBudget = getBudgetForCategory("groceries-category-id");
// { amount: 200, spent: 150, percentage: 75, remaining: 50, isOverBudget: false, ... }
```

---

### usePWAUpdate

Hook for detecting and handling PWA service worker updates.

**Location**: [src/hooks/usePWAUpdate.ts](file:///src/hooks/usePWAUpdate.ts)

```typescript
interface PWAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => Promise<void>;
  close: () => void;
}

function usePWAUpdate(): PWAUpdateState;
```

**Returns**:

- `needRefresh`: True when a new version is available
- `offlineReady`: True when app is ready for offline use
- `updateServiceWorker`: Function to apply the update and reload
- `close`: Function to dismiss the notification

**Features**:

- Automatically checks for updates every hour
- Uses `registerType: "prompt"` for user-controlled updates
- Integrates with vite-plugin-pwa's React hooks

**Example**:

```typescript
const { needRefresh, offlineReady, updateServiceWorker, close } =
  usePWAUpdate();

if (needRefresh) {
  // Show update notification to user
  return (
    <div>
      <p>New version available!</p>
      <button onClick={() => updateServiceWorker()}>Reload</button>
      <button onClick={close}>Later</button>
    </div>
  );
}
```

---

### useGroups

Hook for managing expense groups and members.

**Location**: [src/hooks/useGroups.ts](file:///src/hooks/useGroups.ts)

```typescript
interface GroupWithMembers extends Group {
  members: GroupMember[];
}

function useGroups(): {
  groups: GroupWithMembers[];
  addGroup: (
    group: Omit<Group, "id" | "sync_token" | "pendingSync" | "deleted_at">
  ) => Promise<string>;
  updateGroup: (
    id: string,
    updates: Partial<Omit<Group, "id" | "sync_token" | "pendingSync">>
  ) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addMember: (groupId: string, userId: string, share: number) => Promise<void>;
  updateMemberShare: (memberId: string, share: number) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
};
```

**Example**:

```typescript
const { groups, addGroup, addMember } = useGroups();

// Create a group
const groupId = await addGroup({
  name: "Roommates",
  description: "Shared apartment expenses",
  created_by: user.id,
});

// Add a member with 50% share
await addMember(groupId, "other-user-id", 50);
```

---

### useMobile

Hook for detecting mobile viewport.

**Location**: [src/hooks/useMobile.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/hooks/useMobile.ts)

```typescript
function useMobile(): boolean;
```

**Returns**: `true` if viewport width < 768px

**Example**:

```typescript
const isMobile = useMobile();

return isMobile ? <MobileNav /> : <DesktopNav />;
```

## Utility Functions

### Icon Utilities

**Location**: [src/lib/icons.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/lib/icons.ts)

#### getIconComponent

```typescript
function getIconComponent(iconName: string): LucideIcon | null;
```

Maps icon name string to Lucide React icon component.

**Example**:

```typescript
const IconComponent = getIconComponent("Home");
if (IconComponent) {
  return <IconComponent className="h-4 w-4" />;
}
```

#### AVAILABLE_ICONS

```typescript
const AVAILABLE_ICONS: IconItem[] = [
  { name: "Home", icon: Home },
  { name: "ShoppingCart", icon: ShoppingCart },
  // ... 40+ icons
];
```

Array of all available icons for category selection.

---

### Theme Utilities

**Location**: [src/lib/theme-colors.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/lib/theme-colors.ts)

#### applyThemeColor

```typescript
function applyThemeColor(color: string, isDark: boolean): void;
```

Applies theme color CSS variables to the document root.

**Parameters**:

- `color`: Color name (slate, blue, violet, green, orange, rose, zinc)
- `isDark`: Whether dark mode is active

**Example**:

```typescript
applyThemeColor("blue", true); // Apply blue theme in dark mode
```

#### THEME_COLORS

```typescript
const THEME_COLORS: Record<string, ThemeColors> = {
  slate: {
    /* ... */
  },
  blue: {
    /* ... */
  },
  // ... 7 color themes
};
```

Available theme color configurations.

---

### Sync Manager

**Location**: [src/lib/sync.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/lib/sync.ts)

#### syncManager

```typescript
class SyncManager {
  async sync(): Promise<void>;
}

export const syncManager: SyncManager;
```

Singleton instance for managing synchronization. Usually accessed via `useSync` hook.

---

### Database Instance

**Location**: [src/lib/db.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/lib/db.ts)

#### db

```typescript
export const db: AppDatabase;
```

Dexie database instance. Direct access for advanced queries.

**Example**:

```typescript
import { db } from "@/lib/db";

const transactions = await db.transactions
  .where("year_month")
  .equals("2024-11")
  .toArray();
```

---

### Supabase Client

**Location**: [src/lib/supabase.ts](file:///Users/ilariopc/Code/react/pwa-antigravity/src/lib/supabase.ts)

#### supabase

```typescript
export const supabase: SupabaseClient;
```

Supabase client instance for authentication and backend operations.

**Example**:

```typescript
import { supabase } from "@/lib/supabase";

const { data, error } = await supabase.auth.signInWithPassword({
  email: "user@example.com",
  password: "password",
});
```

## Component Props

### CategorySelector

**Location**: [src/components/CategorySelector.tsx](file:///Users/ilariopc/Code/react/pwa-antigravity/src/components/CategorySelector.tsx)

```typescript
interface CategorySelectorProps {
  type: "income" | "expense" | "investment";
  value: string;
  onValueChange: (value: string) => void;
}
```

Complex component for selecting categories with breadcrumb navigation.

---

### TransactionList

**Location**: [src/components/TransactionList.tsx](file:///Users/ilariopc/Code/react/pwa-antigravity/src/components/TransactionList.tsx)

```typescript
interface TransactionListProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
}
```

Displays a list of transactions with edit/delete actions.

---

### DeleteConfirmDialog

**Location**: [src/components/DeleteConfirmDialog.tsx](file:///Users/ilariopc/Code/react/pwa-antigravity/src/components/DeleteConfirmDialog.tsx)

```typescript
interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}
```

Reusable confirmation dialog for delete operations.

---

### PWAUpdateNotification

**Location**: [src/components/PWAUpdateNotification.tsx](file:///src/components/PWAUpdateNotification.tsx)

```typescript
function PWAUpdateNotification(): null;
```

Toast-based notification component for PWA updates.

**Features**:

- Shows success toast when app is ready for offline use
- Shows persistent toast with "Reload" / "Later" buttons when update available
- Uses `usePWAUpdate` hook internally
- Renders null (toast notifications via Sonner)

**Usage**: Add once in App root or AppShell:

```typescript
import { PWAUpdateNotification } from "@/components/PWAUpdateNotification";

function App() {
  return (
    <>
      <PWAUpdateNotification />
      {/* rest of app */}
    </>
  );
}
```

---

## Type Utilities

### Omit Patterns

Common TypeScript patterns used throughout the codebase:

```typescript
// For creating new entities (exclude generated fields)
Omit<Transaction, "id" | "sync_token" | "pendingSync" | "deleted_at">;

// For updating entities (exclude immutable fields)
Partial<Omit<Transaction, "id" | "sync_token" | "pendingSync">>;
```

---

## Best Practices

### Using Hooks

1. **Always use hooks at component top level**

   ```typescript
   function MyComponent() {
     const { transactions } = useTransactions(); // ✅ Correct

     if (condition) {
       const { categories } = useCategories(); // ❌ Wrong
     }
   }
   ```

2. **Handle undefined states**

   ```typescript
   const { transactions } = useTransactions();

   if (!transactions) return <Loading />;

   return <TransactionList transactions={transactions} />;
   ```

3. **Use appropriate filters**

   ```typescript
   // Filter by month for better performance
   const { transactions } = useTransactions(undefined, "2024-11");

   // Instead of fetching all and filtering in JS
   const { transactions } = useTransactions();
   const filtered = transactions?.filter(/* ... */); // Less efficient
   ```

### Error Handling

All hooks handle errors internally and log to console. For production, consider adding error boundaries:

```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

---

For more information, see the [Architecture Guide](ARCHITECTURE.md) and [Contributing Guide](CONTRIBUTING.md).
