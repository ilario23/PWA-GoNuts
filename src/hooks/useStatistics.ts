import { useLiveQuery } from "dexie-react-hooks";
import { db, Category, Transaction, GroupMember } from "../lib/db";
import { useTranslation } from "react-i18next";
import { format, subMonths } from "date-fns";
import { useMemo, useCallback } from "react";

/**
 * Parameters for configuring the statistics hook.
 */
interface UseStatisticsParams {
  /** Selected month for monthly stats (format: 'YYYY-MM') */
  selectedMonth?: string;
  /** Selected year for yearly stats (format: 'YYYY') */
  selectedYear?: string;
  /** Custom month for comparison (format: 'YYYY-MM'), defaults to previous month */
  comparisonMonth?: string;
  /** Custom year for comparison (format: 'YYYY'), defaults to previous year */
  comparisonYear?: string;
  /** Active mode - only calculates data for the active tab for performance */
  mode?: "monthly" | "yearly";
  /** Filter by specific group ID - only includes transactions from that group */
  groupId?: string;
  /** Current user ID for calculating group shares */
  userId?: string;
}

/**
 * Hook for calculating comprehensive financial statistics and analytics.
 *
 * Provides aggregated data for dashboard charts, period comparisons,
 * burn rate projections, and category breakdowns.
 *
 * @param params - Optional configuration for period selection
 *
 * @returns Object containing:
 *   - `monthlyStats` / `yearlyStats`: Income, expense, investment totals by category
 *   - `monthlyNetBalance` / `yearlyNetBalance`: Net income - expenses
 *   - `monthlyCategoryPercentages` / `yearlyCategoryPercentages`: For pie/radial charts
 *   - `monthlyExpenses` / `monthlyIncome` / `monthlyInvestments`: 12-month arrays
 *   - `dailyCumulativeExpenses`: Daily cumulative for line charts
 *   - `monthlyTrendData` / `monthlyCashFlow`: Trend analysis data
 *   - `contextStats`: Spending breakdown by context
 *   - `burnRate` / `yearlyBurnRate`: Projection calculations
 *   - `monthlyComparison` / `yearlyComparison`: Period-over-period changes
 *   - `categoryComparison`: Which categories increased/decreased
 *
 * @example
 * ```tsx
 * const {
 *   monthlyStats,
 *   burnRate,
 *   monthlyComparison
 * } = useStatistics({ selectedMonth: '2024-06' });
 *
 * // Display summary
 * console.log(`Spent: €${monthlyStats.expense}`);
 * console.log(`Burn rate: €${burnRate.dailyAverage}/day`);
 * console.log(`vs last month: ${monthlyComparison.expense.change.toFixed(1)}%`);
 * ```
 */
export function useStatistics(params?: UseStatisticsParams) {
  const now = new Date();
  const currentMonth = params?.selectedMonth || format(now, "yyyy-MM");
  const currentYear = params?.selectedYear || format(now, "yyyy");
  const mode = params?.mode || "monthly"; // Default to monthly for backwards compatibility
  const userId = params?.userId;

  const { t } = useTranslation();

  // Helper to get localized short month names
  const getMonthNames = useCallback(() => {
    return [
      t('months_short.jan'),
      t('months_short.feb'),
      t('months_short.mar'),
      t('months_short.apr'),
      t('months_short.may'),
      t('months_short.jun'),
      t('months_short.jul'),
      t('months_short.aug'),
      t('months_short.sep'),
      t('months_short.oct'),
      t('months_short.nov'),
      t('months_short.dec')
    ];
  }, [t]);

  // Calculate previous periods for comparison
  const defaultPreviousMonth = format(
    subMonths(new Date(`${currentMonth}-01`), 1),
    "yyyy-MM"
  );
  const previousMonth = params?.comparisonMonth || defaultPreviousMonth;
  const defaultPreviousYear = (parseInt(currentYear) - 1).toString();
  const previousYear = params?.comparisonYear || defaultPreviousYear;

  // #2 - CONDITIONAL QUERIES: Only fetch data needed for active mode
  // Monthly queries - only run in monthly mode
  const transactions = useLiveQuery(
    () =>
      mode === "monthly"
        ? db.transactions.where("year_month").equals(currentMonth).toArray()
          .then(txs => params?.groupId
            ? txs.filter(t => t.group_id === params.groupId)
            : txs)
        : Promise.resolve([] as Transaction[]),
    [currentMonth, mode, params?.groupId]
  );

  // Get previous month transactions for comparison - only in monthly mode
  const previousMonthTransactions = useLiveQuery(
    () =>
      mode === "monthly"
        ? db.transactions.where("year_month").equals(previousMonth).toArray()
          .then(txs => params?.groupId
            ? txs.filter(t => t.group_id === params.groupId)
            : txs)
        : Promise.resolve([] as Transaction[]),
    [previousMonth, mode, params?.groupId]
  );

  // Get all transactions for the selected year - only in yearly mode
  const yearlyTransactions = useLiveQuery(
    () =>
      mode === "yearly"
        ? db.transactions
          .where("year_month")
          .between(`${currentYear}-01`, `${currentYear}-12`, true, true)
          .toArray()
          .then(txs => params?.groupId
            ? txs.filter(t => t.group_id === params.groupId)
            : txs)
        : Promise.resolve([] as Transaction[]),
    [currentYear, mode, params?.groupId]
  );

  // Get previous year transactions for comparison - only in yearly mode
  const previousYearTransactions = useLiveQuery(
    () =>
      mode === "yearly"
        ? db.transactions
          .where("year_month")
          .between(`${previousYear}-01`, `${previousYear}-12`, true, true)
          .toArray()
          .then(txs => params?.groupId
            ? txs.filter(t => t.group_id === params.groupId)
            : txs)
        : Promise.resolve([] as Transaction[]),
    [previousYear, mode, params?.groupId]
  );

  const categories = useLiveQuery(() => db.categories.toArray());
  const contexts = useLiveQuery(() => db.contexts.toArray());

  // Fetch group memberships to calculate shares
  const groupMemberships = useLiveQuery(
    () => userId ? db.group_members.where("user_id").equals(userId).toArray() : Promise.resolve([] as GroupMember[]),
    [userId]
  );

  // Create a map of group_id -> share percentage
  const groupShareMap = useMemo(() => {
    const map = new Map<string, number>();
    if (groupMemberships) {
      groupMemberships.forEach(m => {
        map.set(m.group_id, m.share);
      });
    }
    return map;
  }, [groupMemberships]);

  // Helper to get effective amount (applying group share if applicable)
  const getEffectiveAmount = useCallback((t: Transaction) => {
    const amount = Number(t.amount);
    if (t.group_id && groupShareMap.has(t.group_id)) {
      const share = groupShareMap.get(t.group_id)!;
      return (amount * share) / 100;
    }
    return amount;
  }, [groupShareMap]);

  // Monthly statistics - #1 Lazy calculation: skip when in yearly mode
  const monthlyStats = useMemo(() => {
    const defaultStats = {
      income: 0,
      expense: 0,
      investment: 0,
      byCategory: [] as { name: string; value: number; color: string }[],
    };

    // Skip calculation if in yearly mode
    if (mode !== "monthly") return defaultStats;

    if (transactions && categories) {
      const categoryMap = new Map(categories.map((c) => [c.id, c]));

      transactions.forEach((t) => {
        if (t.deleted_at) return;

        const amount = getEffectiveAmount(t);
        if (t.type === "income") defaultStats.income += amount;
        else if (t.type === "expense") defaultStats.expense += amount;
        else if (t.type === "investment") defaultStats.investment += amount;

        if (t.type === "expense" && t.category_id) {
          const cat = categoryMap.get(t.category_id);
          if (cat) {
            const existing = defaultStats.byCategory.find(
              (c) => c.name === cat.name
            );
            if (existing) {
              existing.value += amount;
            } else {
              defaultStats.byCategory.push({
                name: cat.name,
                value: amount,
                color: cat.color,
              });
            }
          }
        }
      });
    }
    return defaultStats;
  }, [transactions, categories, mode, getEffectiveAmount]);

  // Yearly statistics - #1 Lazy calculation: skip when in monthly mode
  const yearlyStats = useMemo(() => {
    const stats = {
      income: 0,
      expense: 0,
      investment: 0,
      byCategory: [] as { name: string; value: number; color: string }[],
    };

    // Skip calculation if in monthly mode
    if (mode !== "yearly") return stats;

    if (yearlyTransactions && categories) {
      const categoryMap = new Map(categories.map((c) => [c.id, c]));

      yearlyTransactions.forEach((t) => {
        if (t.deleted_at) return;

        const amount = getEffectiveAmount(t);
        if (t.type === "income") stats.income += amount;
        else if (t.type === "expense") stats.expense += amount;
        else if (t.type === "investment") stats.investment += amount;

        if (t.type === "expense" && t.category_id) {
          const cat = categoryMap.get(t.category_id);
          if (cat) {
            const existing = stats.byCategory.find((c) => c.name === cat.name);
            if (existing) {
              existing.value += amount;
            } else {
              stats.byCategory.push({
                name: cat.name,
                value: amount,
                color: cat.color,
              });
            }
          }
        }
      });
    }
    return stats;
  }, [yearlyTransactions, categories, mode, getEffectiveAmount]);

  // Helper function to get root category (traverses up the parent chain)
  const getRootCategory = (
    categoryId: string,
    categoryMap: Map<string, Category>
  ): Category | undefined => {
    const cat = categoryMap.get(categoryId);
    if (!cat) return undefined;
    if (!cat.parent_id) return cat; // This is already a root
    return getRootCategory(cat.parent_id, categoryMap);
  };

  // Hierarchical expense data for stacked bar chart (monthly) - #1 Lazy calculation
  const monthlyExpensesByHierarchy = useMemo(() => {
    // Skip calculation if in yearly mode
    if (mode !== "monthly" || !transactions || !categories) return [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    // Map: rootCategoryId -> { rootName, rootColor, children: { childName -> amount } }
    const hierarchyMap = new Map<
      string,
      {
        rootId: string;
        rootName: string;
        rootColor: string;
        children: Map<string, { name: string; amount: number; color: string }>;
        total: number;
      }
    >();

    transactions.forEach((t) => {
      if (t.deleted_at || t.type !== "expense" || !t.category_id) return;

      const cat = categoryMap.get(t.category_id);
      if (!cat) return;

      const rootCat = getRootCategory(t.category_id, categoryMap);
      if (!rootCat) return;

      const amount = getEffectiveAmount(t);

      if (!hierarchyMap.has(rootCat.id)) {
        hierarchyMap.set(rootCat.id, {
          rootId: rootCat.id,
          rootName: rootCat.name,
          rootColor: rootCat.color,
          children: new Map(),
          total: 0,
        });
      }

      const entry = hierarchyMap.get(rootCat.id)!;
      entry.total += amount;

      // Use the actual category (could be root itself or a child/grandchild)
      const childKey = cat.id;
      if (entry.children.has(childKey)) {
        entry.children.get(childKey)!.amount += amount;
      } else {
        entry.children.set(childKey, {
          name: cat.name,
          amount,
          color: cat.color,
        });
      }
    });

    // Convert to array format suitable for stacked bar chart
    return Array.from(hierarchyMap.values())
      .map((entry) => ({
        rootName: entry.rootName,
        rootColor: entry.rootColor,
        total: entry.total,
        // Convert children map to object for Recharts
        ...Object.fromEntries(
          Array.from(entry.children.entries()).map(([, child]) => [
            child.name,
            child.amount,
          ])
        ),
        // Keep children array for config generation
        _children: Array.from(entry.children.values()),
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions, categories, mode, getEffectiveAmount]);

  // Hierarchical expense data for stacked bar chart (yearly) - #1 Lazy calculation
  const yearlyExpensesByHierarchy = useMemo(() => {
    // Skip calculation if in monthly mode
    if (mode !== "yearly" || !yearlyTransactions || !categories) return [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const hierarchyMap = new Map<
      string,
      {
        rootId: string;
        rootName: string;
        rootColor: string;
        children: Map<string, { name: string; amount: number; color: string }>;
        total: number;
      }
    >();

    yearlyTransactions.forEach((t) => {
      if (t.deleted_at || t.type !== "expense" || !t.category_id) return;

      const cat = categoryMap.get(t.category_id);
      if (!cat) return;

      const rootCat = getRootCategory(t.category_id, categoryMap);
      if (!rootCat) return;

      const amount = getEffectiveAmount(t);

      if (!hierarchyMap.has(rootCat.id)) {
        hierarchyMap.set(rootCat.id, {
          rootId: rootCat.id,
          rootName: rootCat.name,
          rootColor: rootCat.color,
          children: new Map(),
          total: 0,
        });
      }

      const entry = hierarchyMap.get(rootCat.id)!;
      entry.total += amount;

      const childKey = cat.id;
      if (entry.children.has(childKey)) {
        entry.children.get(childKey)!.amount += amount;
      } else {
        entry.children.set(childKey, {
          name: cat.name,
          amount,
          color: cat.color,
        });
      }
    });

    return Array.from(hierarchyMap.values())
      .map((entry) => ({
        rootName: entry.rootName,
        rootColor: entry.rootColor,
        total: entry.total,
        ...Object.fromEntries(
          Array.from(entry.children.entries()).map(([, child]) => [
            child.name,
            child.amount,
          ])
        ),
        _children: Array.from(entry.children.values()),
      }))
      .sort((a, b) => b.total - a.total);
  }, [yearlyTransactions, categories, mode, getEffectiveAmount]);

  // Calculate net balances
  const monthlyNetBalance = useMemo(
    () => monthlyStats.income - monthlyStats.expense,
    [monthlyStats]
  );
  const yearlyNetBalance = useMemo(
    () => yearlyStats.income - yearlyStats.expense,
    [yearlyStats]
  );

  // Calculate category percentages for radial chart (monthly) - #1 Lazy calculation
  const monthlyCategoryPercentages = useMemo(() => {
    // Skip calculation if in yearly mode
    if (mode !== "monthly" || !categories || !transactions) return [];

    const totalMonthlyExpense = monthlyStats.expense;
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const expensesByCategory = new Map<string, number>();

    // Aggregate expenses by category
    transactions.forEach((t) => {
      if (t.deleted_at || t.type !== "expense" || !t.category_id) return;
      const amount = getEffectiveAmount(t);
      expensesByCategory.set(
        t.category_id,
        (expensesByCategory.get(t.category_id) || 0) + amount
      );
    });

    // Aggregate child expenses into root categories
    const rootCategoryTotals = new Map<
      string,
      { name: string; value: number }
    >();

    expensesByCategory.forEach((value, categoryId) => {
      const category = categoryMap.get(categoryId);
      if (!category) return;

      // Find root category
      let rootCategory = category;
      while (rootCategory.parent_id) {
        const parent = categoryMap.get(rootCategory.parent_id);
        if (!parent) break;
        rootCategory = parent;
      }

      // Add to root category total
      const existing = rootCategoryTotals.get(rootCategory.id);
      if (existing) {
        existing.value += value;
      } else {
        rootCategoryTotals.set(rootCategory.id, {
          name: rootCategory.name,
          value: value,
        });
      }
    });

    // Convert to array and add colors + amount
    return Array.from(rootCategoryTotals.values()).map((cat, index) => ({
      name: cat.name,
      value:
        totalMonthlyExpense !== 0
          ? Math.round((cat.value / totalMonthlyExpense) * 100)
          : 0,
      amount: Math.round(cat.value * 100) / 100,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));
  }, [monthlyStats, categories, transactions, mode, getEffectiveAmount]);

  // Calculate category percentages for radial chart (yearly) - #1 Lazy calculation
  const yearlyCategoryPercentages = useMemo(() => {
    // Skip calculation if in monthly mode
    if (mode !== "yearly" || !categories || !yearlyTransactions) return [];

    const totalYearlyExpense = yearlyStats.expense;
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const expensesByCategory = new Map<string, number>();

    // Aggregate expenses by category
    yearlyTransactions.forEach((t) => {
      if (t.deleted_at || t.type !== "expense" || !t.category_id) return;
      const amount = getEffectiveAmount(t);
      expensesByCategory.set(
        t.category_id,
        (expensesByCategory.get(t.category_id) || 0) + amount
      );
    });

    // Aggregate child expenses into root categories
    const rootCategoryTotals = new Map<
      string,
      { name: string; value: number }
    >();

    expensesByCategory.forEach((value, categoryId) => {
      const category = categoryMap.get(categoryId);
      if (!category) return;

      // Find root category
      let rootCategory = category;
      while (rootCategory.parent_id) {
        const parent = categoryMap.get(rootCategory.parent_id);
        if (!parent) break;
        rootCategory = parent;
      }

      // Add to root category total
      const existing = rootCategoryTotals.get(rootCategory.id);
      if (existing) {
        existing.value += value;
      } else {
        rootCategoryTotals.set(rootCategory.id, {
          name: rootCategory.name,
          value: value,
        });
      }
    });

    // Convert to array and add colors + amount
    return Array.from(rootCategoryTotals.values()).map((cat, index) => ({
      name: cat.name,
      value:
        totalYearlyExpense !== 0
          ? Math.round((cat.value / totalYearlyExpense) * 100)
          : 0,
      amount: Math.round(cat.value * 100) / 100,
      fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));
  }, [yearlyStats, categories, yearlyTransactions, mode, getEffectiveAmount]);

  // Prepare monthly data for radar charts (selected year, all 12 months) - #1 Lazy calculation
  const { monthlyExpenses, monthlyIncome, monthlyInvestments } = useMemo(() => {
    const defaultData = {
      monthlyExpenses: [] as { month: string; value: number }[],
      monthlyIncome: [] as { month: string; value: number }[],
      monthlyInvestments: [] as { month: string; value: number }[],
    };

    // Skip calculation if in monthly mode - this data is only for yearly view
    if (mode !== "yearly") return defaultData;

    // Initialize with 0 for all months to ensure full radar chart rendering
    const monthNames = getMonthNames();

    // Initialize standard monthly data
    const expenses = monthNames.map((month) => ({
      month,
      value: 0,
      fullMark: 0,
    }));

    const income = monthNames.map((month) => ({
      month,
      value: 0,
      fullMark: 0,
    }));

    const investments = monthNames.map((month) => ({
      month,
      value: 0,
      fullMark: 0,
    }));

    // Aggregate yearly transactions by month
    if (yearlyTransactions) {
      yearlyTransactions.forEach((t) => {
        if (t.deleted_at) return;

        const txMonth = new Date(t.date).getMonth(); // 0-11
        const amount = getEffectiveAmount(t);

        if (t.type === "expense") {
          expenses[txMonth].value += amount;
        } else if (t.type === "income") {
          income[txMonth].value += amount;
        } else if (t.type === "investment") {
          investments[txMonth].value += amount;
        }
      });
    }
    return {
      monthlyExpenses: expenses,
      monthlyIncome: income,
      monthlyInvestments: investments,
    };
  }, [yearlyTransactions, mode, getEffectiveAmount, getMonthNames]);

  // Calculate daily cumulative expenses for current month - #1 Lazy calculation
  const dailyCumulativeExpenses = useMemo(() => {
    const result: { day: string; cumulative: number; projection?: number }[] =
      [];

    // Skip calculation if in yearly mode
    if (mode !== "monthly" || !transactions) return result;

    // Get the number of days in the current month
    const [year, month] = currentMonth.split("-");
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

    // Get current day (only if we're viewing the current month)
    const today = new Date();
    const isCurrentMonth = currentMonth === format(today, "yyyy-MM");
    const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

    // Initialize daily totals
    const dailyTotals = new Map<number, number>();
    for (let day = 1; day <= daysInMonth; day++) {
      dailyTotals.set(day, 0);
    }

    // Aggregate expenses by day
    transactions.forEach((t) => {
      if (t.deleted_at || t.type !== "expense") return;
      const day = new Date(t.date).getDate();
      dailyTotals.set(day, (dailyTotals.get(day) || 0) + getEffectiveAmount(t));
    });

    // Calculate cumulative totals
    let cumulative = 0;
    let cumulativeAtCurrentDay = 0;

    // First pass: calculate cumulative up to current day
    for (let day = 1; day <= currentDay; day++) {
      cumulative += dailyTotals.get(day) || 0;
    }
    cumulativeAtCurrentDay = cumulative;

    // Calculate daily average for projection
    const dailyAverage =
      currentDay > 0 ? cumulativeAtCurrentDay / currentDay : 0;

    // Second pass: build result array with linear projection
    cumulative = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      cumulative += dailyTotals.get(day) || 0;

      // Linear projection: from current day, grows by dailyAverage each day
      const projection =
        day >= currentDay
          ? cumulativeAtCurrentDay + dailyAverage * (day - currentDay)
          : undefined;

      // For future days, we don't want to show 0, we want to show nothing (break the line)
      // Unless it's the current day, where we show the actual value
      const cumulativeValue =
        day <= currentDay ? Math.round(cumulative * 100) / 100 : undefined;

      result.push({
        day: day.toString(),
        cumulative: cumulativeValue as number, // Cast to number to satisfy type, but Recharts handles undefined/null
        projection:
          projection !== undefined
            ? Math.round(projection * 100) / 100
            : undefined,
      });
    }
    return result;
  }, [transactions, currentMonth, mode, getEffectiveAmount]);

  // ============================================
  // NEW CHART DATA CALCULATIONS
  // ============================================

  // 1. TEMPORAL TREND DATA (Line/Area Chart)
  // Yearly view: Monthly trend - #1 Lazy calculation
  const monthlyTrendData = useMemo(() => {
    const data: {
      period: string;
      income: number;
      expense: number;
      balance: number;
    }[] = [];

    // Skip calculation if in monthly mode
    if (mode !== "yearly" || !yearlyTransactions) return data;
    // Monthly trend for selected year
    // Monthly trend for selected year
    const monthNames = getMonthNames();
    const monthlyMap = new Map<number, { income: number; expense: number }>();

    // Determine how many months to show (don't show future months for current year)
    const today = new Date();
    const isCurrentYear = currentYear === today.getFullYear().toString();
    const maxMonth = isCurrentYear ? today.getMonth() : 11; // 0-indexed

    for (let i = 0; i <= maxMonth; i++) {
      monthlyMap.set(i, { income: 0, expense: 0 });
    }

    yearlyTransactions.forEach((t) => {
      if (t.deleted_at) return;
      const monthIdx = new Date(t.date).getMonth();
      if (monthIdx > maxMonth) return; // Skip future months
      const amount = getEffectiveAmount(t);
      const entry = monthlyMap.get(monthIdx);
      if (entry) {
        if (t.type === "income") entry.income += amount;
        else if (t.type === "expense") entry.expense += amount;
      }
    });

    for (let i = 0; i <= maxMonth; i++) {
      const entry = monthlyMap.get(i)!;
      data.push({
        period: monthNames[i],
        income: Math.round(entry.income * 100) / 100,
        expense: Math.round(entry.expense * 100) / 100,
        balance: Math.round((entry.income - entry.expense) * 100) / 100,
      });
    }
    return data;
  }, [yearlyTransactions, mode, currentYear, getEffectiveAmount, getMonthNames]);

  // 2. CASH FLOW DATA (Stacked Bar/Area Chart)
  // Monthly aggregation for yearly view - #1 Lazy calculation
  const monthlyCashFlow = useMemo(() => {
    const data: { period: string; income: number; expense: number }[] = [];

    // Skip calculation if in monthly mode
    if (mode !== "yearly" || !yearlyTransactions) return data;
    // Monthly cash flow for selected year
    // Monthly cash flow for selected year
    const monthNames = getMonthNames();

    // Determine how many months to show (don't show future months for current year)
    const today = new Date();
    const isCurrentYear = currentYear === today.getFullYear().toString();
    const maxMonth = isCurrentYear ? today.getMonth() : 11; // 0-indexed

    for (let i = 0; i <= maxMonth; i++) {
      data.push({ period: monthNames[i], income: 0, expense: 0 });
    }

    yearlyTransactions.forEach((t) => {
      if (t.deleted_at) return;
      const monthIdx = new Date(t.date).getMonth();
      if (monthIdx > maxMonth) return; // Skip future months
      const amount = getEffectiveAmount(t);

      if (t.type === "income") data[monthIdx].income += amount;
      else if (t.type === "expense") data[monthIdx].expense += amount;
    });
    return data;
  }, [yearlyTransactions, mode, currentYear, getEffectiveAmount, getMonthNames]);

  // 3. CONTEXT ANALYTICS - Enhanced with detailed stats
  const contextStats = useMemo(() => {
    interface ContextStat {
      id: string;
      name: string;
      total: number;
      transactionCount: number;
      avgPerTransaction: number;
      topCategory: string | null;
      topCategoryAmount: number;
      categoryBreakdown: { name: string; amount: number; percentage: number }[];
      fill: string;
    }

    const stats: ContextStat[] = [];

    if (transactions && contexts && categories) {
      const contextMap = new Map(
        contexts.filter((c) => !c.deleted_at).map((c) => [c.id, c])
      );
      const categoryMap = new Map(categories.map((c) => [c.id, c]));

      // Aggregate data per context
      const contextData = new Map<
        string,
        {
          total: number;
          count: number;
          categories: Map<string, number>;
        }
      >();

      transactions.forEach((t) => {
        if (t.deleted_at || t.type !== "expense" || !t.context_id) return;

        const amount = getEffectiveAmount(t);
        let existing = contextData.get(t.context_id);
        if (!existing) {
          contextData.set(t.context_id, existing = {
            total: 0,
            count: 0,
            categories: new Map<string, number>(),
          });
        }

        existing.total += amount;
        existing.count += 1;

        if (t.category_id) {
          existing.categories.set(
            t.category_id,
            (existing.categories.get(t.category_id) || 0) + amount
          );
        }

        contextData.set(t.context_id, existing);
      });

      let colorIdx = 0;
      contextData.forEach((data, contextId) => {
        const ctx = contextMap.get(contextId);
        if (!ctx) return;

        // Find top category
        let topCategoryId: string | null = null;
        let topCategoryAmount = 0;
        data.categories.forEach((amount, catId) => {
          if (amount > topCategoryAmount) {
            topCategoryAmount = amount;
            topCategoryId = catId;
          }
        });

        const topCategory = topCategoryId
          ? categoryMap.get(topCategoryId)?.name || null
          : null;

        // Build category breakdown
        const categoryBreakdown: {
          name: string;
          amount: number;
          percentage: number;
        }[] = [];
        data.categories.forEach((amount, catId) => {
          const cat = categoryMap.get(catId);
          if (cat) {
            categoryBreakdown.push({
              name: cat.name,
              amount: Math.round(amount * 100) / 100,
              percentage: data.total > 0 ? (amount / data.total) * 100 : 0,
            });
          }
        });
        categoryBreakdown.sort((a, b) => b.amount - a.amount);

        stats.push({
          id: contextId,
          name: ctx.name,
          total: Math.round(data.total * 100) / 100,
          transactionCount: data.count,
          avgPerTransaction:
            data.count > 0
              ? Math.round((data.total / data.count) * 100) / 100
              : 0,
          topCategory,
          topCategoryAmount: Math.round(topCategoryAmount * 100) / 100,
          categoryBreakdown,
          fill: `hsl(var(--chart-${(colorIdx++ % 5) + 1}))`,
        });
      });

      // Sort by total descending
      stats.sort((a, b) => b.total - a.total);
    }
    return stats;
  }, [transactions, contexts, categories]);

  // Get all-time data for historical average (used in Burn Rate)
  const allTimeTransactions = useLiveQuery(() => db.transactions.toArray());

  // 5. BURN RATE (Monthly)
  const burnRate = useMemo(() => {
    const rate = {
      dailyAverage: 0,
      projectedMonthEnd: 0,
      daysElapsed: 0,
      daysRemaining: 0,
      onTrack: true,
      noBudget: true,
    };

    if (transactions && allTimeTransactions) {
      const [year, month] = currentMonth.split("-");
      const daysInMonth = new Date(
        parseInt(year),
        parseInt(month),
        0
      ).getDate();
      const today = new Date();
      const isCurrentMonth = currentMonth === format(today, "yyyy-MM");
      const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

      const totalExpenses = monthlyStats.expense;
      rate.daysElapsed = currentDay;
      rate.daysRemaining = daysInMonth - currentDay;
      rate.dailyAverage = currentDay > 0 ? totalExpenses / currentDay : 0;
      rate.projectedMonthEnd = rate.dailyAverage * daysInMonth;

      // Simple heuristic: on track if current spending rate is less than 110% of historical average
      const historicalMonthlyAverage = allTimeTransactions
        ? allTimeTransactions
          .filter((t) => !t.deleted_at && t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0) /
        Math.max(
          new Set(allTimeTransactions.map((t) => t.year_month)).size,
          1
        )
        : 0;

      rate.noBudget = historicalMonthlyAverage === 0;
      rate.onTrack =
        rate.noBudget ||
        rate.projectedMonthEnd <= historicalMonthlyAverage * 1.1;
    }
    return rate;
  }, [transactions, allTimeTransactions, currentMonth, monthlyStats]);

  // 5b. BURN RATE (Yearly)
  const yearlyBurnRate = useMemo(() => {
    const rate = {
      dailyAverage: 0,
      projectedYearEnd: 0,
      daysElapsed: 0,
      daysRemaining: 0,
      onTrack: true,
      noBudget: true,
    };

    if (yearlyTransactions && allTimeTransactions) {
      const year = parseInt(currentYear);
      const isLeapYear =
        (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      const daysInYear = isLeapYear ? 366 : 365;
      const today = new Date();
      const isCurrentYear = currentYear === format(today, "yyyy");

      let currentDay = daysInYear;
      if (isCurrentYear) {
        const startOfYear = new Date(year, 0, 1);
        const diffTime = Math.abs(today.getTime() - startOfYear.getTime());
        currentDay = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const totalExpenses = yearlyStats.expense;
      rate.daysElapsed = currentDay;
      rate.daysRemaining = daysInYear - currentDay;
      rate.dailyAverage = currentDay > 0 ? totalExpenses / currentDay : 0;
      rate.projectedYearEnd = rate.dailyAverage * daysInYear;

      // Simple heuristic for yearly on track
      const historicalYearlyAverage = allTimeTransactions
        ? allTimeTransactions
          .filter((t) => !t.deleted_at && t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0) /
        Math.max(
          new Set(
            allTimeTransactions.map((t) => t.year_month.substring(0, 4))
          ).size,
          1
        )
        : 0;

      rate.noBudget = historicalYearlyAverage === 0;
      rate.onTrack =
        rate.noBudget || rate.projectedYearEnd <= historicalYearlyAverage * 1.1;
    }
    return rate;
  }, [yearlyTransactions, allTimeTransactions, currentYear, yearlyStats]);

  // ============================================
  // PERIOD COMPARISON DATA
  // ============================================

  // Calculate daily cumulative expenses for comparison month
  const previousMonthCumulativeExpenses = useMemo(() => {
    const result: { day: string; cumulative: number }[] = [];

    if (previousMonthTransactions) {
      // Get the number of days in the previous month
      const [year, month] = previousMonth.split("-");
      const daysInMonth = new Date(
        parseInt(year),
        parseInt(month),
        0
      ).getDate();

      // Initialize daily totals
      const dailyTotals = new Map<number, number>();
      for (let day = 1; day <= daysInMonth; day++) {
        dailyTotals.set(day, 0);
      }

      // Aggregate expenses by day
      previousMonthTransactions.forEach((t) => {
        if (t.deleted_at || t.type !== "expense") return;
        const day = new Date(t.date).getDate();
        dailyTotals.set(day, (dailyTotals.get(day) || 0) + Number(t.amount));
      });

      // Calculate cumulative totals
      let cumulative = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        cumulative += dailyTotals.get(day) || 0;
        result.push({
          day: day.toString(),
          cumulative: Math.round(cumulative * 100) / 100,
        });
      }
    }
    return result;
  }, [previousMonthTransactions, previousMonth]);

  // Calculate monthly cumulative expenses for current year
  const yearlyCumulativeExpenses = useMemo(() => {
    const result: { month: string; cumulative: number }[] = [];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    if (yearlyTransactions) {
      // Initialize monthly totals
      const monthlyTotals = new Array(12).fill(0);

      // Aggregate expenses by month
      yearlyTransactions.forEach((t) => {
        if (t.deleted_at || t.type !== "expense") return;
        const monthIdx = new Date(t.date).getMonth();
        monthlyTotals[monthIdx] += Number(t.amount);
      });

      // Calculate cumulative totals
      let cumulative = 0;
      const today = new Date();
      const isCurrentYear = currentYear === today.getFullYear().toString();
      const currentMonthIndex = today.getMonth();

      for (let i = 0; i < 12; i++) {
        cumulative += monthlyTotals[i];

        // For future months in the current year, return null to break the line
        // Unless it's the current month, where we show the value
        const shouldShow = !isCurrentYear || i <= currentMonthIndex;

        result.push({
          month: monthNames[i],
          cumulative: shouldShow
            ? Math.round(cumulative * 100) / 100
            : (null as unknown as number), // Cast to satisfy type, Recharts handles null
        });
      }
    }
    return result;
  }, [yearlyTransactions]);

  // Calculate monthly cumulative expenses for comparison year
  const previousYearCumulativeExpenses = useMemo(() => {
    const result: { month: string; cumulative: number }[] = [];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    if (previousYearTransactions) {
      // Initialize monthly totals
      const monthlyTotals = new Array(12).fill(0);

      // Aggregate expenses by month
      previousYearTransactions.forEach((t) => {
        if (t.deleted_at || t.type !== "expense") return;
        const monthIdx = new Date(t.date).getMonth();
        monthlyTotals[monthIdx] += Number(t.amount);
      });

      // Calculate cumulative totals
      let cumulative = 0;
      for (let i = 0; i < 12; i++) {
        cumulative += monthlyTotals[i];
        result.push({
          month: monthNames[i],
          cumulative: Math.round(cumulative * 100) / 100,
        });
      }
    }
    return result;
  }, [previousYearTransactions]);

  // Previous month statistics
  const previousMonthStats = useMemo(() => {
    const stats = {
      income: 0,
      expense: 0,
      investment: 0,
      byCategory: [] as { name: string; value: number; color: string }[],
    };

    if (previousMonthTransactions && categories) {
      const categoryMap = new Map(categories.map((c) => [c.id, c]));

      // Point-in-time comparison logic
      const today = new Date();
      const isCurrentMonthSelected = currentMonth === format(today, "yyyy-MM");
      const currentDay = today.getDate();

      previousMonthTransactions.forEach((t) => {
        if (t.deleted_at) return;

        // If comparing with current month, only include transactions up to the current day
        // This handles shorter months automatically (e.g. if today is March 30, and prev month is Feb,
        // we include all Feb transactions since their days (1-28/29) are all <= 30)
        if (isCurrentMonthSelected) {
          const tDay = new Date(t.date).getDate();
          if (tDay > currentDay) return;
        }

        const amount = getEffectiveAmount(t);
        if (t.type === "income") stats.income += amount;
        else if (t.type === "expense") stats.expense += amount;
        else if (t.type === "investment") stats.investment += amount;

        if (t.type === "expense" && t.category_id) {
          const cat = categoryMap.get(t.category_id);
          if (cat) {
            const existing = stats.byCategory.find((c) => c.name === cat.name);
            if (existing) {
              existing.value += amount;
            } else {
              stats.byCategory.push({
                name: cat.name,
                value: amount,
                color: cat.color,
              });
            }
          }
        }
      });
    }
    return stats;
  }, [previousMonthTransactions, categories, currentMonth, getEffectiveAmount]);

  // Previous year statistics
  const previousYearStats = useMemo(() => {
    const stats = {
      income: 0,
      expense: 0,
      investment: 0,
      byCategory: [] as { name: string; value: number; color: string }[],
    };

    if (previousYearTransactions && categories) {
      const categoryMap = new Map(categories.map((c) => [c.id, c]));

      // Point-in-time comparison logic
      const today = new Date();
      const isCurrentYearSelected = currentYear === format(today, "yyyy");
      const currentDay = today.getDate();
      const currentMonthIndex = today.getMonth(); // 0-11

      previousYearTransactions.forEach((t) => {
        if (t.deleted_at) return;

        // If comparing with current year, only include transactions up to the current date
        if (isCurrentYearSelected) {
          const tDate = new Date(t.date);
          const tMonth = tDate.getMonth();
          const tDay = tDate.getDate();

          // Skip if month is in the future
          if (tMonth > currentMonthIndex) return;

          // If same month, check day
          if (tMonth === currentMonthIndex && tDay > currentDay) return;
        }

        const amount = getEffectiveAmount(t);
        if (t.type === "income") stats.income += amount;
        else if (t.type === "expense") stats.expense += amount;
        else if (t.type === "investment") stats.investment += amount;

        if (t.type === "expense" && t.category_id) {
          const cat = categoryMap.get(t.category_id);
          if (cat) {
            const existing = stats.byCategory.find((c) => c.name === cat.name);
            if (existing) {
              existing.value += amount;
            } else {
              stats.byCategory.push({
                name: cat.name,
                value: amount,
                color: cat.color,
              });
            }
          }
        }
      });
    }
    return stats;
  }, [previousYearTransactions, categories, currentYear, getEffectiveAmount]);

  // Monthly comparison (current vs previous month)
  const monthlyComparison = useMemo(() => {
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      income: {
        current: monthlyStats.income,
        previous: previousMonthStats.income,
        change: calcChange(monthlyStats.income, previousMonthStats.income),
        trend: monthlyStats.income >= previousMonthStats.income ? "up" : "down",
      },
      expense: {
        current: monthlyStats.expense,
        previous: previousMonthStats.expense,
        change: calcChange(monthlyStats.expense, previousMonthStats.expense),
        trend:
          monthlyStats.expense <= previousMonthStats.expense ? "up" : "down",
      },
      investment: {
        current: monthlyStats.investment,
        previous: previousMonthStats.investment,
        change: calcChange(
          monthlyStats.investment,
          previousMonthStats.investment
        ),
        trend:
          monthlyStats.investment >= previousMonthStats.investment
            ? "up"
            : "down",
      },
      balance: {
        current: monthlyNetBalance,
        previous: previousMonthStats.income - previousMonthStats.expense,
        change: calcChange(
          monthlyNetBalance,
          previousMonthStats.income - previousMonthStats.expense
        ),
        trend:
          monthlyNetBalance >=
            previousMonthStats.income - previousMonthStats.expense
            ? "up"
            : "down",
      },
      savingRate: {
        current:
          monthlyStats.income > 0
            ? ((monthlyStats.income - monthlyStats.expense) /
              monthlyStats.income) *
            100
            : 0,
        previous:
          previousMonthStats.income > 0
            ? ((previousMonthStats.income - previousMonthStats.expense) /
              previousMonthStats.income) *
            100
            : 0,
      },
    };
  }, [monthlyStats, previousMonthStats, monthlyNetBalance]);

  // Yearly comparison (current vs previous year)
  const yearlyComparison = useMemo(() => {
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      income: {
        current: yearlyStats.income,
        previous: previousYearStats.income,
        change: calcChange(yearlyStats.income, previousYearStats.income),
        trend: yearlyStats.income >= previousYearStats.income ? "up" : "down",
      },
      expense: {
        current: yearlyStats.expense,
        previous: previousYearStats.expense,
        change: calcChange(yearlyStats.expense, previousYearStats.expense),
        trend: yearlyStats.expense <= previousYearStats.expense ? "up" : "down",
      },
      investment: {
        current: yearlyStats.investment,
        previous: previousYearStats.investment,
        change: calcChange(
          yearlyStats.investment,
          previousYearStats.investment
        ),
        trend:
          yearlyStats.investment >= previousYearStats.investment
            ? "up"
            : "down",
      },
      balance: {
        current: yearlyNetBalance,
        previous: previousYearStats.income - previousYearStats.expense,
        change: calcChange(
          yearlyNetBalance,
          previousYearStats.income - previousYearStats.expense
        ),
        trend:
          yearlyNetBalance >=
            previousYearStats.income - previousYearStats.expense
            ? "up"
            : "down",
      },
      savingRate: {
        current:
          yearlyStats.income > 0
            ? ((yearlyStats.income - yearlyStats.expense) /
              yearlyStats.income) *
            100
            : 0,
        previous:
          previousYearStats.income > 0
            ? ((previousYearStats.income - previousYearStats.expense) /
              previousYearStats.income) *
            100
            : 0,
      },
    };
  }, [yearlyStats, previousYearStats, yearlyNetBalance]);

  // Category comparison (which categories increased/decreased)
  const categoryComparison = useMemo(() => {
    const currentCats = new Map(
      monthlyStats.byCategory.map((c) => [c.name, c.value])
    );
    const prevCats = new Map(
      previousMonthStats.byCategory.map((c) => [c.name, c.value])
    );

    const allCategoryNames = new Set([
      ...currentCats.keys(),
      ...prevCats.keys(),
    ]);

    return Array.from(allCategoryNames)
      .map((name) => {
        const current = currentCats.get(name) || 0;
        const previous = prevCats.get(name) || 0;
        const change =
          previous > 0
            ? ((current - previous) / previous) * 100
            : current > 0
              ? 100
              : 0;

        return {
          name,
          current,
          previous,
          change,
          trend: current <= previous ? "improved" : "worsened",
        };
      })
      .sort((a, b) => b.change - a.change);
  }, [monthlyStats.byCategory, previousMonthStats.byCategory]);

  // 6. RECURRING VS ONE-TIME
  // (Not currently returned or used in the original code, but was calculated.
  // If it's not used in the return object, we can skip it, but I'll memoize it just in case it's added later or I missed it)
  // Actually, checking the return statement... it is NOT returned.
  // However, I will leave it out if it's not returned to save performance.
  // Wait, let me double check the original file content.
  // It was calculated but NOT returned in the original file.
  // I will skip it to optimize further!

  // 7. CALENDAR HEATMAP
  // (Also not returned in the original file? Let me check line 438-458 of original file)
  // Original return:
  // 438:     return {
  // 439:         currentMonth,
  // 440:         currentYear,
  // 441:         monthlyStats,
  // 442:         monthlyNetBalance,
  // 443:         monthlyCategoryPercentages,
  // 444:         yearlyStats,
  // 445:         yearlyNetBalance,
  // 446:         yearlyCategoryPercentages,
  // 447:         monthlyExpenses,
  // 448:         monthlyIncome,
  // 449:         monthlyInvestments,
  // 450:         dailyCumulativeExpenses,
  // 451:         // New chart data
  // 452:         monthlyTrendData,
  // 453:         monthlyCashFlow,
  // 454:         contextStats,
  // 455:         burnRate,
  // 456:         yearlyBurnRate,
  // 457:     };
  // Correct, recurringVsOneTime and calendarHeatmap were calculated but NOT returned.
  // I will remove them completely to improve performance.

  const isLoading =
    (mode === "monthly" && !transactions) ||
    (mode === "yearly" && !yearlyTransactions) ||
    !categories;

  return {
    isLoading,
    currentMonth,
    currentYear,
    monthlyStats,
    monthlyNetBalance,
    monthlyCategoryPercentages,
    yearlyStats,
    yearlyNetBalance,
    yearlyCategoryPercentages,
    monthlyExpenses,
    monthlyIncome,
    monthlyInvestments,
    dailyCumulativeExpenses,
    monthlyTrendData,
    monthlyCashFlow,
    contextStats,
    burnRate,
    yearlyBurnRate,
    // Period comparison data
    previousMonth,
    previousYear,
    previousMonthCumulativeExpenses,
    yearlyCumulativeExpenses,
    previousYearCumulativeExpenses,
    previousMonthStats,
    previousYearStats,
    monthlyComparison,
    yearlyComparison,
    categoryComparison,
    // Hierarchical expense data for stacked bar charts
    monthlyExpensesByHierarchy,
    yearlyExpensesByHierarchy,
  };
}
