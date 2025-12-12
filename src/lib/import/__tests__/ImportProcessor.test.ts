import { ImportProcessor } from '../ImportProcessor';
import { db } from '../../db';
import { UNCATEGORIZED_CATEGORY } from '../../constants';

// Mock DB
jest.mock('../../db', () => ({
    db: {
        categories: {
            where: jest.fn(),
            get: jest.fn(),
            put: jest.fn(),
        },
        transactions: {
            put: jest.fn(),
        },
        contexts: {
            where: jest.fn(),
            put: jest.fn()
        },
        recurring_transactions: {
            where: jest.fn(),
            put: jest.fn()
        },
        category_budgets: {
            put: jest.fn(),
            where: jest.fn()
        }
    }
}));

describe('ImportProcessor', () => {
    let processor: ImportProcessor;
    const userId = 'user-123';

    beforeEach(() => {
        jest.clearAllMocks();
        processor = new ImportProcessor(userId);
    });

    describe('analyzeCategoryConflicts', () => {
        it('should detect potential conflicts using fuzzy matching', async () => {
            const importedCategories = [
                { id: '1', name: 'Alimentari' }, // Conflict
                { id: '2', name: 'Unique Category' } // No conflict
            ];

            // Existing DB categories
            const existingCategories = [
                { id: 'ex-1', name: 'Alimenti', user_id: userId }
            ];

            (db.categories.where as jest.Mock).mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue(existingCategories)
                })
            });

            const data: any = { categories: importedCategories };
            const conflicts = await processor.analyzeCategoryConflicts(data);

            expect(conflicts).toHaveLength(1);
            expect(conflicts[0].imported.name).toBe('Alimentari');
            expect(conflicts[0].existing.name).toBe('Alimenti');
        });

        it('should ignore exact matches (auto-merge)', async () => {
            const importedCategories = [
                { id: '1', name: 'Food' }
            ];
            const existingCategories = [
                { id: 'ex-1', name: 'Food', user_id: userId }
            ];

            (db.categories.where as jest.Mock).mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue(existingCategories)
                })
            });

            const data: any = { categories: importedCategories };
            const conflicts = await processor.analyzeCategoryConflicts(data);

            expect(conflicts).toHaveLength(0);
        });
    });

    describe('process (Standard Import)', () => {
        it('should import categories and transactions correctly', async () => {
            const data: any = {
                source: 'standard',
                categories: [
                    { id: 'cat-1', name: 'Food' }
                ],
                transactions: [
                    { id: 'tx-1', amount: -50, description: 'Lunch', category_id: 'cat-1', date: '2023-01-01' }
                ]
            };

            // Mock Category Check: No existing category named Food
            // Pass 1 (ID resolution)
            (db.categories.where as jest.Mock).mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    filter: jest.fn().mockReturnValue({
                        first: jest.fn().mockResolvedValue(null) // Not found
                    })
                })
            });
            // Category Get (during insert check)
            (db.categories.get as jest.Mock).mockResolvedValue(null);

            const result = await processor.process(data);

            // Expect category to be inserted
            expect(db.categories.put).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Food',
                user_id: userId
            }));

            // Expect transaction to be inserted
            expect(db.transactions.put).toHaveBeenCalledWith(expect.objectContaining({
                description: 'Lunch',
                amount: 50, // Normalized
                user_id: userId
            }));

            expect(result.categories).toBe(1);
            expect(result.transactions).toBe(1);
        });

        it('should use fallback category with reserved ID if category_id missing', async () => {
            const data: any = {
                source: 'standard',
                transactions: [
                    { id: 'tx-1', amount: -10, description: 'Mystery', date: '2023-01-01' }
                ]
            };

            // Fallback lookup by reserved ID - category doesn't exist yet
            (db.categories.get as jest.Mock).mockResolvedValue(null);

            await processor.process(data);

            // Should NOT create the local-only Uncategorized category (logic removed)
            expect(db.categories.put).not.toHaveBeenCalledWith(expect.objectContaining({
                id: UNCATEGORIZED_CATEGORY.ID
            }));

            // Transaction should use the reserved category ID (category check is now based on category_id)
            expect(db.transactions.put).toHaveBeenCalledWith(expect.objectContaining({
                description: 'Mystery',
                category_id: UNCATEGORIZED_CATEGORY.ID
            }));
        });

        it('should respect active status from imported category', async () => {
            const data: any = {
                source: 'standard',
                categories: [
                    { id: 'cat-active', name: 'Active Cat', active: 1 },
                    { id: 'cat-inactive', name: 'Inactive Cat', active: 0 }
                ],
                transactions: []
            };

            // Mock checks
            (db.categories.where as jest.Mock).mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    filter: jest.fn().mockReturnValue({
                        first: jest.fn().mockResolvedValue(null)
                    })
                })
            });
            (db.categories.get as jest.Mock).mockResolvedValue(null);

            await processor.process(data);

            // Check active category
            expect(db.categories.put).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Active Cat',
                active: 1
            }));

            // Check inactive category
            expect(db.categories.put).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Inactive Cat',
                active: 0
            }));
        });

        it('should import category budgets', async () => {
            const data: any = {
                source: 'standard',
                categories: [
                    { id: 'cat-1', name: 'Budgeted Cat' }
                ],
                budgets: [
                    { category_id: 'cat-1', amount: 500, period: 'monthly' }
                ],
                transactions: []
            };

            // Mock checks
            (db.categories.where as jest.Mock).mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    filter: jest.fn().mockReturnValue({
                        first: jest.fn().mockResolvedValue(null)
                    })
                })
            });
            // Update: mock 'get' sequence:
            // 1. First call (Category Insert Check): returns null (so we insert category)
            // 2. Second call (Budget Check): returns object (so we proceed to check budget)
            (db.categories.get as jest.Mock)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ id: 'cat-1', name: 'Budgeted Cat' });

            // Mock budget check to return null (so it creates new)
            (db.category_budgets.where as jest.Mock).mockReturnValue({
                first: jest.fn().mockResolvedValue(null)
            });

            await processor.process(data);

            // Verify category created
            expect(db.categories.put).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Budgeted Cat'
            }));

            // Verify budget created
            expect(db.category_budgets.put).toHaveBeenCalledWith(expect.objectContaining({
                amount: 500,
                period: 'monthly'
            }));
        });

        it('should import group transaction share correctly', async () => {
            const data: any = {
                source: 'standard',
                userId: 'export-user-1',
                categories: [
                    { id: 'cat-1', name: 'Food' }
                ],
                groups: [
                    { id: 'group-1', name: 'Shared House' }
                ],
                group_members: [
                    { id: 'mem-1', group_id: 'group-1', user_id: 'export-user-1', share: 50 },
                    { id: 'mem-2', group_id: 'group-1', user_id: 'other-user', share: 50 }
                ],
                transactions: [
                    {
                        id: 'tx-1',
                        user_id: 'export-user-1',
                        group_id: 'group-1',
                        amount: -100,
                        description: 'Shared Dinner',
                        category_id: 'cat-1',
                        date: '2023-01-01'
                    }
                ]
            };

            // Mock checks
            (db.categories.where as jest.Mock).mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    filter: jest.fn().mockReturnValue({
                        first: jest.fn().mockResolvedValue(null)
                    })
                })
            });
            (db.categories.get as jest.Mock).mockResolvedValue(null);

            await processor.process(data);

            const calls = (db.transactions.put as jest.Mock).mock.calls;
            if (JSON.stringify(calls).indexOf('50') === -1) {
                // throw new Error(`DEBUG: Put calls did not contain 50. Calls: ${JSON.stringify(calls, null, 2)}`);
            }

            // Verify transaction imported with 50% of the amount (50)
            expect(db.transactions.put).toHaveBeenCalledWith(expect.objectContaining({
                description: 'Shared Dinner',
                amount: 50,
                group_id: null,
                user_id: userId
            }));
        });
    });
});
