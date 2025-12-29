import { Category, Transaction, GroupMember, Context, CategoryBudget } from "../lib/db";

export type StatisticsWorkerRequest = {
    type: "CALCULATE_STATS";
    payload: {
        transactions: Transaction[];
        categories: Category[];
        contexts: Context[];
        yearlyTransactions: Transaction[];
        groupId?: string;
        mode: "monthly" | "yearly";
        currentMonth: string; // YYYY-MM
        currentYear: string; // YYYY
        userId?: string;
        groupMemberships?: GroupMember[];
        activeGroupMembers?: GroupMember[];
        categoryBudgets?: CategoryBudget[];
    };
};

export type CategoryStat = {
    name: string;
    value: number;
    color: string;
};

export type CategoryPercentage = CategoryStat & {
    amount: number;
    fill: string;
};

export type HierarchyNode = {
    rootName: string;
    rootColor: string;
    total: number;
    _children: { name: string; amount: number; color: string }[];
    [key: string]: unknown; // For dynamic child names if needed, though strictly we should map differently
};

export type TrendData = {
    monthIndex: number;
    income: number;
    expense: number;
    balance: number;
};

export type CashFlowData = {
    monthIndex: number;
    income: number;
    expense: number;
};

export type ContextStat = {
    id: string;
    name: string;
    total: number;
    transactionCount: number;
    avgPerTransaction: number;
    topCategory: string | null;
    topCategoryAmount: number;
    categoryBreakdown: { name: string; amount: number; percentage: number }[];
    fill: string;
};

export type DailyCumulativeData = {
    day: string;
    cumulative?: number;
    projection?: number;
};

export type RadarData = {
    monthIndex: number;
    value: number;
    fullMark: number;
};

export type ContextTrendData = {
    monthIndex: number;
    period?: string;
    [contextId: string]: number | string | undefined;
};

export type GroupBalance = {
    memberId: string;
    userId?: string | null;
    guestName?: string | null;
    paid: number;
    shouldPay: number;
    balance: number;
};

export type BudgetHealth = {
    id: string;
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    limit: number;
    spent: number;
    remaining: number;
    percentage: number;
    isOverBudget: boolean;
};

export type CategoryComparisonData = {
    name: string;
    current: number;
    previous: number;
    change: number;
    trend: "improved" | "worsened";
};

export type MonthlyCumulativeData = {
    month: string;
    cumulative: number;
};

export type StatisticsWorkerResponse = {
    type: "STATS_RESULT";
    payload: {
        monthlyStats: { income: number; expense: number; investment: number; byCategory: CategoryStat[] };
        yearlyStats: { income: number; expense: number; investment: number; byCategory: CategoryStat[] };
        monthlyNetBalance: number;
        yearlyNetBalance: number;
        monthlyCategoryPercentages: CategoryPercentage[];
        yearlyCategoryPercentages: CategoryPercentage[];
        monthlyExpensesByHierarchy: HierarchyNode[];
        yearlyExpensesByHierarchy: HierarchyNode[];
        monthlyTrendData: TrendData[];
        monthlyCashFlow: CashFlowData[];
        contextStats: ContextStat[];
        dailyCumulativeExpenses: DailyCumulativeData[];
        monthlyExpenses: RadarData[];
        monthlyIncome: RadarData[];
        monthlyInvestments: RadarData[];
        monthlyContextTrends: ContextTrendData[];

        groupBalances: GroupBalance[];
        monthlyBudgetHealth: BudgetHealth[];
    };
};
