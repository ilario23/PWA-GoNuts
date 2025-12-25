# Component Architecture

This document describes the component organization and architecture of the PWA application.

## Component Directory Structure

```
src/components/
├── ui/                     # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── card.tsx
│   ├── chart.tsx
│   ├── dialog.tsx
│   ├── flip-card.tsx
│   └── ...
├── dashboard/              # Dashboard page components
│   ├── DashboardChartCard.tsx
│   ├── DashboardStatCard.tsx
│   └── DashboardSummaryCards.tsx
├── categories/             # Categories page components
│   ├── CategoryFormDialog.tsx
│   ├── CategoryMobileList.tsx
│   ├── CategoryDesktopTable.tsx
│   ├── CategoryBudgetDialog.tsx
│   └── CategoryMigrationDialog.tsx
├── recurring/              # Recurring transactions components
│   ├── RecurringTransactionFormDialog.tsx
│   └── RecurringTransactionDesktopTable.tsx
├── statistics/             # Statistics page components
│   ├── StatsSummaryCards.tsx
│   ├── StatsBurnRateCard.tsx
│   ├── StatsContextAnalytics.tsx
│   └── StatsPeriodComparison.tsx
├── import/                 # Bank import components
│   ├── ImportWizard.tsx
│   ├── ImportPreview.tsx
│   ├── ImportCsvMapping.tsx
│   └── ImportReconciliation.tsx
├── members/                # Group member management
│   ├── MemberList.tsx
│   └── MemberActionButtons.tsx
└── [shared components]     # Top-level shared components
    ├── TransactionList.tsx
    ├── TransactionDialog.tsx
    ├── CategorySelector.tsx
    ├── SafeLogoutDialog.tsx
    └── ...
```

## Page-to-Component Mapping

### Dashboard (`src/pages/Dashboard.tsx`)

| Component | Purpose |
|-----------|---------|
| `DashboardChartCard` | Renders flip card content: chart view, recent transactions, or budget |
| `DashboardStatCard` | Renders mobile stat flip cards (expenses, income, balance, budget) |
| `DashboardSummaryCards` | Desktop sidebar summary cards |

### Categories (`src/pages/Categories.tsx`)

| Component | Purpose |
|-----------|---------|
| `CategoryFormDialog` | Create/edit category form with all accordions |
| `CategoryMobileList` | Mobile view with recursive category rendering |
| `CategoryDesktopTable` | Desktop table with hierarchical rows |
| `CategoryBudgetDialog` | Set or remove category budgets |
| `CategoryMigrationDialog` | Migrate transactions before category deletion |

### Recurring Transactions (`src/pages/RecurringTransactions.tsx`)

| Component | Purpose |
|-----------|---------|
| `RecurringTransactionFormDialog` | Create/edit recurring transaction form |
| `RecurringTransactionDesktopTable` | Desktop table with next occurrence display |

### Statistics (`src/pages/Statistics.tsx`)

| Component | Purpose |
|-----------|---------|
| `StatsSummaryCards` | Income/expense/investment/balance cards with flip support |
| `StatsBurnRateCard` | Daily burn rate indicator with projections |
| `StatsContextAnalytics` | Context-based expense breakdown |
| `StatsPeriodComparison` | Monthly/yearly comparison charts |

### Import (`src/pages/Import.tsx`)

| Component | Purpose |
|-----------|---------|
| `ImportWizard` | Main controller for the multi-step import flow |
| `ImportPreview` | Displays summary cards of the loaded file |
| `ImportCsvMapping` | Interface for manual column mapping (mobile-first) |
| `ImportReconciliation` | Category and context matching for new transactions |

### Manage Members (`src/pages/ManageMembers.tsx`)

| Component | Purpose |
|-----------|---------|
| `MemberList` | List of group members with profile resolution |
| `MemberActionButtons` | Actions for sharing, editing, or removing members |

## Component Design Patterns

### Props Interface Convention

Each extracted component follows a consistent props interface pattern:

```typescript
interface ComponentNameProps {
  // Required data props
  data: DataType;
  
  // Callbacks
  onAction?: (params: ParamsType) => void;
  
  // Optional configuration
  isLoading?: boolean;
  className?: string;
}
```

### Common Patterns Used

1. **Translation Hook**: All components use `useTranslation()` internally
2. **Memoization**: Heavy calculations are wrapped in `useMemo`
3. **Responsive Design**: Components handle mobile/desktop variants
4. **Type Safety**: Full TypeScript with strict typing

## Extending Components

When adding new features to a page:

1. **Small additions**: Add directly to the page component
2. **Reusable UI blocks**: Create in the page's component directory
3. **Shared across pages**: Create at `src/components/` root level

### Creating a New Page Component

```tsx
// src/components/[page-name]/[ComponentName].tsx
import { useTranslation } from "react-i18next";

interface ComponentNameProps {
  // Define props
}

export function ComponentName({ ...props }: ComponentNameProps) {
  const { t } = useTranslation();
  
  return (
    // JSX
  );
}
```

## Import Conventions

Page components import their sub-components using absolute paths:

```typescript
import { DashboardChartCard } from "@/components/dashboard/DashboardChartCard";
import { CategoryFormDialog } from "@/components/categories/CategoryFormDialog";
```

## Type Considerations

When extracting components that use hooks with extended types:

- `Group` from `db.ts` = Basic database type
- `GroupWithMembers` from `useGroups.ts` = Extended with `members` array

Always check which type your hook returns before defining component props.
