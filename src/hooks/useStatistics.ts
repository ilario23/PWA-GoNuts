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
    };
}
