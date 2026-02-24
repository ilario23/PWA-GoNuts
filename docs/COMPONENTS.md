# Component Architecture

This document describes the component organization and architecture of the PWA application.

## Component Directory Structure

```
src/components/
├── ui/                     # Base UI components (shadcn/ui - Radix Primitives)
│   ├── button.tsx
│   ├── card.tsx
│   ├── chart.tsx
│   ├── dialog.tsx
│   ├── drawer.tsx          # Mobile Drawer
│   ├── sheet.tsx           # Sidebar Sheet
│   └── ...
├── dashboard/              # Dashboard feature components
│   ├── DashboardChartCard.tsx
│   ├── DashboardStatCard.tsx
│   └── DashboardSummaryCards.tsx
├── categories/             # Categories feature components
│   ├── CategoryFormDialog.tsx
│   ├── CategoryList.tsx    # Unified list view
│   └── CategoryMigrationDialog.tsx
├── recurring/              # Recurring transactions components
│   ├── RecurringTransactionFormDialog.tsx
│   └── RecurringTransactionList.tsx
├── statistics/             # Statistics feature components
│   ├── StatsSummaryCards.tsx
│   ├── StatsCharts.tsx
│   └── StatsPeriodComparison.tsx
├── import/                 # Bank import feature
│   ├── ImportWizard.tsx
│   └── ImportPreview.tsx
├── auth/                   # Authentication components
│   ├── SessionExpiredModal.tsx
│   └── AuthPage.tsx (in pages/)
└── [shared]                # App-level shared components
    ├── AppShell.tsx        # Main layout wrapper
    ├── app-sidebar.tsx     # Application Sidebar composition
    ├── TransactionDialog.tsx
    ├── UserAvatar.tsx
    └── ...
```

## Page-to-Component Mapping

### Dashboard (`src/pages/Dashboard.tsx`)

| Component | Purpose |
|-----------|---------|
| `DashboardChartCard` | Renders the main chart/transactions view (Desktop) or flip card (Mobile). |
| `DashboardStatCard` | Renders mobile stat flip cards (expenses, income, balance, budget). |
| `DashboardSummaryCards` | Renders desktop summary cards (top row). |
| `TransactionDialog` | Shared dialog for adding/editing transactions. |

### Categories (`src/pages/Categories.tsx`)

| Component | Purpose |
|-----------|---------|
| `CategoryFormDialog` | Create/edit category form. |
| `CategoryList` | Renders the list of categories (grouped by type). |
| `CategoryMigrationDialog` | Handles data migration when deleting a category. |

### Recurring Transactions (`src/pages/RecurringTransactions.tsx`)

| Component | Purpose |
|-----------|---------|
| `RecurringTransactionFormDialog` | Create/edit recurring transaction templates. |
| `RecurringTransactionList` | Lists active and inactive recurring rules. |

### Layout & Navigation (`src/App.tsx`)

| Component | Purpose |
|-----------|---------|
| `AppShell` | Provides the sidebar layout context (`SidebarProvider`). |
| `AppSidebar` | Composes `ui/sidebar` with app-specific navigation and user profile. |
| `ThemeToggle` | Toggles between Light/Dark/System modes. |

## Component Design Patterns

### 1. Primitives vs. Composition
*   **`src/components/ui`**: Contains **ONLY** generic, reusable primitives (Buttons, Inputs, Sheets). These should rarely be modified and strictly follow shadcn/ui patterns.
*   **`src/components/[feature]`**: Contains the business logic and composition of primitives.

### 2. Props Interface Convention
Components generally follow a strict typed interface:

```typescript
interface ComponentNameProps {
  // Data props (typed from db.ts)
  transaction?: Transaction;
  
  // Action callbacks
  onSave: (data: FormData) => Promise<void>;
  
  // Display state
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}
```

### 3. Hooks Integration
Components **DO NOT** usually fetch their own data. Data is fetched in the **Page** (via `useLiveQuery` hooks) and passed down as props.
*   *Exception*: Complex distinct widgets (like a specific "Recent Activity" standalone widget) might use a hook internally, but passing data from up top is preferred for connection sharing.

## Import Conventions

Use the `@/` alias for all imports:

```typescript
// Good
import { Button } from "@/components/ui/button";
import { Transaction } from "@/lib/db";

// Bad
import { Button } from "../../components/ui/button";
```
