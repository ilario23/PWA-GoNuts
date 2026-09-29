import {
    calculateCategoryComparison,
    calculateRecurringVsOneOff,
    calculateSavingsRateTrend,
    calculateWeekdaySeasonality,
    calculateMultiYearTrend,
    calculateBudgetPacing,
    calculateTopMerchants,
    calculateRootCategoryTrend,
} from '../statistics.worker';
import { Transaction, Category } from '../../lib/db';

const tx = (over: Partial<Transaction>): Transaction => ({
    id: over.id ?? Math.random().toString(36).slice(2),
    user_id: 'u1',
    category_id: 'cat-1',
    type: 'expense',
    amount: 10,
    date: '2023-01-15',
    year_month: '2023-01',
    description: '',
    ...over,
});

const noShares = new Map<string, number>();

describe('statistics.worker pure computations', () => {
    describe('calculateCategoryComparison', () => {
        it('computes percent change and improved trend when spending drops', () => {
            const result = calculateCategoryComparison(
                [{ name: 'Food', value: 50, color: 'red' }],
                [{ name: 'Food', value: 100, color: 'red' }]
            );
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                name: 'Food',
                current: 50,
                previous: 100,
                change: -50,
                trend: 'improved',
            });
        });

        it('marks increased spending as worsened and fills missing categories', () => {
            const result = calculateCategoryComparison(
                [
                    { name: 'Food', value: 80, color: 'red' },
                    { name: 'New', value: 20, color: 'blue' },
                ],
                [{ name: 'Food', value: 40, color: 'red' }]
            );
            const food = result.find(r => r.name === 'Food')!;
            const neu = result.find(r => r.name === 'New')!;
            expect(food.trend).toBe('worsened');
            expect(food.change).toBe(100);
            // previous = 0 and current > 0 -> 100% change
            expect(neu.previous).toBe(0);
            expect(neu.change).toBe(100);
            expect(neu.trend).toBe('worsened');
        });

        it('returns empty for yearly mode input', () => {
            expect(calculateCategoryComparison([], undefined)).toEqual([]);
        });

        it('caps at 8 sorted by absolute change', () => {
            const current = Array.from({ length: 12 }, (_, i) => ({
                name: `C${i}`,
                value: 10 + i * 10,
                color: 'red',
            }));
            const previous = Array.from({ length: 12 }, (_, i) => ({
                name: `C${i}`,
                value: 10,
                color: 'red',
            }));
            const result = calculateCategoryComparison(current, previous);
            expect(result).toHaveLength(8);
            // C11 has the largest absolute change
            expect(result[0].name).toBe('C11');
        });
    });

    describe('calculateRecurringVsOneOff', () => {
        it('splits expenses by recurrence flags', () => {
            const txs = [
                tx({ amount: 20, recurring_transaction_id: 'r1' }),
                tx({ amount: 30, recurrence_key: 'r1|2023-01-01' }),
                tx({ amount: 50 }),
            ];
            const split = calculateRecurringVsOneOff(txs, noShares, false);
            expect(split.recurringTotal).toBe(50);
            expect(split.oneOffTotal).toBe(50);
            expect(split.recurringCount).toBe(2);
            expect(split.oneOffCount).toBe(1);
            expect(split.recurringPct).toBe(50);
            expect(split.monthly).toBeUndefined();
        });

        it('builds the monthly series in yearly mode', () => {
            const txs = [
                tx({ amount: 10, year_month: '2023-01', date: '2023-01-05', recurring_transaction_id: 'r1' }),
                tx({ amount: 40, year_month: '2023-03', date: '2023-03-05' }),
            ];
            const split = calculateRecurringVsOneOff(txs, noShares, true);
            expect(split.monthly).toHaveLength(12);
            expect(split.monthly![0]).toEqual({ monthIndex: 0, recurring: 10, oneOff: 0 });
            expect(split.monthly![2]).toEqual({ monthIndex: 2, recurring: 0, oneOff: 40 });
        });

        it('ignores deleted and non-expense transactions', () => {
            const txs = [
                tx({ amount: 10, deleted_at: '2023-02-01' }),
                tx({ amount: 20, type: 'income' }),
            ];
            const split = calculateRecurringVsOneOff(txs, noShares, false);
            expect(split.recurringTotal + split.oneOffTotal).toBe(0);
            expect(split.recurringPct).toBe(0);
        });
    });

    describe('calculateSavingsRateTrend', () => {
        it('returns 12 points with savings rate per month', () => {
            const txs = [
                tx({ type: 'income', amount: 1000, year_month: '2023-01', date: '2023-01-01' }),
                tx({ type: 'expense', amount: 400, year_month: '2023-01', date: '2023-01-15' }),
            ];
            const trend = calculateSavingsRateTrend(txs, noShares);
            expect(trend).toHaveLength(12);
            expect(trend[0]).toEqual({ monthIndex: 0, savingsRate: 60, balance: 600 });
            // months without income -> savingsRate 0
            expect(trend[1]).toEqual({ monthIndex: 1, savingsRate: 0, balance: 0 });
        });
    });

    describe('calculateWeekdaySeasonality', () => {
        it('aggregates by local weekday and computes weekend share', () => {
            // 2023-01-15 is a Sunday; 2023-01-16 is a Monday
            const txs = [
                tx({ amount: 30, date: '2023-01-15' }),
                tx({ amount: 20, date: '2023-01-16' }),
                tx({ amount: 50, date: '2023-01-16' }),
            ];
            const result = calculateWeekdaySeasonality(txs, noShares);
            expect(result.days).toHaveLength(7);
            expect(result.days[0]).toMatchObject({ weekday: 0, total: 30, count: 1, avg: 30 });
            expect(result.days[1]).toMatchObject({ weekday: 1, total: 70, count: 2, avg: 35 });
            expect(result.weekendPct).toBe(30);
            expect(result.busiestWeekday).toBe(1);
        });
    });

    describe('calculateMultiYearTrend', () => {
        it('fills gaps and computes trailing moving averages', () => {
            const txs = [
                tx({ amount: 30, year_month: '2022-11', date: '2022-11-05' }),
                // 2022-12 intentionally missing
                tx({ amount: 60, year_month: '2023-01', date: '2023-01-05' }),
            ];
            const trend = calculateMultiYearTrend(txs, noShares);
            expect(trend.map(p => p.period)).toEqual(['2022-11', '2022-12', '2023-01']);
            expect(trend[0].expense).toBe(30);
            expect(trend[1].expense).toBe(0);
            expect(trend[2].expense).toBe(60);
            // ma3 defined only from the 3rd point on
            expect(trend[0].ma3).toBeUndefined();
            expect(trend[1].ma3).toBeUndefined();
            expect(trend[2].ma3).toBe(30); // (30 + 0 + 60) / 3
            expect(trend[2].ma6).toBeUndefined();
        });

        it('returns empty when there is no data', () => {
            expect(calculateMultiYearTrend([], noShares)).toEqual([]);
        });
    });

    describe('calculateBudgetPacing', () => {
        it('builds 12 points against the monthly budget', () => {
            const txs = [tx({ amount: 500, year_month: '2023-01', date: '2023-01-10' })];
            const pacing = calculateBudgetPacing(txs, 1000, '2023', noShares);
            expect(pacing.monthlyBudget).toBe(1000);
            expect(pacing.points).toHaveLength(12);
            expect(pacing.points[0]).toEqual({ monthIndex: 0, actual: 500, budget: 1000, variance: -500 });
            // 2023 is a past year -> ytd covers all 12 months
            expect(pacing.ytdActual).toBe(500);
            expect(pacing.ytdBudget).toBe(12000);
            expect(pacing.projectedYearEnd).toBe(500);
        });
    });

    describe('calculateTopMerchants', () => {
        it('normalizes descriptions and ranks by total', () => {
            const txs = [
                tx({ amount: 10, description: '  Starbucks  ' }),
                tx({ amount: 20, description: 'STARBUCKS' }),
                tx({ amount: 5, description: '!!!' }), // empty key after normalize
                tx({ amount: 50, description: 'Amazon' }),
            ];
            const merchants = calculateTopMerchants(txs, noShares);
            expect(merchants).toHaveLength(2);
            expect(merchants[0]).toMatchObject({ name: 'Amazon', total: 50, count: 1, avg: 50 });
            expect(merchants[1]).toMatchObject({ name: 'Starbucks', total: 30, count: 2, avg: 15 });
        });
    });

    describe('calculateRootCategoryTrend', () => {
        it('rolls expenses up to root categories per month', () => {
            const categories: Category[] = [
                { id: 'root-a', user_id: 'u1', name: 'Food', icon: 'utensils', color: 'red', type: 'expense', active: 1 },
                { id: 'child-a', user_id: 'u1', name: 'Groceries', icon: 'cart', color: 'orange', type: 'expense', active: 1, parent_id: 'root-a' },
                { id: 'root-b', user_id: 'u1', name: 'Transport', icon: 'car', color: 'blue', type: 'expense', active: 1 },
            ];
            const categoryMap = new Map(categories.map(c => [c.id, c]));
            const txs = [
                tx({ amount: 40, category_id: 'child-a', year_month: '2023-01', date: '2023-01-05' }),
                tx({ amount: 60, category_id: 'root-b', year_month: '2023-01', date: '2023-01-06' }),
                tx({ amount: 10, category_id: 'root-a', year_month: '2023-02', date: '2023-02-05' }),
            ];
            const trend = calculateRootCategoryTrend(txs, categoryMap, noShares, '2023');
            // Sorted by total desc: Transport 60 > Food 50
            expect(trend.categories).toEqual([
                { name: 'Transport', color: 'blue' },
                { name: 'Food', color: 'red' },
            ]);
            expect(trend.points).toHaveLength(12);
            expect(trend.points[0].values).toEqual({ Food: 40, Transport: 60 });
            expect(trend.points[1].values).toEqual({ Food: 10 });
        });
    });
});
