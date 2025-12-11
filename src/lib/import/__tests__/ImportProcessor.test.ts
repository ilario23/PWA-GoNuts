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

            // Should create the local-only Uncategorized category
            expect(db.categories.put).toHaveBeenCalledWith(expect.objectContaining({
                id: UNCATEGORIZED_CATEGORY.ID,
                name: UNCATEGORIZED_CATEGORY.NAME,
                pendingSync: 0  // Local-only, never syncs
            }));

            // Transaction should use the reserved category ID
            expect(db.transactions.put).toHaveBeenCalledWith(expect.objectContaining({
                description: 'Mystery',
                category_id: UNCATEGORIZED_CATEGORY.ID
            }));
        });
    });
});
