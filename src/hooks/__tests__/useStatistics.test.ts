import { renderHook } from '@testing-library/react';
import { useStatistics } from '../useStatistics';
import { useLiveQuery } from 'dexie-react-hooks';

// Mock dependencies
jest.mock('dexie-react-hooks', () => ({
    useLiveQuery: jest.fn(),
}));

jest.mock('../../lib/db', () => ({
    db: {
        transactions: {
            where: jest.fn().mockReturnThis(),
            equals: jest.fn().mockReturnThis(),
            between: jest.fn().mockReturnThis(),
            toArray: jest.fn(),
        },
        categories: {
            toArray: jest.fn(),
        },
        contexts: {
            toArray: jest.fn(),
        },
        group_members: {
            where: jest.fn().mockReturnThis(),
            equals: jest.fn().mockReturnThis(),
            toArray: jest.fn(),
        },
    },
}));

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string) => k,
    }),
}));

describe('useStatistics', () => {
    const mockTransactions = [
        {
            id: '1',
            amount: 50,
            type: 'expense',
            date: '2023-01-15',
            year_month: '2023-01',
            category_id: 'cat-1',
            description: 'Groceries'
        },
        {
            id: '2',
            amount: 1000,
            type: 'income',
            date: '2023-01-01',
            year_month: '2023-01',
            category_id: 'cat-salary',
            description: 'Salary'
        }
    ];

    const mockCategories = [
        { id: 'cat-1', name: 'Food', color: 'red' },
        { id: 'cat-salary', name: 'Salary', color: 'green' }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default mocks
        (useLiveQuery as jest.Mock).mockImplementation(() => {
            // We can't easily execute the callback because it calls db methods which are mocked chainable.
            // Instead, we can look at the arguments or just return mock data based on some context if needed.
            // But simpler: useLiveQuery mocks usually return the data directly if we mock the HOOK implementation, not the callback execution.
            // Wait, useLiveQuery takes a callback. The hook executes it.
            // Since we mocked useLiveQuery, we control what it returns.
            // The implementation of useLiveQuery in code is: const val = useLiveQuery(querier, deps)
            // We need to return the data relevant for the call.
            // This is tricky because useStatistics calls useLiveQuery multiple times.
            // We need to mock return values based on order or context?
            // Or better: the callback usually returns a Promise.
            return [];
        });
    });

    it('should calculate monthly stats correctly', () => {
        // We need to carefully mock useLiveQuery to return different data for different calls
        // useStatistics calls:
        // 1. transactions (selected month)
        // 2. previousMonthTransactions
        // 3. yearlyTransactions (skipped if monthly)
        // 4. previousYearTransactions (skipped)
        // 5. categories
        // 6. contexts
        // 7. groupMemberships

        let callIndex = 0;
        (useLiveQuery as jest.Mock).mockImplementation(() => {
            callIndex++;
            if (callIndex === 1) return mockTransactions; // current month transactions
            if (callIndex === 5) return mockCategories; // categories
            return [];
        });

        const { result } = renderHook(() => useStatistics({ selectedMonth: '2023-01', mode: 'monthly' }));

        expect(result.current.monthlyStats.expense).toBe(50);
        expect(result.current.monthlyStats.income).toBe(1000);
        expect(result.current.monthlyNetBalance).toBe(950);
        expect(result.current.monthlyStats.byCategory).toHaveLength(1);
        expect(result.current.monthlyStats.byCategory[0].name).toBe('Food');
    });

    it('should respect yearly mode', () => {
        // Yearly mode calls:
        // 1. transactions (skipped -> [])
        // 2. prev month (skipped -> [])
        // 3. yearlyTransactions (active)
        // 4. prev year (active)
        // 5. categories

        let callIndex = 0;
        (useLiveQuery as jest.Mock).mockImplementation(() => {
            callIndex++;
            if (callIndex === 3) return mockTransactions; // yearly transactions
            if (callIndex === 5) return mockCategories;
            return [];
        });

        const { result } = renderHook(() => useStatistics({ selectedYear: '2023', mode: 'yearly' }));

        expect(result.current.yearlyStats.expense).toBe(50);
        expect(result.current.yearlyStats.income).toBe(1000);
        // Monthly stats should be empty/default
        expect(result.current.monthlyStats.income).toBe(0);
    });
    it('should apply group share logic to expenses', () => {
        const groupTransactions = [
            {
                id: '3',
                amount: 100, // 100 expense
                type: 'expense',
                date: '2023-01-20',
                year_month: '2023-01',
                category_id: 'cat-1',
                group_id: 'group-1' // Shared expense
            }
        ];

        const mockMemberships = [
            { group_id: 'group-1', user_id: 'me', share: 40 } // 40% share
        ];

        let callIndex = 0;
        (useLiveQuery as jest.Mock).mockImplementation(() => {
            callIndex++;
            if (callIndex === 1) return groupTransactions;
            if (callIndex === 5) return mockCategories;
            if (callIndex === 7) return mockMemberships; // groupMemberships
            return [];
        });

        const { result } = renderHook(() => useStatistics({ selectedMonth: '2023-01', mode: 'monthly', userId: 'me' }));

        // 40% of 100 = 40. Expense is positive -> 40.
        expect(result.current.monthlyStats.expense).toBe(40);
    });

    it('should aggregate stats by context', () => {
        const contextTransactions = [
            {
                id: '4',
                amount: 200,
                type: 'expense',
                date: '2023-01-20',
                year_month: '2023-01',
                category_id: 'cat-1',
                context_id: 'ctx-1'
            }
        ];

        const mockContexts = [
            { id: 'ctx-1', name: 'Vacation' }
        ];

        let callIndex = 0;
        (useLiveQuery as jest.Mock).mockImplementation(() => {
            callIndex++;
            if (callIndex === 1) return contextTransactions;
            if (callIndex === 5) return mockCategories;
            if (callIndex === 6) return mockContexts; // contexts
            return [];
        });

        const { result } = renderHook(() => useStatistics({ selectedMonth: '2023-01', mode: 'monthly' }));

        expect(result.current.contextStats).toHaveLength(1);
        expect(result.current.contextStats[0].name).toBe('Vacation');
        expect(result.current.contextStats[0].total).toBe(200);
    });

    it('should calculate category percentages correctly', () => {
        const catTransactions = [
            { id: '5', amount: 60, type: 'expense', category_id: 'cat-1', date: '2023-01-20', year_month: '2023-01' },
            { id: '6', amount: 40, type: 'expense', category_id: 'cat-2', date: '2023-01-21', year_month: '2023-01' }
        ];

        const cats = [
            { id: 'cat-1', name: 'Food', color: 'red' },
            { id: 'cat-2', name: 'Transport', color: 'blue' }
        ];

        let callIndex = 0;
        (useLiveQuery as jest.Mock).mockImplementation(() => {
            callIndex++;
            if (callIndex === 1) return catTransactions;
            if (callIndex === 5) return cats;
            return [];
        });

        const { result } = renderHook(() => useStatistics({ selectedMonth: '2023-01', mode: 'monthly' }));

        // Total expense = 100. Food = 60. Transport = 40.
        // Percentages should be 60 and 40.
        expect(result.current.monthlyStats.expense).toBe(100);
        expect(result.current.monthlyCategoryPercentages).toHaveLength(2);

        const food = result.current.monthlyCategoryPercentages.find((c: any) => c.name === 'Food');
        const transport = result.current.monthlyCategoryPercentages.find((c: any) => c.name === 'Transport');

        // In monthlyCategoryPercentages, 'value' is the percentage
        expect(food?.value).toBe(60);
        expect(transport?.value).toBe(40);
    });
});
