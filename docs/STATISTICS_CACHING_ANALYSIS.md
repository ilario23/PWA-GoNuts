# Statistics Caching Analysis

> **Status**: Analysis Complete - No Action Needed  
> **Date**: November 2025  
> **Author**: Development Team

## 📋 Executive Summary

This document analyzes the feasibility of pre-calculating and caching statistics in the local database to improve performance.

### Key Finding

**Performance is good on mobile, slow only on desktop during development.**

This typically indicates the slowdown is caused by:

- Chrome DevTools open (profiler significantly impacts React rendering)
- Browser extensions (React DevTools, Redux DevTools, etc.)
- Development mode overhead (hot reload, source maps)

**Recommendation**: No caching implementation needed at this time. The app performs well on the target platform (mobile PWA).

---

## 🎯 Original Problem Statement

Past transactions are essentially **immutable** (99.99% don't change). This means statistics for closed periods (past months/years) could theoretically be cached and only recalculated when:

1. A transaction in that period is modified
2. Metadata that affects display changes (category names, colors, hierarchy)

### Current Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Statistics    │────▶│  useLiveQuery    │────▶│    IndexedDB    │
│      Page       │     │    + useMemo     │     │  (transactions) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                              ▼
                        Recalculate on
                        every render
```

---

## 📊 Data Immutability Analysis

### What Could Be Cached (Closed Periods)

| Statistic                                  | Cacheable  | Invalidation Complexity             |
| ------------------------------------------ | ---------- | ----------------------------------- |
| Monthly totals (income/expense/investment) | ✅ Yes     | Low                                 |
| Monthly category breakdown                 | ✅ Yes     | Medium                              |
| Daily cumulative expenses                  | ✅ Yes     | Low                                 |
| Year totals                                | ✅ Yes     | Low                                 |
| Category percentages                       | ⚠️ Partial | High (depends on category metadata) |
| Hierarchical breakdown                     | ⚠️ Partial | High (parent changes affect all)    |
| Context stats                              | ⚠️ Partial | Medium                              |
| Comparisons                                | ❌ No      | N/A (depends on two periods)        |

### What Cannot Be Cached

- **Current month/year**: Always volatile
- **Burn rate projections**: Depend on current date
- **Period comparisons**: Depend on both periods being stable

---

## 🔄 Invalidation Events (If Implemented)

### Transaction Events

```typescript
type TransactionEvent =
  | { type: "transaction_created"; year_month: string }
  | {
      type: "transaction_updated";
      year_month: string;
      prev_year_month?: string;
    }
  | { type: "transaction_deleted"; year_month: string }
  | { type: "bulk_import"; year_months: string[] };
```

**Action**: Invalidate cache for affected `year_month` AND parent year.

### Category Events

```typescript
type CategoryEvent =
  | { type: "category_renamed"; id: string } // Cosmetic only
  | { type: "category_color_changed"; id: string } // Cosmetic only
  | { type: "category_deleted"; id: string } // Invalidate ALL
  | { type: "category_parent_changed"; id: string }; // Invalidate ALL (hierarchy change)
```

**Action**:

- Rename/color: No invalidation needed (cache stores IDs, UI resolves names)
- Delete/parent change: Invalidate ALL cached stats

---

## 💾 Proposed Schema (If Needed in Future)

```typescript
interface CachedPeriodStats {
  id: string; // "month:2024-01" or "year:2024"
  type: "month" | "year";
  period: string; // "2024-01" or "2024"

  // Core aggregates
  income: number;
  expense: number;
  investment: number;

  // Category breakdown (by ID for stability)
  expenseByCategory: Record<string, number>; // category_id -> amount

  // Metadata
  transaction_count: number;
  computed_at: number; // Unix timestamp
  schema_version: number; // For future migrations
}

// Dexie table definition
cachedStats: "&id, type, period, computed_at";
```

---

## ⚠️ Risk Analysis

### Risks of Caching

| Risk                     | Probability | Impact | Mitigation                      |
| ------------------------ | ----------- | ------ | ------------------------------- |
| Stale data shown to user | Medium      | High   | Aggressive invalidation         |
| Cache corruption         | Low         | High   | Schema version + rebuild option |
| Storage bloat            | Low         | Medium | Periodic cleanup                |
| Complexity bugs          | Medium      | Medium | Thorough testing                |

### Risks of NOT Caching

| Risk                   | Probability     | Impact | Mitigation                                 |
| ---------------------- | --------------- | ------ | ------------------------------------------ |
| Slow stats page        | Low (mobile OK) | Medium | Already using lazy loading, virtualization |
| Battery drain (mobile) | Low             | Low    | Efficient Dexie queries                    |

---

## 🔧 Code Locations (For Future Reference)

Files that would need changes if caching is implemented:

```
src/lib/db.ts                    # Add cachedStats table
src/hooks/useStatistics.ts       # Add cache read/write logic
src/hooks/useTransactions.ts     # Add invalidation triggers
src/hooks/useCategories.ts       # Add invalidation triggers
src/components/Settings.tsx      # Add "Clear Cache" option
```

---

## 📝 Decision Log

| Date     | Decision          | Rationale                                                                                                           |
| -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| Nov 2025 | No caching needed | Performance is good on mobile (target platform). Desktop slowness is due to DevTools/dev environment, not app code. |

---

## 🎓 Senior Dev Perspective

### Questions a Senior Dev Would Ask

1. **"What's the actual user impact?"** → Mobile users (primary target) have good performance
2. **"What's the complexity cost?"** → Cache invalidation is notoriously bug-prone
3. **"Is this premature optimization?"** → Yes, if the problem doesn't exist on production
4. **"What are the alternatives?"** → Already implemented: `useMemo`, lazy queries, tab-based mode switching

### The 80/20 Rule

The current implementation already has:

- ✅ `useMemo` for expensive calculations
- ✅ Conditional queries based on active tab (`mode` parameter)
- ✅ Lazy chart loading (`LazyChart` component)
- ✅ Indexed queries on `year_month`

These optimizations cover 80% of potential performance gains with minimal complexity.

---

## 🔗 References

- [Dexie.js Documentation](https://dexie.org/)
- [React Query Caching Patterns](https://tanstack.com/query/latest) (alternative approach if needed)
- [IndexedDB Best Practices](https://web.dev/indexeddb-best-practices/)
