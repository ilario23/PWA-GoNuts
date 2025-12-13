// Demo data for Welcome Wizard previews
// This data is static and never synced to the server

export interface DemoCategory {
    id: string;
    name: string;
    color: string;
    parent_id: string | null;
}

export interface DemoContext {
    id: string;
    name: string;
    description: string;
}

export interface DemoGroup {
    id: string;
    name: string;
}

export interface DemoGroupMember {
    id: string;
    name: string;
}

export interface DemoTransaction {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'investment';
    category_id: string;
}

export interface DemoSettings {
    currency: string;
    monthly_budget: number;
}

export interface DemoStats {
    totalExpenses: number;
    totalIncome: number;
    budgetUsed: number;
    categoryBreakdown: { name: string; amount: number; percentage: number }[];
}

// Static demo data
export const demoData = {
    categories: [
        { id: '1', name: 'Food', color: '#f97316', parent_id: null },
        { id: '2', name: 'Transport', color: '#3b82f6', parent_id: null },
        { id: '3', name: 'Entertainment', color: '#a855f7', parent_id: null },
        { id: '4', name: 'Bills', color: '#ef4444', parent_id: null },
        { id: '5', name: 'Shopping', color: '#ec4899', parent_id: null },
        { id: '6', name: 'Groceries', color: '#22c55e', parent_id: '1' },
        { id: '7', name: 'Restaurants', color: '#f59e0b', parent_id: '1' },
    ] as DemoCategory[],

    contexts: [
        { id: '1', name: '🏖️', description: 'Vacation' },
        { id: '2', name: '💼', description: 'Work' },
    ] as DemoContext[],

    groups: [
        { id: '1', name: 'Home 🏠' },
    ] as DemoGroup[],

    groupMembers: [
        { id: '1', name: 'You' },
        { id: '2', name: 'Partner' },
    ] as DemoGroupMember[],

    transactions: [
        { id: '1', description: 'Salary', amount: 2800, type: 'income', category_id: '1' },
        { id: '2', description: 'Grocery shopping', amount: 85.50, type: 'expense', category_id: '6' },
        { id: '3', description: 'Restaurant dinner', amount: 45.00, type: 'expense', category_id: '7' },
        { id: '4', description: 'Electric bill', amount: 120.00, type: 'expense', category_id: '4' },
        { id: '5', description: 'Netflix', amount: 15.99, type: 'expense', category_id: '3' },
    ] as DemoTransaction[],

    settings: {
        currency: '€',
        monthly_budget: 1500,
    } as DemoSettings,

    groupExpenses: [
        { id: '1', description: 'Supermarket', amount: 45.50, paid_by: 'You', split: '50/50' },
        { id: '2', description: 'Pizza Dinner', amount: 28.00, paid_by: 'Partner', split: '50/50' },
        { id: '3', description: 'Internet', amount: 29.90, paid_by: 'You', split: '50/50' },
    ],
};

// Calculate demo statistics
export function getDemoStats(): DemoStats {
    const expenses = demoData.transactions.filter(t => t.type === 'expense');
    const income = demoData.transactions.filter(t => t.type === 'income');

    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const budgetUsed = (totalExpenses / demoData.settings.monthly_budget) * 100;

    // Category breakdown
    const categoryTotals = new Map<string, number>();
    expenses.forEach(t => {
        const current = categoryTotals.get(t.category_id) || 0;
        categoryTotals.set(t.category_id, current + t.amount);
    });

    const categoryBreakdown = Array.from(categoryTotals.entries())
        .map(([catId, amount]) => {
            const cat = demoData.categories.find(c => c.id === catId);
            return {
                name: cat?.name || 'Other',
                amount,
                percentage: Math.round((amount / totalExpenses) * 100),
            };
        })
        .sort((a, b) => b.amount - a.amount);

    return {
        totalExpenses,
        totalIncome,
        budgetUsed: Math.min(budgetUsed, 100),
        categoryBreakdown,
    };
}
