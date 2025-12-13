import { ImportProcessor } from '../ImportProcessor';
import { db } from '../../db';
import { UNCATEGORIZED_CATEGORY } from '../../constants';

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn().mockImplementation(() => 'test-uuid-' + Math.random())
}));

// Mock DB
jest.mock('../../db', () => ({
    db: {
        categories: {
            where: jest.fn(),
            get: jest.fn(),
            put: jest.fn(),
            bulkPut: jest.fn(),
        },
        transactions: {
            put: jest.fn(),
            bulkPut: jest.fn(),
        },
        contexts: {
            where: jest.fn().mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([])
                })
            }),
            put: jest.fn(),
            bulkPut: jest.fn(),
        },
        recurring_transactions: {
            where: jest.fn(),
            put: jest.fn(),
            bulkPut: jest.fn(),
        },
        category_budgets: {
            put: jest.fn(),
            where: jest.fn().mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([])
                })
            }),
            bulkPut: jest.fn(),
        },
        transaction: jest.fn((_mode, _tables, callback) => callback())
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

            // Mock contexts lookup - empty by default
            (db.contexts.where as jest.Mock).mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([])
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
                    toArray: jest.fn().mockResolvedValue([])
                })
            });
            // Category Get (during insert check)
            (db.categories.get as jest.Mock).mockResolvedValue(null);

            const result = await processor.process(data);

            // Expect category to be inserted
            expect(db.categories.bulkPut).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    name: 'Food',
                    user_id: userId
                })
            ]));

            // Expect transaction to be inserted
            expect(db.transactions.bulkPut).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    description: 'Lunch',
                    amount: 50, // Normalized
                    user_id: userId
                })
            ]));

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
            expect(db.categories.put).not.toHaveBeenCalled();
            expect(db.categories.bulkPut).not.toHaveBeenCalled();

            // Transaction should use the reserved category ID (category check is now based on category_id)
            expect(db.transactions.bulkPut).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    description: 'Mystery',
                    category_id: UNCATEGORIZED_CATEGORY.ID
                })
            ]));
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
                    toArray: jest.fn().mockResolvedValue([])
                })
            });
            (db.categories.get as jest.Mock).mockResolvedValue(null);

            await processor.process(data);

            // Check active category
            expect(db.categories.bulkPut).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    name: 'Active Cat',
                    active: 1
                }),
                expect.objectContaining({
                    name: 'Inactive Cat',
                    active: 0
                })
            ]));
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
                    toArray: jest.fn().mockResolvedValue([])
                })
            });
            // Update: mock 'get' sequence:
            // 1. First call (Category Insert Check): returns null (so we insert category)
            // 2. Second call (Budget Check): returns object (so we proceed to check budget)
            (db.categories.get as jest.Mock)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ id: 'cat-1', name: 'Budgeted Cat' });

            // Mock budget check to return empty array (so it creates new)
            (db.category_budgets.where as jest.Mock).mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([])
                })
            });

            await processor.process(data);

            // Verify category created
            expect(db.categories.bulkPut).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    name: 'Budgeted Cat'
                })
            ]));

            // Verify budget created
            expect(db.category_budgets.bulkPut).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    amount: 500,
                    period: 'monthly'
                })
            ]));
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
                    toArray: jest.fn().mockResolvedValue([])
                })
            });
            (db.categories.get as jest.Mock).mockResolvedValue(null);

            await processor.process(data);

            const calls = (db.transactions.put as jest.Mock).mock.calls;
            if (JSON.stringify(calls).indexOf('50') === -1) {
                // throw new Error(`DEBUG: Put calls did not contain 50. Calls: ${JSON.stringify(calls, null, 2)}`);
            }

            // Verify transaction imported with 50% of the amount (50)
            expect(db.transactions.bulkPut).toHaveBeenCalledWith(expect.arrayContaining([
                expect.objectContaining({
                    description: 'Shared Dinner',
                    amount: 50,
                    group_id: null,
                    user_id: userId
                })
            ]));
        });
    });

    describe('process (Vue Legacy Import)', () => {
        it('should correctly preserve parent-child relationships for categories', async () => {
            // This test reproduces the bug where "Carburante" ends up as root instead of child of "Trasporto"
            // The order in the array matters - Carburante comes BEFORE Trasporto
            const data: any = {
                source: 'legacy_vue',
                categories: [
                    // Child category comes before parent in array (same order as JSON export)
                    {
                        id: '2908991a-f58e-4ad9-a658-b88efe37f3b2',
                        title: 'Carburante',
                        color: '#ff8648',
                        icon: 'i-carbon:gas-station',
                        parentCategoryId: '2e4bc9aa-b4ce-46ad-a2da-ee7496d9bbd0', // Trasporto
                        active: true,
                        type: 1
                    },
                    // Parent category comes after child
                    {
                        id: '2e4bc9aa-b4ce-46ad-a2da-ee7496d9bbd0',
                        title: 'Trasporto',
                        color: '#f99595',
                        icon: 'i-carbon:ShoppingCart',
                        parentCategoryId: '533d4482-df54-47e5-b8d8-000000000001', // ROOT - Expenses
                        active: true,
                        type: 1
                    },
                    // Sub-child under Carburante
                    {
                        id: '79a8b36d-34f6-4cd6-828f-a7ead14ecfae',
                        title: 'Carburante Mito',
                        color: '#ff8648',
                        icon: 'i-carbon:gas-station',
                        parentCategoryId: '2908991a-f58e-4ad9-a658-b88efe37f3b2', // Carburante
                        active: true,
                        type: 1
                    }
                ],
                transactions: []
            };

            // Mock empty DB (fresh import)
            (db.categories.where as jest.Mock).mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([])
                })
            });
            (db.categories.get as jest.Mock).mockResolvedValue(null);

            await processor.process(data);

            // Get the categories that were inserted
            const bulkPutCalls = (db.categories.bulkPut as jest.Mock).mock.calls;
            expect(bulkPutCalls.length).toBeGreaterThan(0);

            const insertedCategories = bulkPutCalls[0][0];

            // Find our test categories
            const carburante = insertedCategories.find((c: any) => c.name === 'Carburante');
            const trasporto = insertedCategories.find((c: any) => c.name === 'Trasporto');
            const carburanteMito = insertedCategories.find((c: any) => c.name === 'Carburante Mito');

            expect(carburante).toBeDefined();
            expect(trasporto).toBeDefined();
            expect(carburanteMito).toBeDefined();

            // CRITICAL: Trasporto should have NO parent (since its parent is ROOT which is excluded)
            expect(trasporto.parent_id).toBeUndefined();

            // CRITICAL: Carburante should have Trasporto as parent
            expect(carburante.parent_id).toBe(trasporto.id);

            // CRITICAL: Carburante Mito should have Carburante as parent
            expect(carburanteMito.parent_id).toBe(carburante.id);
        });

        it('should correctly handle multi-level hierarchies with 3+ levels', async () => {
            // Test 3-level hierarchy: Expenses (ROOT) -> Trasporto -> Carburante -> Carburante Mito
            const data: any = {
                source: 'legacy_vue',
                categories: [
                    // Level 3 (deepest) - comes first
                    {
                        id: '79a8b36d-34f6-4cd6-828f-a7ead14ecfae',
                        title: 'Carburante Mito',
                        color: '#ff8648',
                        parentCategoryId: '2908991a-f58e-4ad9-a658-b88efe37f3b2', // Carburante
                        active: true,
                        type: 1
                    },
                    // Level 2
                    {
                        id: '2908991a-f58e-4ad9-a658-b88efe37f3b2',
                        title: 'Carburante',
                        color: '#ff8648',
                        parentCategoryId: '2e4bc9aa-b4ce-46ad-a2da-ee7496d9bbd0', // Trasporto
                        active: true,
                        type: 1
                    },
                    // Level 1 (root within type)
                    {
                        id: '2e4bc9aa-b4ce-46ad-a2da-ee7496d9bbd0',
                        title: 'Trasporto',
                        color: '#f99595',
                        parentCategoryId: '533d4482-df54-47e5-b8d8-000000000001', // ROOT
                        active: true,
                        type: 1
                    }
                ],
                transactions: []
            };

            (db.categories.where as jest.Mock).mockReturnValue({
                equals: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([])
                })
            });
            (db.categories.get as jest.Mock).mockResolvedValue(null);

            await processor.process(data);

            const bulkPutCalls = (db.categories.bulkPut as jest.Mock).mock.calls;
            const insertedCategories = bulkPutCalls[0][0];

            const carburante = insertedCategories.find((c: any) => c.name === 'Carburante');
            const trasporto = insertedCategories.find((c: any) => c.name === 'Trasporto');
            const carburanteMito = insertedCategories.find((c: any) => c.name === 'Carburante Mito');

            // Build hierarchy chains and verify
            console.log('[TEST] Hierarchy chain verification:');
            console.log(`  Mito.parent_id = ${carburanteMito?.parent_id}`);
            console.log(`  Carburante.id = ${carburante?.id}`);
            console.log(`  Carburante.parent_id = ${carburante?.parent_id}`);
            console.log(`  Trasporto.id = ${trasporto?.id}`);
            console.log(`  Trasporto.parent_id = ${trasporto?.parent_id}`);

            // Mito -> Carburante -> Trasporto -> undefined (ROOT)
            expect(carburanteMito.parent_id).toBe(carburante.id);
            expect(carburante.parent_id).toBe(trasporto.id);
            expect(trasporto.parent_id).toBeUndefined();
        });
    });
});

