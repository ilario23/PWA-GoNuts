import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { format } from 'date-fns';
import { useMemo } from 'react';

interface UseStatisticsParams {
    selectedMonth?: string; // Format: 'yyyy-MM'
    selectedYear?: string;  // Format: 'yyyy'
}

export function useStatistics(params?: UseStatisticsParams) {
    const now = new Date();
    const currentMonth = params?.selectedMonth || format(now, 'yyyy-MM');
    const currentYear = params?.selectedYear || format(now, 'yyyy');

    // Get selected month transactions
    const transactions = useLiveQuery(() =>
        db.transactions
            .where('year_month')
            .equals(currentMonth)
            .toArray(),
        [currentMonth]
    );

    // Get all transactions for the selected year
    const yearlyTransactions = useLiveQuery(() =>
        db.transactions
            .where('year_month')
            .between(`${currentYear}-01`, `${currentYear}-12`, true, true)
            .toArray(),
        [currentYear]
    );

    const categories = useLiveQuery(() => db.categories.toArray());
    const contexts = useLiveQuery(() => db.contexts.toArray());

    // Monthly statistics
    const monthlyStats = useMemo(() => {
        const stats = {
            income: 0,
            expense: 0,
            investment: 0,
            byCategory: [] as { name: string; value: number; color: string }[],
        };

        if (transactions && categories) {
            const categoryMap = new Map(categories.map(c => [c.id, c]));

            transactions.forEach(t => {
                if (t.deleted_at) return;

                const amount = Number(t.amount);
                if (t.type === 'income') stats.income += amount;
                else if (t.type === 'expense') stats.expense += amount;
                else if (t.type === 'investment') stats.investment += amount;

                if (t.type === 'expense' && t.category_id) {
                    const cat = categoryMap.get(t.category_id);
                    if (cat) {
                        const existing = stats.byCategory.find(c => c.name === cat.name);
                        if (existing) {
                            existing.value += amount;
                        } else {
                            stats.byCategory.push({ name: cat.name, value: amount, color: cat.color });
                        }
                    }
                }
            });
        }
        return stats;
    }, [transactions, categories]);

    // Yearly statistics
    const yearlyStats = useMemo(() => {
        const stats = {
            income: 0,
            expense: 0,
            investment: 0,
            byCategory: [] as { name: string; value: number; color: string }[],
        };

        if (yearlyTransactions && categories) {
            const categoryMap = new Map(categories.map(c => [c.id, c]));

            yearlyTransactions.forEach(t => {
                if (t.deleted_at) return;

                const amount = Number(t.amount);
                if (t.type === 'income') stats.income += amount;
                else if (t.type === 'expense') stats.expense += amount;
                else if (t.type === 'investment') stats.investment += amount;

                if (t.type === 'expense' && t.category_id) {
                    const cat = categoryMap.get(t.category_id);
                    if (cat) {
                        const existing = stats.byCategory.find(c => c.name === cat.name);
                        if (existing) {
                            existing.value += amount;
                        } else {
                            stats.byCategory.push({ name: cat.name, value: amount, color: cat.color });
                        }
                    }
                }
            });
        }
        return stats;
    }, [yearlyTransactions, categories]);

    // Calculate net balances
    const monthlyNetBalance = useMemo(() => monthlyStats.income - monthlyStats.expense, [monthlyStats]);
    const yearlyNetBalance = useMemo(() => yearlyStats.income - yearlyStats.expense, [yearlyStats]);

    // Calculate category percentages for radial chart (monthly) - Only root categories with aggregated children
    const monthlyCategoryPercentages = useMemo(() => {
        if (!categories || !transactions) return [];

        const totalMonthlyExpense = monthlyStats.expense;
        const categoryMap = new Map(categories.map(c => [c.id, c]));
        const expensesByCategory = new Map<string, number>();

        // Aggregate expenses by category
        transactions.forEach(t => {
            if (t.deleted_at || t.type !== 'expense' || !t.category_id) return;
            const amount = Number(t.amount);
            expensesByCategory.set(
                t.category_id,
                (expensesByCategory.get(t.category_id) || 0) + amount
            );
        });

        // Aggregate child expenses into root categories
        const rootCategoryTotals = new Map<string, { name: string; value: number }>();

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
                    value: value
                });
            }
        });

        // Convert to array and add colors
        return Array.from(rootCategoryTotals.values()).map((cat, index) => ({
            name: cat.name,
            value: totalMonthlyExpense > 0 ? Math.round((cat.value / totalMonthlyExpense) * 100) : 0,
            fill: `hsl(var(--chart-${(index % 5) + 1}))`,
        }));
    }, [monthlyStats, categories, transactions]);

    // Calculate category percentages for radial chart (yearly) - Only root categories with aggregated children
    const yearlyCategoryPercentages = useMemo(() => {
        if (!categories || !yearlyTransactions) return [];

        const totalYearlyExpense = yearlyStats.expense;
        const categoryMap = new Map(categories.map(c => [c.id, c]));
        const expensesByCategory = new Map<string, number>();

        // Aggregate expenses by category
        yearlyTransactions.forEach(t => {
            if (t.deleted_at || t.type !== 'expense' || !t.category_id) return;
            const amount = Number(t.amount);
            expensesByCategory.set(
                t.category_id,
                (expensesByCategory.get(t.category_id) || 0) + amount
            );
        });

        // Aggregate child expenses into root categories
        const rootCategoryTotals = new Map<string, { name: string; value: number }>();

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
                    value: value
                });
            }
        });

        // Convert to array and add colors
        return Array.from(rootCategoryTotals.values()).map((cat, index) => ({
            name: cat.name,
            value: totalYearlyExpense > 0 ? Math.round((cat.value / totalYearlyExpense) * 100) : 0,
            fill: `hsl(var(--chart-${(index % 5) + 1}))`,
        }));
    }, [yearlyStats, categories, yearlyTransactions]);

    // Prepare monthly data for radar charts (selected year, all 12 months)
    const { monthlyExpenses, monthlyIncome, monthlyInvestments } = useMemo(() => {
        const expenses: { month: string; value: number }[] = [];
        const income: { month: string; value: number }[] = [];
        const investments: { month: string; value: number }[] = [];

        // Initialize arrays with 0 values for all 12 months
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 0; i < 12; i++) {
            expenses.push({ month: monthNames[i], value: 0 });
            income.push({ month: monthNames[i], value: 0 });
            investments.push({ month: monthNames[i], value: 0 });
        }

        // Aggregate yearly transactions by month
        if (yearlyTransactions) {
            yearlyTransactions.forEach(t => {
                if (t.deleted_at) return;

                const txMonth = new Date(t.date).getMonth(); // 0-11
                const amount = Number(t.amount);

                if (t.type === 'expense') {
                    expenses[txMonth].value += amount;
                } else if (t.type === 'income') {
                    income[txMonth].value += amount;
                } else if (t.type === 'investment') {
                    investments[txMonth].value += amount;
                }
            });
        }
        return { monthlyExpenses: expenses, monthlyIncome: income, monthlyInvestments: investments };
    }, [yearlyTransactions]);

    // Calculate daily cumulative expenses for current month
    const dailyCumulativeExpenses = useMemo(() => {
        const result: { day: string; cumulative: number; projection?: number }[] = [];

        if (transactions) {
            // Get the number of days in the current month
            const [year, month] = currentMonth.split('-');
            const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

            // Get current day (only if we're viewing the current month)
            const today = new Date();
            const isCurrentMonth = currentMonth === format(today, 'yyyy-MM');
            const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

            // Initialize daily totals
            const dailyTotals = new Map<number, number>();
            for (let day = 1; day <= daysInMonth; day++) {
                dailyTotals.set(day, 0);
            }

            // Aggregate expenses by day
            transactions.forEach(t => {
                if (t.deleted_at || t.type !== 'expense') return;
                const day = new Date(t.date).getDate();
                dailyTotals.set(day, (dailyTotals.get(day) || 0) + Number(t.amount));
            });

            // Calculate cumulative totals
            let cumulative = 0;
            let projectionValue = 0;

            for (let day = 1; day <= daysInMonth; day++) {
                cumulative += dailyTotals.get(day) || 0;

                // Set projection value at current day
                if (day === currentDay) {
                    projectionValue = cumulative;
                }

                result.push({
                    day: day.toString(),
                    cumulative: Math.round(cumulative * 100) / 100,
                    // Projection starts from current day and maintains constant value
                    projection: day >= currentDay ? Math.round(projectionValue * 100) / 100 : undefined,
                });
            }
        }
        return result;
    }, [transactions, currentMonth]);

    // ============================================
    // NEW CHART DATA CALCULATIONS
    // ============================================

    // 1. TEMPORAL TREND DATA (Line/Area Chart)
    // Yearly view: Monthly trend
    const monthlyTrendData = useMemo(() => {
        const data: { period: string; income: number; expense: number; balance: number }[] = [];

        if (yearlyTransactions) {
            // Monthly trend for selected year
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthlyMap = new Map<number, { income: number; expense: number }>();

            for (let i = 0; i < 12; i++) {
                monthlyMap.set(i, { income: 0, expense: 0 });
            }

            yearlyTransactions.forEach(t => {
                if (t.deleted_at) return;
                const monthIdx = new Date(t.date).getMonth();
                const amount = Number(t.amount);
                const entry = monthlyMap.get(monthIdx);
                if (entry) {
                    if (t.type === 'income') entry.income += amount;
                    else if (t.type === 'expense') entry.expense += amount;
                }
            });

            for (let i = 0; i < 12; i++) {
                const entry = monthlyMap.get(i)!;
                data.push({
                    period: monthNames[i],
                    income: Math.round(entry.income * 100) / 100,
                    expense: Math.round(entry.expense * 100) / 100,
                    balance: Math.round((entry.income - entry.expense) * 100) / 100,
                });
            }
        }
        return data;
    }, [yearlyTransactions]);

    // 2. CASH FLOW DATA (Stacked Bar/Area Chart)
    // Monthly aggregation for yearly view
    const monthlyCashFlow = useMemo(() => {
        const data: { period: string; income: number; expense: number }[] = [];

        if (yearlyTransactions) {
            // Monthly cash flow for selected year
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            for (let i = 0; i < 12; i++) {
                data.push({ period: monthNames[i], income: 0, expense: 0 });
            }

            yearlyTransactions.forEach(t => {
                if (t.deleted_at) return;
                const monthIdx = new Date(t.date).getMonth();
                const amount = Number(t.amount);

                if (t.type === 'income') data[monthIdx].income += amount;
                else if (t.type === 'expense') data[monthIdx].expense += amount;
            });
        }
        return data;
    }, [yearlyTransactions]);

    // 3. CONTEXT ANALYTICS
    const contextStats = useMemo(() => {
        const stats: { name: string; value: number; fill: string }[] = [];

        if (transactions && contexts) {
            const contextMap = new Map(contexts.filter(c => !c.deleted_at).map(c => [c.id, c]));
            const contextExpenses = new Map<string, number>();

            transactions.forEach(t => {
                if (t.deleted_at || t.type !== 'expense' || !t.context_id) return;
                const amount = Number(t.amount);
                contextExpenses.set(t.context_id, (contextExpenses.get(t.context_id) || 0) + amount);
            });

            let colorIdx = 0;
            contextExpenses.forEach((value, contextId) => {
                const ctx = contextMap.get(contextId);
                if (ctx) {
                    stats.push({
                        name: ctx.name,
                        value: Math.round(value * 100) / 100,
                        fill: `hsl(var(--chart-${(colorIdx++ % 5) + 1}))`,
                    });
                }
            });
        }
        return stats;
    }, [transactions, contexts]);

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
            const [year, month] = currentMonth.split('-');
            const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
            const today = new Date();
            const isCurrentMonth = currentMonth === format(today, 'yyyy-MM');
            const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

            const totalExpenses = monthlyStats.expense;
            rate.daysElapsed = currentDay;
            rate.daysRemaining = daysInMonth - currentDay;
            rate.dailyAverage = currentDay > 0 ? totalExpenses / currentDay : 0;
            rate.projectedMonthEnd = rate.dailyAverage * daysInMonth;

            // Simple heuristic: on track if current spending rate is less than 110% of historical average
            const historicalMonthlyAverage = allTimeTransactions ?
                allTimeTransactions.filter(t => !t.deleted_at && t.type === 'expense')
                    .reduce((sum, t) => sum + Number(t.amount), 0) /
                Math.max(new Set(allTimeTransactions.map(t => t.year_month)).size, 1) : 0;

            rate.noBudget = historicalMonthlyAverage === 0;
            rate.onTrack = rate.noBudget || rate.projectedMonthEnd <= historicalMonthlyAverage * 1.1;
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
            const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
            const daysInYear = isLeapYear ? 366 : 365;
            const today = new Date();
            const isCurrentYear = currentYear === format(today, 'yyyy');

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
            const historicalYearlyAverage = allTimeTransactions ?
                allTimeTransactions.filter(t => !t.deleted_at && t.type === 'expense')
                    .reduce((sum, t) => sum + Number(t.amount), 0) /
                Math.max(new Set(allTimeTransactions.map(t => t.year_month.substring(0, 4))).size, 1) : 0;

            rate.noBudget = historicalYearlyAverage === 0;
            rate.onTrack = rate.noBudget || rate.projectedYearEnd <= historicalYearlyAverage * 1.1;
        }
        return rate;
    }, [yearlyTransactions, allTimeTransactions, currentYear, yearlyStats]);

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

    return {
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
    };
}
