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

export type StatisticsWorkerResponse = {
    type: "STATS_RESULT";
    payload: {
        monthlyStats: any;
        yearlyStats: any;
        monthlyNetBalance: number;
        yearlyNetBalance: number;
        monthlyCategoryPercentages: any[];
        yearlyCategoryPercentages: any[];
        monthlyExpensesByHierarchy: any[];
        yearlyExpensesByHierarchy: any[];
        monthlyTrendData: any[];
        monthlyCashFlow: any[];
        contextStats: any[];
        dailyCumulativeExpenses: any[];
        monthlyExpenses: any[];
        monthlyIncome: any[];
        monthlyInvestments: any[];
        monthlyContextTrends: any[];
        monthlyRecurringSplit: any[];
        groupBalances: any[];
        monthlyBudgetHealth: any[];
    };
};
