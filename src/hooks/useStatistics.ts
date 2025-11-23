import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { format } from 'date-fns';

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
    const recurringTransactions = useLiveQuery(() => db.recurring_transactions.toArray());

    // Monthly statistics
    const monthlyStats = {
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
            if (t.type === 'income') monthlyStats.income += amount;
            else if (t.type === 'expense') monthlyStats.expense += amount;
            else if (t.type === 'investment') monthlyStats.investment += amount;

            if (t.type === 'expense' && t.category_id) {
                const cat = categoryMap.get(t.category_id);
                if (cat) {
                    const existing = monthlyStats.byCategory.find(c => c.name === cat.name);
                    if (existing) {
                        existing.value += amount;
                    } else {
                        monthlyStats.byCategory.push({ name: cat.name, value: amount, color: cat.color });
                    }
                }
            }
        });
    }

    // Yearly statistics
    const yearlyStats = {
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
            if (t.type === 'income') yearlyStats.income += amount;
            else if (t.type === 'expense') yearlyStats.expense += amount;
            else if (t.type === 'investment') yearlyStats.investment += amount;

            if (t.type === 'expense' && t.category_id) {
                const cat = categoryMap.get(t.category_id);
                if (cat) {
                    const existing = yearlyStats.byCategory.find(c => c.name === cat.name);
                    if (existing) {
                        existing.value += amount;
                    } else {
                        yearlyStats.byCategory.push({ name: cat.name, value: amount, color: cat.color });
                    }
                }
            }
        });
    }

    // Calculate net balances
    const monthlyNetBalance = monthlyStats.income - monthlyStats.expense;
    const yearlyNetBalance = yearlyStats.income - yearlyStats.expense;

    // Calculate category percentages for radial chart (monthly)
    const totalMonthlyExpense = monthlyStats.expense;
    const monthlyCategoryPercentages = monthlyStats.byCategory.map((cat, index) => ({
        name: cat.name,
        value: totalMonthlyExpense > 0 ? Math.round((cat.value / totalMonthlyExpense) * 100) : 0,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));

    // Calculate category percentages for radial chart (yearly)
    const totalYearlyExpense = yearlyStats.expense;
    const yearlyCategoryPercentages = yearlyStats.byCategory.map((cat, index) => ({
        name: cat.name,
        value: totalYearlyExpense > 0 ? Math.round((cat.value / totalYearlyExpense) * 100) : 0,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));

    // Prepare monthly data for radar charts (selected year, all 12 months)
    const monthlyExpenses: { month: string; value: number }[] = [];
    const monthlyIncome: { month: string; value: number }[] = [];
    const monthlyInvestments: { month: string; value: number }[] = [];

    // Initialize arrays with 0 values for all 12 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < 12; i++) {
        monthlyExpenses.push({ month: monthNames[i], value: 0 });
        monthlyIncome.push({ month: monthNames[i], value: 0 });
        monthlyInvestments.push({ month: monthNames[i], value: 0 });
    }

    // Aggregate yearly transactions by month
    if (yearlyTransactions) {
        yearlyTransactions.forEach(t => {
            if (t.deleted_at) return;

            const txMonth = new Date(t.date).getMonth(); // 0-11
            const amount = Number(t.amount);

            if (t.type === 'expense') {
                monthlyExpenses[txMonth].value += amount;
            } else if (t.type === 'income') {
                monthlyIncome[txMonth].value += amount;
            } else if (t.type === 'investment') {
                monthlyInvestments[txMonth].value += amount;
            }
        });
    }

    // Calculate daily cumulative expenses for current month
    const dailyCumulativeExpenses: { day: string; cumulative: number; projection?: number }[] = [];

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

            dailyCumulativeExpenses.push({
                day: day.toString(),
                cumulative: Math.round(cumulative * 100) / 100,
                // Projection starts from current day and maintains constant value
                projection: day >= currentDay ? Math.round(projectionValue * 100) / 100 : undefined,
            });
        }
    }

    // ============================================
    // NEW CHART DATA CALCULATIONS
    // ============================================

    // 1. TEMPORAL TREND DATA (Line/Area Chart)
    // Yearly view: Monthly trend
    const monthlyTrendData: { period: string; income: number; expense: number; balance: number }[] = [];

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
            const data = monthlyMap.get(i)!;
            monthlyTrendData.push({
                period: monthNames[i],
                income: Math.round(data.income * 100) / 100,
                expense: Math.round(data.expense * 100) / 100,
                balance: Math.round((data.income - data.expense) * 100) / 100,
            });
        }
    }

    // 2. CASH FLOW DATA (Stacked Bar/Area Chart)
    // Monthly aggregation for yearly view
    const monthlyCashFlow: { period: string; income: number; expense: number }[] = [];

    if (yearlyTransactions) {
        // Monthly cash flow for selected year
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 0; i < 12; i++) {
            monthlyCashFlow.push({ period: monthNames[i], income: 0, expense: 0 });
        }

        yearlyTransactions.forEach(t => {
            if (t.deleted_at) return;
            const monthIdx = new Date(t.date).getMonth();
            const amount = Number(t.amount);

            if (t.type === 'income') monthlyCashFlow[monthIdx].income += amount;
            else if (t.type === 'expense') monthlyCashFlow[monthIdx].expense += amount;
        });
    }

    // 3. CONTEXT ANALYTICS
    const contextStats: { name: string; value: number; fill: string }[] = [];

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
                contextStats.push({
                    name: ctx.name,
                    value: Math.round(value * 100) / 100,
                    fill: `hsl(var(--chart-${(colorIdx++ % 5) + 1}))`,
                });
            }
        });
    }



    // Get all-time data for historical average (used in Burn Rate)
    const allTimeTransactions = useLiveQuery(() => db.transactions.toArray());

    // 5. BURN RATE (Monthly)
    const burnRate = {
        dailyAverage: 0,
        projectedMonthEnd: 0,
        daysElapsed: 0,
        daysRemaining: 0,
        onTrack: true,
    };

    if (transactions && allTimeTransactions) {
        const [year, month] = currentMonth.split('-');
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const today = new Date();
        const isCurrentMonth = currentMonth === format(today, 'yyyy-MM');
        const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

        const totalExpenses = monthlyStats.expense;
        burnRate.daysElapsed = currentDay;
        burnRate.daysRemaining = daysInMonth - currentDay;
        burnRate.dailyAverage = currentDay > 0 ? totalExpenses / currentDay : 0;
        burnRate.projectedMonthEnd = burnRate.dailyAverage * daysInMonth;

        // Simple heuristic: on track if current spending rate is less than 110% of historical average
        const historicalMonthlyAverage = allTimeTransactions ?
            allTimeTransactions.filter(t => !t.deleted_at && t.type === 'expense')
                .reduce((sum, t) => sum + Number(t.amount), 0) /
            Math.max(new Set(allTimeTransactions.map(t => t.year_month)).size, 1) : 0;

        burnRate.onTrack = historicalMonthlyAverage === 0 || burnRate.projectedMonthEnd <= historicalMonthlyAverage * 1.1;
    }

    // 5b. BURN RATE (Yearly)
    const yearlyBurnRate = {
        dailyAverage: 0,
        projectedYearEnd: 0,
        daysElapsed: 0,
        daysRemaining: 0,
        onTrack: true,
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
        yearlyBurnRate.daysElapsed = currentDay;
        yearlyBurnRate.daysRemaining = daysInYear - currentDay;
        yearlyBurnRate.dailyAverage = currentDay > 0 ? totalExpenses / currentDay : 0;
        yearlyBurnRate.projectedYearEnd = yearlyBurnRate.dailyAverage * daysInYear;

        // Simple heuristic for yearly on track
        const historicalYearlyAverage = allTimeTransactions ?
            allTimeTransactions.filter(t => !t.deleted_at && t.type === 'expense')
                .reduce((sum, t) => sum + Number(t.amount), 0) /
            Math.max(new Set(allTimeTransactions.map(t => t.year_month.substring(0, 4))).size, 1) : 0;

        yearlyBurnRate.onTrack = historicalYearlyAverage === 0 || yearlyBurnRate.projectedYearEnd <= historicalYearlyAverage * 1.1;
    }

    // 6. RECURRING VS ONE-TIME
    const recurringVsOneTime = {
        recurringAmount: 0,
        oneTimeAmount: 0,
        recurringCount: 0,
        oneTimeCount: 0,
    };

    if (transactions && recurringTransactions) {
        // Build a map of recurring transaction patterns
        const recurringPatterns = new Map<string, Set<string>>();
        const activeRecurring = recurringTransactions.filter(rt => !rt.deleted_at);

        activeRecurring.forEach(rt => {
            const key = `${rt.category_id}-${rt.amount}-${rt.description}`;
            if (!recurringPatterns.has(key)) {
                recurringPatterns.set(key, new Set());
            }
        });

        transactions.forEach(t => {
            if (t.deleted_at) return;
            const amount = Number(t.amount);
            const key = `${t.category_id}-${amount}-${t.description}`;

            // Simple heuristic: if matches a recurring pattern, count as recurring
            let isRecurring = false;
            for (const [pattern] of recurringPatterns) {
                if (pattern === key) {
                    isRecurring = true;
                    break;
                }
            }

            if (isRecurring) {
                recurringVsOneTime.recurringAmount += amount;
                recurringVsOneTime.recurringCount++;
            } else {
                recurringVsOneTime.oneTimeAmount += amount;
                recurringVsOneTime.oneTimeCount++;
            }
        });
    }

    // 7. CALENDAR HEATMAP
    const calendarHeatmap: { day: number; amount: number; label: string }[] = [];

    if (transactions) {
        const [year, month] = currentMonth.split('-');
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const dailyExpenses = new Map<number, number>();

        for (let day = 1; day <= daysInMonth; day++) {
            dailyExpenses.set(day, 0);
        }

        transactions.forEach(t => {
            if (t.deleted_at || t.type !== 'expense') return;
            const day = new Date(t.date).getDate();
            const amount = Number(t.amount);
            dailyExpenses.set(day, (dailyExpenses.get(day) || 0) + amount);
        });

        for (let day = 1; day <= daysInMonth; day++) {
            const amount = dailyExpenses.get(day) || 0;
            const date = new Date(parseInt(year), parseInt(month) - 1, day);
            calendarHeatmap.push({
                day,
                amount: Math.round(amount * 100) / 100,
                label: format(date, 'MMM d'),
            });
        }
    }



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
        // New chart data
        monthlyTrendData,
        monthlyCashFlow,
        contextStats,
        burnRate,
        yearlyBurnRate,
    };
}
