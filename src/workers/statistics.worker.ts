import { Category, Transaction, GroupMember, Context, CategoryBudget } from "../lib/db";
import { StatisticsWorkerRequest, CategoryStat, CategoryPercentage, HierarchyNode, TrendData, CashFlowData, ContextStat, DailyCumulativeData, RadarData, ContextTrendData, GroupBalance, BudgetHealth } from "../types/worker";

// Helper type for the worker context
const ctx: Worker = self as unknown as Worker;

// Helper to calculate effective amount (shared logic)
const getEffectiveAmount = (
    t: Transaction,
    groupShareMap: Map<string, number>
) => {
    const amount = Number(t.amount);
    if (t.group_id && groupShareMap.has(t.group_id)) {
        const share = groupShareMap.get(t.group_id)!;
        return (amount * share) / 100;
    }
    return amount;
};

// Helper for root category
const getRootCategory = (
    categoryId: string,
    categoryMap: Map<string, Category>
): Category | undefined => {
    const cat = categoryMap.get(categoryId);
    if (!cat) return undefined;
    if (!cat.parent_id) return cat; // This is already a root
    return getRootCategory(cat.parent_id, categoryMap);
};

// Main message handler
ctx.onmessage = (event: MessageEvent<StatisticsWorkerRequest>) => {
    const {
        transactions, // Monthly transactions
        yearlyTransactions, // Yearly transactions
        categories,
        contexts,
        // groupId,
        mode,
        currentMonth,
        currentYear,
        groupMemberships,
        activeGroupMembers,
    } = event.data.payload;

    // Pre-calculate share map
    const groupShareMap = new Map<string, number>();
    if (groupMemberships) {
        groupMemberships.forEach((m: GroupMember) => {
            groupShareMap.set(m.group_id, m.share);
        });
    }

    const categoryMap = new Map(categories.map((c: Category) => [c.id, c]));

    // --- 1. Monthly Statistics ---
    const monthlyStats = {
        income: 0,
        expense: 0,
        investment: 0,
        byCategory: [] as CategoryStat[],
    };

    if (mode === "monthly" && transactions) {
        transactions.forEach((t: Transaction) => {
            if (t.deleted_at) return;

            const amount = getEffectiveAmount(t, groupShareMap);
            if (t.type === "income") monthlyStats.income += amount;
            else if (t.type === "expense") monthlyStats.expense += amount;
            else if (t.type === "investment") monthlyStats.investment += amount;

            if (t.type === "expense" && t.category_id) {
                const cat = categoryMap.get(t.category_id);
                if (cat) {
                    const existing = monthlyStats.byCategory.find(
                        (c) => c.name === cat.name
                    );
                    if (existing) {
                        existing.value += amount;
                    } else {
                        monthlyStats.byCategory.push({
                            name: cat.name,
                            value: amount,
                            color: cat.color,
                        });
                    }
                }
            }
        });
    }

    // --- 2. Yearly Statistics ---
    const yearlyStats = {
        income: 0,
        expense: 0,
        investment: 0,
        byCategory: [] as CategoryStat[],
    };

    if (mode === "yearly" && yearlyTransactions) {
        yearlyTransactions.forEach((t: Transaction) => {
            if (t.deleted_at) return;

            const amount = getEffectiveAmount(t, groupShareMap);
            if (t.type === "income") yearlyStats.income += amount;
            else if (t.type === "expense") yearlyStats.expense += amount;
            else if (t.type === "investment") yearlyStats.investment += amount;

            if (t.type === "expense" && t.category_id) {
                const cat = categoryMap.get(t.category_id);
                if (cat) {
                    const existing = yearlyStats.byCategory.find((c) => c.name === cat.name);
                    if (existing) {
                        existing.value += amount;
                    } else {
                        yearlyStats.byCategory.push({
                            name: cat.name,
                            value: amount,
                            color: cat.color,
                        });
                    }
                }
            }
        });
    }

    // --- 3. Balances ---
    const monthlyNetBalance = monthlyStats.income - monthlyStats.expense;
    const yearlyNetBalance = yearlyStats.income - yearlyStats.expense;

    // --- 4. Monthly Category Percentages ---
    let monthlyCategoryPercentages: CategoryPercentage[] = [];
    if (mode === "monthly" && transactions) {
        const totalMonthlyExpense = monthlyStats.expense;
        const expensesByCategory = new Map<string, number>();

        // Aggregate expenses by category
        transactions.forEach((t: Transaction) => {
            if (t.deleted_at || t.type !== "expense" || !t.category_id) return;
            const amount = getEffectiveAmount(t, groupShareMap);
            expensesByCategory.set(
                t.category_id,
                (expensesByCategory.get(t.category_id) || 0) + amount
            );
        });

        // Aggregate child expenses into root categories
        const rootCategoryTotals = new Map<
            string,
            { name: string; value: number; color: string }
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
                    color: rootCategory.color,
                });
            }
        });

        // Convert to array and add colors + amount
        monthlyCategoryPercentages = Array.from(rootCategoryTotals.values()).map((cat, index) => ({
            name: cat.name,
            value:
                totalMonthlyExpense !== 0
                    ? Math.round((cat.value / totalMonthlyExpense) * 100)
                    : 0,
            amount: Math.round(cat.value * 100) / 100,
            color: cat.color,
            fill: `hsl(var(--chart-${(index % 5) + 1}))`,
        }));
    }

    // --- 5. Yearly Category Percentages ---
    let yearlyCategoryPercentages: CategoryPercentage[] = [];
    if (mode === "yearly" && yearlyTransactions) {
        const totalYearlyExpense = yearlyStats.expense;
        const expensesByCategory = new Map<string, number>();

        // Aggregate expenses by category
        yearlyTransactions.forEach((t: Transaction) => {
            if (t.deleted_at || t.type !== "expense" || !t.category_id) return;
            const amount = getEffectiveAmount(t, groupShareMap);
            expensesByCategory.set(
                t.category_id,
                (expensesByCategory.get(t.category_id) || 0) + amount
            );
        });

        // Aggregate child expenses into root categories
        const rootCategoryTotals = new Map<
            string,
            { name: string; value: number; color: string }
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
                    color: rootCategory.color,
                });
            }
        });

        yearlyCategoryPercentages = Array.from(rootCategoryTotals.values()).map((cat, index) => ({
            name: cat.name,
            value:
                totalYearlyExpense !== 0
                    ? Math.round((cat.value / totalYearlyExpense) * 100)
                    : 0,
            amount: Math.round(cat.value * 100) / 100,
            color: cat.color,
            fill: `hsl(var(--chart-${(index % 5) + 1}))`,
        }));
    }

    // --- 6. Monthly Expenses Hierarchy ---
    let monthlyExpensesByHierarchy: HierarchyNode[] = [];
    if (mode === "monthly" && transactions) {
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

        transactions.forEach((t: Transaction) => {
            if (t.deleted_at || t.type !== "expense" || !t.category_id) return;

            const cat = categoryMap.get(t.category_id);
            if (!cat) return;

            const rootCat = getRootCategory(t.category_id, categoryMap);
            if (!rootCat) return;

            const amount = getEffectiveAmount(t, groupShareMap);

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

        monthlyExpensesByHierarchy = Array.from(hierarchyMap.values())
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
    }

    // --- 7. Yearly Expenses Hierarchy ---
    let yearlyExpensesByHierarchy: HierarchyNode[] = [];
    if (mode === "yearly" && yearlyTransactions) {
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

        yearlyTransactions.forEach((t: Transaction) => {
            if (t.deleted_at || t.type !== "expense" || !t.category_id) return;

            const cat = categoryMap.get(t.category_id);
            if (!cat) return;

            const rootCat = getRootCategory(t.category_id, categoryMap);
            if (!rootCat) return;

            const amount = getEffectiveAmount(t, groupShareMap);

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

        yearlyExpensesByHierarchy = Array.from(hierarchyMap.values())
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
    }

    // --- 8. Monthly Trend Data & Cash Flow (Yearly View) ---
    const monthlyTrendData: TrendData[] = [];
    const monthlyCashFlow: CashFlowData[] = [];

    // Data for Radar Charts
    const monthlyExpenses: RadarData[] = [];
    const monthlyIncome: RadarData[] = [];
    const monthlyInvestments: RadarData[] = [];

    // Data for Context Trends (Stacked Bar/Line)
    const monthlyContextTrends: ContextTrendData[] = [];

    // Data for Recurring vs One-off


    if (mode === "yearly" && yearlyTransactions) {
        const today = new Date();
        const isCurrentYear = currentYear === today.getFullYear().toString();
        const maxMonth = isCurrentYear ? today.getMonth() : 11; // 0-indexed

        const monthlyTrendMap = new Map<number, { income: number; expense: number }>();
        const monthlyCashFlowMap = new Map<number, { income: number; expense: number }>();

        const radarExpensesMap = new Map<number, number>();
        const radarIncomeMap = new Map<number, number>();
        const radarInvestmentsMap = new Map<number, number>();

        // Map<MonthIndex, Map<ContextId, Amount>>
        const contextTrendMap = new Map<number, Map<string, number>>();


        for (let i = 0; i <= 11; i++) {
            monthlyTrendMap.set(i, { income: 0, expense: 0 });
            monthlyCashFlowMap.set(i, { income: 0, expense: 0 });
            radarExpensesMap.set(i, 0);
            radarIncomeMap.set(i, 0);
            radarInvestmentsMap.set(i, 0);
            contextTrendMap.set(i, new Map());

        }

        yearlyTransactions.forEach((t: Transaction) => {
            if (t.deleted_at) return;
            const monthIdx = new Date(t.date).getMonth();

            const amount = getEffectiveAmount(t, groupShareMap);

            // Radar Data (All months)
            if (t.type === "expense") {
                radarExpensesMap.set(monthIdx, radarExpensesMap.get(monthIdx)! + amount);

                // Context Trend Data
                if (t.context_id) {
                    const monthContexts = contextTrendMap.get(monthIdx)!;
                    monthContexts.set(t.context_id, (monthContexts.get(t.context_id) || 0) + amount);
                }


            }
            else if (t.type === "income") radarIncomeMap.set(monthIdx, radarIncomeMap.get(monthIdx)! + amount);
            else if (t.type === "investment") radarInvestmentsMap.set(monthIdx, radarInvestmentsMap.get(monthIdx)! + amount);

            if (monthIdx > maxMonth) return; // Trend/Cashflow stop at current month

            const trendEntry = monthlyTrendMap.get(monthIdx)!;
            const cashFlowEntry = monthlyCashFlowMap.get(monthIdx)!;

            // Trend logic
            if (t.type === "income") trendEntry.income += amount;
            else if (t.type === "expense") trendEntry.expense += amount;

            // Cash flow logic (same as trend basically for this part)
            if (t.type === "income") cashFlowEntry.income += amount;
            else if (t.type === "expense") cashFlowEntry.expense += amount;
        });

        for (let i = 0; i <= maxMonth; i++) {
            const trendEntry = monthlyTrendMap.get(i)!;
            monthlyTrendData.push({
                monthIndex: i, // Main thread will map this to localized name
                income: Math.round(trendEntry.income * 100) / 100,
                expense: Math.round(trendEntry.expense * 100) / 100,
                balance: Math.round((trendEntry.income - trendEntry.expense) * 100) / 100,
            });

            const cashFlowEntry = monthlyCashFlowMap.get(i)!;
            monthlyCashFlow.push({
                monthIndex: i,
                income: cashFlowEntry.income,
                expense: cashFlowEntry.expense
            });

            // Format Context Trend Data
            // We return an object with keys as context IDs
            const contextEntry: ContextTrendData = { monthIndex: i };
            const monthContexts = contextTrendMap.get(i)!;
            monthContexts.forEach((amount, contextId) => {
                contextEntry[contextId] = Math.round(amount * 100) / 100;
            });
            monthlyContextTrends.push(contextEntry);
        }

        // Radar Arrays (All 12 months)
        for (let i = 0; i <= 11; i++) {
            monthlyExpenses.push({ monthIndex: i, value: radarExpensesMap.get(i)!, fullMark: 0 });
            monthlyIncome.push({ monthIndex: i, value: radarIncomeMap.get(i)!, fullMark: 0 });
            monthlyInvestments.push({ monthIndex: i, value: radarInvestmentsMap.get(i)!, fullMark: 0 });
        }
    }

    // --- 11. Group Balances (Period) ---
    const groupBalances: GroupBalance[] = [];
    if (activeGroupMembers && activeGroupMembers.length > 0) {
        // Calculate total group spending for the period
        let totalGroupSpending = 0;
        const memberPaidMap = new Map<string, number>(); // MemberID -> Amount Paid
        const memberShareMap = new Map<string, number>(); // MemberID -> Share %

        activeGroupMembers.forEach(m => {
            memberPaidMap.set(m.id, 0);
            memberShareMap.set(m.id, m.share);
        });

        const txList = mode === "monthly" ? transactions : yearlyTransactions;

        if (txList) {
            txList.forEach(t => {
                if (t.deleted_at || t.type !== "expense" || !t.group_id) return;

                const amount = Number(t.amount);
                totalGroupSpending += amount;

                if (t.paid_by_member_id && memberPaidMap.has(t.paid_by_member_id)) {
                    memberPaidMap.set(t.paid_by_member_id, memberPaidMap.get(t.paid_by_member_id)! + amount);
                }
            });

            activeGroupMembers.forEach(m => {
                const paid = memberPaidMap.get(m.id) || 0;
                const share = memberShareMap.get(m.id) || 0;
                const shouldPay = (totalGroupSpending * share) / 100;
                const balance = paid - shouldPay;

                groupBalances.push({
                    memberId: m.id,
                    userId: m.user_id,
                    guestName: m.guest_name,
                    paid: Math.round(paid * 100) / 100,
                    shouldPay: Math.round(shouldPay * 100) / 100,
                    balance: Math.round(balance * 100) / 100,
                });
            });
        }
    }

    // --- 9. Context Stats ---
    const contextStats: ContextStat[] = [];
    if (transactions && contexts) {
        const contextData = new Map<
            string,
            {
                total: number;
                count: number;
                categoryBreakdown: Map<string, number>;
            }
        >();

        transactions.forEach((t: Transaction) => {
            if (t.deleted_at || t.type !== "expense" || !t.context_id) return;

            const amount = getEffectiveAmount(t, groupShareMap);

            if (!contextData.has(t.context_id)) {
                contextData.set(t.context_id, {
                    total: 0,
                    count: 0,
                    categoryBreakdown: new Map(),
                });
            }

            const entry = contextData.get(t.context_id)!;
            entry.total += amount;
            entry.count += 1;

            if (t.category_id) {
                entry.categoryBreakdown.set(
                    t.category_id,
                    (entry.categoryBreakdown.get(t.category_id) || 0) + amount
                );
            }
        });

        // Format results
        const contextMap = new Map(contexts.map((c: Context) => [c.id, c]));
        const categoryMap = new Map(categories.map((c: Category) => [c.id, c]));

        Array.from(contextData.entries()).forEach(([contextId, data]) => {
            const context = contextMap.get(contextId);
            if (!context) return; // Should not happen given FK

            // Find top category
            let topCategory = null;
            let topCategoryAmount = 0;
            const categoryBreakdownList: { name: string; amount: number; percentage: number }[] = [];

            data.categoryBreakdown.forEach((amount, catId) => {
                const cat = categoryMap.get(catId);
                if (cat) {
                    if (amount > topCategoryAmount) {
                        topCategoryAmount = amount;
                        topCategory = cat.name;
                    }
                    categoryBreakdownList.push({
                        name: cat.name,
                        amount: amount,
                        percentage: (amount / data.total) * 100
                    });
                }
            });

            // Sort breakdown
            categoryBreakdownList.sort((a, b) => b.amount - a.amount);

            contextStats.push({
                id: context.id,
                name: context.name,
                total: Math.round(data.total * 100) / 100,
                transactionCount: data.count,
                avgPerTransaction: Math.round((data.total / data.count) * 100) / 100,
                topCategory,
                topCategoryAmount: Math.round(topCategoryAmount * 100) / 100,
                categoryBreakdown: categoryBreakdownList.slice(0, 3).map(c => ({
                    ...c,
                    amount: Math.round(c.amount * 100) / 100
                })), // Top 3
                fill: `hsl(var(--chart-${(contextStats.length % 5) + 1}))`,
            });
        });
        contextStats.sort((a, b) => b.total - a.total);
    }

    // --- 10. Daily Cumulative (Monthly) ---
    const dailyCumulativeExpenses: DailyCumulativeData[] = [];
    if (mode === "monthly" && transactions) {
        const [year, month] = currentMonth.split("-");
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

        // Get current day (only if we're viewing the current month)
        const today = new Date();
        const isCurrentMonth = currentMonth === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

        const dailyTotals = new Map<number, number>();
        for (let day = 1; day <= daysInMonth; day++) {
            dailyTotals.set(day, 0);
        }

        transactions.forEach((t: Transaction) => {
            if (t.deleted_at || t.type !== "expense") return;
            const day = new Date(t.date).getDate();
            dailyTotals.set(day, (dailyTotals.get(day) || 0) + getEffectiveAmount(t, groupShareMap));
        });

        let cumulative = 0;
        let cumulativeAtCurrentDay = 0;

        // First pass: calculate cumulative up to current day
        for (let day = 1; day <= currentDay; day++) {
            cumulative += dailyTotals.get(day) || 0;
        }
        cumulativeAtCurrentDay = cumulative;

        const dailyAverage = currentDay > 0 ? cumulativeAtCurrentDay / currentDay : 0;

        cumulative = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            cumulative += dailyTotals.get(day) || 0;

            const projection =
                day >= currentDay
                    ? cumulativeAtCurrentDay + dailyAverage * (day - currentDay)
                    : undefined;

            const cumulativeValue =
                day <= currentDay ? Math.round(cumulative * 100) / 100 : undefined;

            dailyCumulativeExpenses.push({
                day: day.toString(),
                cumulative: cumulativeValue,
                projection: projection !== undefined ? Math.round(projection * 100) / 100 : undefined,
            });
        }
    }

    // --- 12. Budget Health ---
    const monthlyBudgetHealth = calculateBudgetHealth(
        transactions,
        categories,
        event.data.payload.categoryBudgets,
        groupShareMap
    );

    // Send result back
    ctx.postMessage({
        type: "STATS_RESULT",
        payload: {
            monthlyStats,
            yearlyStats,
            monthlyNetBalance,
            yearlyNetBalance,
            monthlyCategoryPercentages,
            yearlyCategoryPercentages,
            monthlyExpensesByHierarchy,
            yearlyExpensesByHierarchy,
            monthlyTrendData,
            monthlyCashFlow,
            contextStats,
            dailyCumulativeExpenses,
            monthlyExpenses,
            monthlyIncome,
            monthlyInvestments,
            monthlyContextTrends,

            groupBalances,
            monthlyBudgetHealth
        },
    });
};

// --- 12. Monthly Budget Health ---
const calculateBudgetHealth = (
    transactions: Transaction[] | undefined,
    categories: Category[],
    categoryBudgets: CategoryBudget[] | undefined,
    groupShareMap: Map<string, number>
): BudgetHealth[] => {
    const monthlyBudgetHealth: BudgetHealth[] = [];

    if (!transactions || !categoryBudgets || categoryBudgets.length === 0) return monthlyBudgetHealth;

    // Filter budgets for active user? Budget is personal usually.
    // Assuming categoryBudgets passed are already filtered by user in hook or simply all budgets.
    // The hook in useStatistics passes `db.category_budgets.toArray()`, which are all budgets.
    // We should filter for current user or rely on the fact that local DB only has user's data?
    // Local DB has user's data.

    // Calculate spend per category for the month
    const spendMap = new Map<string, number>();
    transactions.forEach(t => {
        if (t.deleted_at || t.type !== "expense") return;
        const amount = getEffectiveAmount(t, groupShareMap);
        spendMap.set(t.category_id, (spendMap.get(t.category_id) || 0) + amount);
    });

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    categoryBudgets.forEach(b => {
        if (b.deleted_at || b.period !== "monthly") return;

        const cat = categoryMap.get(b.category_id);
        if (!cat) return;

        // Check if this category has children and aggregate their spend?
        // Or is budget strict per category ID? 
        // Usually budget is per category. If parent, should include children?
        // Let's assume strict for now, or aggregate if parent.

        // Simple aggregation: check spendMap for this cat ID.
        // Better: recursive aggregation.

        let spent = 0;

        // Find all categories that are descendants of this budget's category
        // const descendants = [b.category_id];
        // This is expensive to scan every time. 
        // For now, let's just grab direct spend + direct children spend?
        // Proper way: built a tree.
        // Let's iterate all categories to find descendants.

        const getDescendants = (parentId: string): string[] => {
            const children = categories.filter(c => c.parent_id === parentId).map(c => c.id);
            let res = [...children];
            children.forEach(childId => {
                res = [...res, ...getDescendants(childId)];
            });
            return res;
        };

        const allRelatedIds = [b.category_id, ...getDescendants(b.category_id)];

        allRelatedIds.forEach(id => {
            spent += spendMap.get(id) || 0;
        });

        monthlyBudgetHealth.push({
            id: b.id,
            categoryId: b.category_id,
            categoryName: cat.name,
            categoryColor: cat.color,
            limit: b.amount,
            spent: Math.round(spent * 100) / 100,
            remaining: Math.round((b.amount - spent) * 100) / 100,
            percentage: Math.min(Math.round((spent / b.amount) * 100), 100),
            isOverBudget: spent > b.amount
        });
    });

    return monthlyBudgetHealth.sort((a, b) => b.percentage - a.percentage);
};
