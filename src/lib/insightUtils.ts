import { StatisticsWorkerResponse } from "../types/worker";

export type InsightType = "positive" | "warning" | "neutral" | "tip";

export interface Insight {
    id: string;
    title: string; // Key for translation
    message?: string; // Key for translation or raw string if dynamic
    messageParams?: Record<string, string | number>;
    type: InsightType;
    icon: string; // Lucide icon name
    priority: number; // Higher number = shows first
    color?: string;
}

export const generateInsights = (
    stats: StatisticsWorkerResponse["payload"],
    monthlyComparison: any
): Insight[] => {
    const insights: Insight[] = [];

    // 1. The "Whale" (Top Expense Category)
    // Check if there is a dominant category
    if (stats.monthlyStats.byCategory.length > 0) {
        const sortedCats = [...stats.monthlyStats.byCategory].sort(
            (a, b) => b.value - a.value
        );
        const topCat = sortedCats[0];
        const totalExpense = stats.monthlyStats.expense;

        // Only show if it's significant (> 15% of total)
        if (totalExpense > 0 && (topCat.value / totalExpense) > 0.15) {
            insights.push({
                id: "top-category",
                title: "insights.top_category.title",
                message: "insights.top_category.message",
                messageParams: { category: topCat.name, percentage: Math.round((topCat.value / totalExpense) * 100) },
                type: "neutral",
                icon: "PieChart",
                priority: 80,
                color: topCat.color
            });
        }
    }

    // 2. Trend Watch (Spending vs Previous Month)
    if (monthlyComparison.expense.previous > 0) {
        const change = monthlyComparison.expense.change;

        if (change > 15) {
            insights.push({
                id: "high-spending",
                title: "insights.spending_spike.title",
                message: "insights.spending_spike.message", // e.g., "Woah, spending is up 20%!"
                messageParams: { percent: Math.round(change) },
                type: "warning",
                icon: "TrendingUp",
                priority: 90,
            });
        } else if (change < -10) {
            insights.push({
                id: "low-spending",
                title: "insights.spending_drop.title",
                message: "insights.spending_drop.message", // e.g., "Nice! You're spending 10% less."
                messageParams: { percent: Math.round(Math.abs(change)) },
                type: "positive",
                icon: "TrendingDown",
                priority: 85,
            });
        }
    }

    // 3. Saver Mode (Savings Rate)
    const income = stats.monthlyStats.income;
    const expense = stats.monthlyStats.expense;

    if (income > 0) {
        const savingsRate = ((income - expense) / income) * 100;

        if (savingsRate > 20) {
            insights.push({
                id: "good-saver",
                title: "insights.good_saver.title",
                message: "insights.good_saver.message",
                messageParams: { percent: Math.round(savingsRate) },
                type: "positive",
                icon: "PiggyBank",
                priority: 70,
            });
        } else if (savingsRate < 0) {
            insights.push({
                id: "negative-balance",
                title: "insights.overspending.title",
                message: "insights.overspending.message",
                type: "warning",
                icon: "AlertTriangle",
                priority: 95,
            });
        }
    }

    // 4. Recurring Check (Subscription alert?)
    // If recurring ratio is high? (Maybe later)

    // 5. No Spend Days (if we had daily data readily available in memory here easily... 
    // currently we have dailyCumulativeExpenses, can infer flat lines)
    // Let's keep it simple for v1.

    // Sort by priority
    return insights.sort((a, b) => b.priority - a.priority);
};
