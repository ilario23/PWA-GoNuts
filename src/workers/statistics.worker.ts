import { Category, Transaction, GroupMember, Context, CategoryBudget } from "../lib/db";
import { StatisticsWorkerRequest, CategoryStat, CategoryPercentage, HierarchyNode, TrendData, CashFlowData, ContextStat, DailyCumulativeData, RadarData, ContextTrendData, GroupBalance, BudgetHealth, MonthlyCumulativeData, CategoryComparisonData, RecurringSplit, SavingsRatePoint, WeekdayStat, WeekdaySeasonality, MultiYearPoint, BudgetPacingPoint, BudgetPacing, MerchantStat, RootCategoryTrendPoint, RootCategoryTrend } from "../types/worker";

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
// Helper to calculate basic stats
const calculateStats = (
    transactions: Transaction[] | undefined,
    categoryMap: Map<string, Category>,
    groupShareMap: Map<string, number>
) => {
    const stats = {
        income: 0,
        expense: 0,
        investment: 0,
        byCategory: [] as CategoryStat[],
    };

    if (!transactions) return stats;

    transactions.forEach((t: Transaction) => {
        if (t.deleted_at) return;

        const amount = getEffectiveAmount(t, groupShareMap);
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

    return stats;
};

// Main message handler
ctx.onmessage = (event: MessageEvent<StatisticsWorkerRequest>) => {
    try {
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
        const monthlyStats = mode === "monthly"
            ? calculateStats(transactions, categoryMap, groupShareMap)
            : { income: 0, expense: 0, investment: 0, byCategory: [] };

        const previousMonthStats = mode === "monthly" && event.data.payload.previousMonthTransactions
            ? calculateStats(event.data.payload.previousMonthTransactions, categoryMap, groupShareMap)
            : undefined;

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
        const calculateDailyCumulative = (
            txs: Transaction[],
            targetMonth: string
        ): DailyCumulativeData[] => {
            const [year, month] = targetMonth.split("-");
            const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

            const today = new Date();
            const isActuallyCurrentMonth = targetMonth === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const currentDay = isActuallyCurrentMonth ? today.getDate() : daysInMonth;

            const dailyTotals = new Map<number, number>();
            for (let day = 1; day <= daysInMonth; day++) {
                dailyTotals.set(day, 0);
            }

            txs.forEach((t: Transaction) => {
                if (t.deleted_at || t.type !== "expense") return;
                const day = new Date(t.date).getDate();
                dailyTotals.set(day, (dailyTotals.get(day) || 0) + getEffectiveAmount(t, groupShareMap));
            });

            let cumulative = 0;
            let cumulativeAtCurrentDay = 0;

            // First pass: calculate cumulative up to current day (or end of month if not current)
            for (let day = 1; day <= currentDay; day++) {
                cumulative += dailyTotals.get(day) || 0;
            }
            cumulativeAtCurrentDay = cumulative;

            const dailyAverage = currentDay > 0 ? cumulativeAtCurrentDay / currentDay : 0;

            cumulative = 0;
            const result: DailyCumulativeData[] = [];

            for (let day = 1; day <= daysInMonth; day++) {
                cumulative += dailyTotals.get(day) || 0;

                if (isActuallyCurrentMonth) {
                    if (day <= currentDay) {
                        const projection = day === currentDay ? cumulativeAtCurrentDay : undefined;
                        result.push({
                            day: day.toString(),
                            cumulative: Math.round(cumulative * 100) / 100,
                            projection: projection !== undefined ? Math.round(projection * 100) / 100 : undefined,
                        });
                    } else {
                        const projection = cumulativeAtCurrentDay + dailyAverage * (day - currentDay);
                        result.push({
                            day: day.toString(),
                            cumulative: undefined,
                            projection: Math.round(projection * 100) / 100,
                        });
                    }
                } else {
                    // Past month: just show cumulative
                    result.push({
                        day: day.toString(),
                        cumulative: Math.round(cumulative * 100) / 100,
                        projection: undefined,
                    });
                }
            }
            return result;
        };

        let dailyCumulativeExpenses: DailyCumulativeData[] = [];
        let previousMonthCumulativeExpenses: DailyCumulativeData[] = [];

        if (mode === "monthly") {
            if (transactions) {
                dailyCumulativeExpenses = calculateDailyCumulative(transactions, currentMonth);
            }
            if (event.data.payload.previousMonthTransactions) {
                const prevMonth = event.data.payload.previousMonthTransactions[0]?.year_month ||
                    (() => {
                        const [y, m] = currentMonth.split('-').map(Number);
                        const d = new Date(y, m - 1 - 1, 1);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    })();

                previousMonthCumulativeExpenses = calculateDailyCumulative(event.data.payload.previousMonthTransactions, prevMonth);
            }
        }

        // --- 11. Yearly Cumulative ---

        const calculateYearlyCumulative = (txs: Transaction[], yearStr: string): MonthlyCumulativeData[] => {
            const monthlyTotals = new Map<string, number>();
            const months = [
                '01', '02', '03', '04', '05', '06',
                '07', '08', '09', '10', '11', '12'
            ];

            const monthLabels = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ];

            months.forEach(m => monthlyTotals.set(m, 0));

            txs.forEach(t => {
                if (t.deleted_at || t.type !== 'expense') return;
                // Ensure we check date format is YYYY-MM-DD
                const parts = t.date.split('-');
                if (parts.length < 2) return;
                const m = parts[1];
                monthlyTotals.set(m, (monthlyTotals.get(m) || 0) + getEffectiveAmount(t, groupShareMap));
            });

            const today = new Date();
            const isCurrentYear = yearStr === today.getFullYear().toString();
            const currentMonthIdx = today.getMonth(); // 0-indexed

            let cumulative = 0;
            return months.map((m, i) => {
                cumulative += monthlyTotals.get(m) || 0;

                // If current year and future month, return undefined/null to break the line
                // We use a strictly greater check so we show the current month's point
                if (isCurrentYear && i > currentMonthIdx) {
                    return {
                        month: monthLabels[i],
                        cumulative: undefined as unknown as number // Cast to satisfy type, or assume component handles it
                    };
                }

                return {
                    month: monthLabels[i],
                    cumulative: Math.round(cumulative * 100) / 100
                };
            });
        }

        let yearlyCumulativeExpenses: MonthlyCumulativeData[] = [];
        let previousYearCumulativeExpenses: MonthlyCumulativeData[] = [];

        if (mode === "yearly") {
            if (yearlyTransactions) {
                yearlyCumulativeExpenses = calculateYearlyCumulative(yearlyTransactions, currentYear);
            }
            if (event.data.payload.previousYearTransactions) {
                // Calculate previous year. We don't apply cutoff used for "current year" chart logic
                // But if we want to show full previous year, we pass its year.
                // Actually, we just need to pass the year string.
                // Since we don't know the exact previous year string here easily without parsing,
                // let's assume if we pass something that is NOT current year, it won't trigger cutoff.
                // We can just pass "0" or parse the first transaction year if needed.
                // Or simpler: currentYear is passed. For previous year, we definitely know it's NOT currentYear.
                previousYearCumulativeExpenses = calculateYearlyCumulative(event.data.payload.previousYearTransactions, "0000"); // 0000 wont match current year
            }
        }

        // --- 12. Budget Health ---
        const monthlyBudgetHealth = calculateBudgetHealth(
            transactions,
            categories,
            event.data.payload.categoryBudgets,
            groupShareMap
        );

        // --- 13-20. Derived insights ---
        const activeTxs = mode === "monthly" ? transactions : yearlyTransactions;

        const categoryComparison = mode === "monthly"
            ? calculateCategoryComparison(monthlyStats.byCategory, previousMonthStats?.byCategory)
            : [];

        const recurringVsOneOff = calculateRecurringVsOneOff(
            activeTxs,
            groupShareMap,
            mode === "yearly"
        );

        const savingsRateTrend = mode === "yearly"
            ? calculateSavingsRateTrend(yearlyTransactions, groupShareMap)
            : [];

        const weekdaySeasonality = calculateWeekdaySeasonality(activeTxs, groupShareMap);

        const multiYearTrend = calculateMultiYearTrend(
            event.data.payload.allTimeTransactions,
            groupShareMap
        );

        // Budget pacing spans the full selected year; prefer all-time data so it
        // also works in monthly mode (yearlyTransactions is only fetched in yearly mode).
        const budgetSourceTxs = event.data.payload.allTimeTransactions ?? yearlyTransactions;
        const budgetPacing = calculateBudgetPacing(
            budgetSourceTxs,
            event.data.payload.monthlyBudget,
            currentYear,
            groupShareMap
        );

        const topMerchants = calculateTopMerchants(activeTxs, groupShareMap);

        const rootCategoryTrend = mode === "yearly"
            ? calculateRootCategoryTrend(yearlyTransactions, categoryMap, groupShareMap, currentYear)
            : { categories: [], points: [] };

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
                previousMonthCumulativeExpenses,
                monthlyExpenses,
                monthlyIncome,
                monthlyInvestments,
                monthlyContextTrends,
                yearlyCumulativeExpenses,
                previousYearCumulativeExpenses,

                groupBalances,
                monthlyBudgetHealth,
                previousMonthStats,

                categoryComparison,
                recurringVsOneOff,
                savingsRateTrend,
                weekdaySeasonality,
                multiYearTrend,
                budgetPacing,
                topMerchants,
                rootCategoryTrend,
            },
        });
    } catch (error) {
        console.error("Worker Calculation Error:", error);
        ctx.postMessage({
            type: "STATS_ERROR",
            error: error instanceof Error ? error.message : "Unknown worker error"
        });
    }
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

// --- Helpers for derived insights ---

const round2 = (n: number): number => Math.round(n * 100) / 100;

const isRecurringTx = (t: Transaction): boolean =>
    Boolean(t.recurring_transaction_id) || Boolean(t.recurrence_key);

/** Month index 0-11 from year_month/date parts (avoids Date TZ parsing). */
const getMonthIndexFromTx = (t: Transaction): number => {
    const fromYearMonth = t.year_month ? t.year_month.split("-")[1] : undefined;
    if (fromYearMonth) {
        const m = parseInt(fromYearMonth, 10);
        if (!Number.isNaN(m) && m >= 1 && m <= 12) return m - 1;
    }
    const parts = t.date.split("-");
    if (parts.length >= 2) {
        const m = parseInt(parts[1], 10);
        if (!Number.isNaN(m) && m >= 1 && m <= 12) return m - 1;
    }
    return -1;
};

/** Day of week 0=Sun..6=Sat from a local YYYY-MM-DD date (no TZ parsing). */
const getWeekdayFromDate = (date: string): number | null => {
    const parts = date.split("-");
    if (parts.length < 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
    return new Date(y, m - 1, d).getDay();
};

const normalizeMerchantKey = (description: string): string =>
    (description || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");

// --- 13. Category comparison (current vs previous month) ---
export const calculateCategoryComparison = (
    current: CategoryStat[],
    previous: CategoryStat[] | undefined
): CategoryComparisonData[] => {
    const prevMap = new Map<string, number>();
    (previous || []).forEach((c) => prevMap.set(c.name, c.value));

    const names = new Set<string>([
        ...current.map((c) => c.name),
        ...prevMap.keys(),
    ]);

    const result: CategoryComparisonData[] = [];
    names.forEach((name) => {
        const curr = current.find((c) => c.name === name)?.value ?? 0;
        const prev = prevMap.get(name) ?? 0;
        const change = prev === 0 ? (curr === 0 ? 0 : 100) : ((curr - prev) / prev) * 100;
        result.push({
            name,
            current: curr,
            previous: prev,
            change,
            // Expenses: lower is better. Equal spend is not "worsened".
            trend: curr <= prev ? "improved" : "worsened",
        });
    });

    result.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    return result.slice(0, 8);
};

// --- 14. Recurring vs one-off expenses ---
export const calculateRecurringVsOneOff = (
    txs: Transaction[] | undefined,
    groupShareMap: Map<string, number>,
    includeMonthlySeries: boolean
): RecurringSplit => {
    let recurringTotal = 0;
    let oneOffTotal = 0;
    let recurringCount = 0;
    let oneOffCount = 0;

    const monthly = includeMonthlySeries
        ? Array.from({ length: 12 }, (_, monthIndex) => ({ monthIndex, recurring: 0, oneOff: 0 }))
        : undefined;

    (txs || []).forEach((t) => {
        if (t.deleted_at || t.type !== "expense") return;
        const amount = getEffectiveAmount(t, groupShareMap);
        const recurring = isRecurringTx(t);

        if (recurring) {
            recurringTotal += amount;
            recurringCount += 1;
        } else {
            oneOffTotal += amount;
            oneOffCount += 1;
        }

        if (monthly) {
            const monthIdx = getMonthIndexFromTx(t);
            if (monthIdx >= 0 && monthIdx <= 11) {
                if (recurring) monthly[monthIdx].recurring += amount;
                else monthly[monthIdx].oneOff += amount;
            }
        }
    });

    const expenseTotal = recurringTotal + oneOffTotal;
    const split: RecurringSplit = {
        recurringTotal: round2(recurringTotal),
        oneOffTotal: round2(oneOffTotal),
        recurringCount,
        oneOffCount,
        recurringPct: expenseTotal > 0 ? round2((recurringTotal / expenseTotal) * 100) : 0,
    };
    if (monthly) {
        split.monthly = monthly.map((m) => ({
            monthIndex: m.monthIndex,
            recurring: round2(m.recurring),
            oneOff: round2(m.oneOff),
        }));
    }
    return split;
};

// --- 15. Savings rate trend (yearly) ---
export const calculateSavingsRateTrend = (
    txs: Transaction[] | undefined,
    groupShareMap: Map<string, number>
): SavingsRatePoint[] => {
    const months = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));

    (txs || []).forEach((t) => {
        if (t.deleted_at) return;
        const monthIdx = getMonthIndexFromTx(t);
        if (monthIdx < 0 || monthIdx > 11) return;
        const amount = getEffectiveAmount(t, groupShareMap);
        if (t.type === "income") months[monthIdx].income += amount;
        else if (t.type === "expense") months[monthIdx].expense += amount;
    });

    return months.map((m, monthIndex) => ({
        monthIndex,
        savingsRate: m.income > 0 ? round2(((m.income - m.expense) / m.income) * 100) : 0,
        balance: round2(m.income - m.expense),
    }));
};

// --- 16. Weekday seasonality ---
export const calculateWeekdaySeasonality = (
    txs: Transaction[] | undefined,
    groupShareMap: Map<string, number>
): WeekdaySeasonality => {
    const days: WeekdayStat[] = Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        total: 0,
        count: 0,
        avg: 0,
    }));

    let weekendTotal = 0;
    let overallTotal = 0;

    (txs || []).forEach((t) => {
        if (t.deleted_at || t.type !== "expense") return;
        const weekday = getWeekdayFromDate(t.date);
        if (weekday === null) return;
        const amount = getEffectiveAmount(t, groupShareMap);
        days[weekday].total += amount;
        days[weekday].count += 1;
        overallTotal += amount;
        if (weekday === 0 || weekday === 6) weekendTotal += amount;
    });

    days.forEach((d) => {
        d.total = round2(d.total);
        d.avg = d.count > 0 ? round2(d.total / d.count) : 0;
    });

    let busiestWeekday = 0;
    days.forEach((d) => {
        if (d.total > days[busiestWeekday].total) busiestWeekday = d.weekday;
    });

    return {
        days,
        weekendPct: overallTotal > 0 ? round2((weekendTotal / overallTotal) * 100) : 0,
        busiestWeekday,
    };
};

// --- 17. Multi-year expense trend with moving averages ---
export const calculateMultiYearTrend = (
    txs: Transaction[] | undefined,
    groupShareMap: Map<string, number>
): MultiYearPoint[] => {
    const totals = new Map<string, number>();
    (txs || []).forEach((t) => {
        if (t.deleted_at || t.type !== "expense") return;
        const ym = t.year_month;
        if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return;
        totals.set(ym, (totals.get(ym) || 0) + getEffectiveAmount(t, groupShareMap));
    });

    if (totals.size === 0) return [];

    const sortedKeys = Array.from(totals.keys()).sort();
    const [startY, startM] = sortedKeys[0].split("-").map(Number);
    const [endY, endM] = sortedKeys[sortedKeys.length - 1].split("-").map(Number);

    // Continuous series with gaps filled as 0
    const series: { period: string; expense: number }[] = [];
    let y = startY;
    let m = startM;
    while (y < endY || (y === endY && m <= endM)) {
        const period = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`;
        series.push({ period, expense: round2(totals.get(period) || 0) });
        m += 1;
        if (m > 12) {
            m = 1;
            y += 1;
        }
    }

    return series.map((point, i) => {
        const ma = (windowSize: number): number | undefined => {
            if (i + 1 < windowSize) return undefined;
            let sum = 0;
            for (let j = i - windowSize + 1; j <= i; j++) sum += series[j].expense;
            return round2(sum / windowSize);
        };
        return {
            period: point.period,
            expense: point.expense,
            ma3: ma(3),
            ma6: ma(6),
            ma12: ma(12),
        };
    });
};

// --- 18. Budget pacing (selected year vs monthly budget) ---
export const calculateBudgetPacing = (
    txs: Transaction[] | undefined,
    monthlyBudget: number | undefined,
    currentYear: string,
    groupShareMap: Map<string, number>
): BudgetPacing => {
    const budget = monthlyBudget ?? 0;
    const monthlyActual = Array.from({ length: 12 }, () => 0);

    (txs || []).forEach((t) => {
        if (t.deleted_at || t.type !== "expense") return;
        if (!t.year_month || !t.year_month.startsWith(currentYear)) return;
        const monthIdx = getMonthIndexFromTx(t);
        if (monthIdx < 0 || monthIdx > 11) return;
        monthlyActual[monthIdx] += getEffectiveAmount(t, groupShareMap);
    });

    const points: BudgetPacingPoint[] = monthlyActual.map((actual, monthIndex) => ({
        monthIndex,
        actual: round2(actual),
        budget,
        variance: round2(actual - budget),
    }));

    const today = new Date();
    const isCurrentYear = currentYear === today.getFullYear().toString();
    const isFutureYear = parseInt(currentYear, 10) > today.getFullYear();
    const monthsElapsed = isCurrentYear ? today.getMonth() + 1 : isFutureYear ? 0 : 12;

    let ytdActual = 0;
    for (let i = 0; i < monthsElapsed; i++) ytdActual += monthlyActual[i];
    ytdActual = round2(ytdActual);

    const yearTotal = round2(monthlyActual.reduce((s, v) => s + v, 0));
    const projectedYearEnd =
        isCurrentYear && monthsElapsed > 0
            ? round2((ytdActual / monthsElapsed) * 12)
            : yearTotal;

    return {
        monthlyBudget: budget,
        points,
        projectedYearEnd,
        ytdActual,
        ytdBudget: round2(budget * monthsElapsed),
    };
};

// --- 19. Top merchants (expense descriptions) ---
export const calculateTopMerchants = (
    txs: Transaction[] | undefined,
    groupShareMap: Map<string, number>
): MerchantStat[] => {
    const map = new Map<string, { name: string; total: number; count: number }>();

    (txs || []).forEach((t) => {
        if (t.deleted_at || t.type !== "expense") return;
        const key = normalizeMerchantKey(t.description);
        if (!key) return;
        const amount = getEffectiveAmount(t, groupShareMap);
        const existing = map.get(key);
        if (existing) {
            existing.total += amount;
            existing.count += 1;
        } else {
            map.set(key, {
                name: (t.description || "").trim(),
                total: amount,
                count: 1,
            });
        }
    });

    return Array.from(map.values())
        .map((m) => ({
            name: m.name,
            total: round2(m.total),
            count: m.count,
            avg: round2(m.total / m.count),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
};

// --- 20. Root category trend over the selected year ---
export const calculateRootCategoryTrend = (
    txs: Transaction[] | undefined,
    categoryMap: Map<string, Category>,
    groupShareMap: Map<string, number>,
    currentYear: string
): RootCategoryTrend => {
    const monthValues: Record<string, number>[] = Array.from({ length: 12 }, () => ({}));
    const totals = new Map<string, { name: string; color: string; total: number }>();

    (txs || []).forEach((t) => {
        if (t.deleted_at || t.type !== "expense" || !t.category_id) return;
        const root = getRootCategory(t.category_id, categoryMap);
        if (!root) return;
        const monthIdx = getMonthIndexFromTx(t);
        if (monthIdx < 0 || monthIdx > 11) return;
        const amount = getEffectiveAmount(t, groupShareMap);

        monthValues[monthIdx][root.name] = (monthValues[monthIdx][root.name] || 0) + amount;

        const entry = totals.get(root.id);
        if (entry) entry.total += amount;
        else totals.set(root.id, { name: root.name, color: root.color, total: amount });
    });

    const categories = Array.from(totals.values())
        .sort((a, b) => b.total - a.total)
        .map((c) => ({ name: c.name, color: c.color }));

    const points: RootCategoryTrendPoint[] = monthValues.map((values, i) => ({
        period: `${currentYear}-${String(i + 1).padStart(2, "0")}`,
        values: Object.fromEntries(
            Object.entries(values).map(([name, amount]) => [name, round2(amount)])
        ),
    }));

    return { categories, points };
};
