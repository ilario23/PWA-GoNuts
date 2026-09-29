import { Category, Transaction, GroupMember, Context, CategoryBudget } from "../lib/db";

export type StatisticsWorkerRequest = {
    type: "CALCULATE_STATS";
    payload: {
        transactions: Transaction[];
        categories: Category[];
        contexts: Context[];
        previousMonthTransactions: Transaction[];
        previousYearTransactions: Transaction[];
        yearlyTransactions: Transaction[];
        /** Every non-deleted transaction across all years (for multi-year series) */
        allTimeTransactions?: Transaction[];
        /** settings.monthly_budget, for budget pacing */
        monthlyBudget?: number;
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

export type RecurringSplit = {
    recurringTotal: number;
    oneOffTotal: number;
    recurringCount: number;
    oneOffCount: number;
    /** recurringTotal / expense total of the active period, 0-100 */
    recurringPct: number;
    /** Yearly mode: 12-month stacked-bar series. Omitted in monthly mode. */
    monthly?: { monthIndex: number; recurring: number; oneOff: number }[];
};

export type SavingsRatePoint = {
    monthIndex: number;
    savingsRate: number;
    balance: number;
};

export type WeekdayStat = {
    /** 0=Sun .. 6=Sat */
    weekday: number;
    total: number;
    count: number;
    avg: number;
};

export type WeekdaySeasonality = {
    days: WeekdayStat[];
    weekendPct: number;
    busiestWeekday: number;
};

export type MultiYearPoint = {
    /** YYYY-MM */
    period: string;
    expense: number;
    ma3?: number;
    ma6?: number;
    ma12?: number;
};

export type BudgetPacingPoint = {
    monthIndex: number;
    actual: number;
    budget: number;
    variance: number;
};

export type BudgetPacing = {
    monthlyBudget: number;
    points: BudgetPacingPoint[];
    projectedYearEnd: number;
    ytdActual: number;
    ytdBudget: number;
};

export type MerchantStat = {
    name: string;
    total: number;
    count: number;
    avg: number;
};

export type RootCategoryTrendPoint = {
    /** YYYY-MM */
    period: string;
    values: Record<string, number>;
};

export type RootCategoryTrend = {
    categories: { name: string; color: string }[];
    points: RootCategoryTrendPoint[];
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
        previousMonthCumulativeExpenses: DailyCumulativeData[];
        monthlyExpenses: RadarData[];
        monthlyIncome: RadarData[];
        monthlyInvestments: RadarData[];
        monthlyContextTrends: ContextTrendData[];
        yearlyCumulativeExpenses: MonthlyCumulativeData[];
        previousYearCumulativeExpenses: MonthlyCumulativeData[];

        groupBalances: GroupBalance[];
        monthlyBudgetHealth: BudgetHealth[];
        previousMonthStats?: { income: number; expense: number; investment: number; byCategory: CategoryStat[] };

        categoryComparison: CategoryComparisonData[];
        recurringVsOneOff: RecurringSplit;
        savingsRateTrend: SavingsRatePoint[];
        weekdaySeasonality: WeekdaySeasonality;
        multiYearTrend: MultiYearPoint[];
        budgetPacing: BudgetPacing;
        topMerchants: MerchantStat[];
        rootCategoryTrend: RootCategoryTrend;
    };
};
