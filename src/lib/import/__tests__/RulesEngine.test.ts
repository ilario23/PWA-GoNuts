import { RulesEngine } from '../RulesEngine';
import { db } from '../../db';
import { ParsedTransaction } from '../types';

// Mock the db module
jest.mock('../../db', () => ({
    db: {
        import_rules: {
            where: jest.fn(),
            add: jest.fn(),
        }
    }
}));

describe('RulesEngine', () => {
    let engine: RulesEngine;
    const userId = 'user-123';

    // Mock implementations for the fluent API

    const mockEquals = jest.fn();
    const mockFilter = jest.fn();
    const mockToArray = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup the chain: db.import_rules.where().equals().filter().toArray()
        (db.import_rules.where as jest.Mock).mockReturnValue({
            equals: mockEquals
        });
        mockEquals.mockReturnValue({
            filter: mockFilter
        });
        mockFilter.mockReturnValue({
            toArray: mockToArray
        });

        // Default: return empty rules
        mockToArray.mockResolvedValue([]);

        engine = new RulesEngine(userId);
    });

    describe('loadRules', () => {
        it('should load active rules for the user', async () => {
            const mockRules = [
                { id: '1', match_string: 'Netflix', category_id: 'cat-1', active: 1 }
            ];
            mockToArray.mockResolvedValue(mockRules);

            await engine.loadRules();

            expect(db.import_rules.where).toHaveBeenCalledWith('user_id');
            expect(mockEquals).toHaveBeenCalledWith(userId);
            // We can't easily check the filter function logic passed to 'filter', 
            // but we can trust the chain was called.
            expect(mockToArray).toHaveBeenCalled();
        });
    });

    describe('applyRules', () => {
        it('should apply an exact match rule', async () => {
            const rules = [
                { id: '1', match_string: 'Netflix', category_id: 'entertainment-id', match_type: 'exact', active: 1 }
            ];
            // Manually inject rules to internal state to avoid overly complex loading mocks if possible, 
            // but since 'rules' property is private, we should use 'loadRules' with mock.
            mockToArray.mockResolvedValue(rules);
            await engine.loadRules();

            const transactions: ParsedTransaction[] = [
                { description: 'Netflix', amount: 10, date: '2023-01-01', type: 'expense' } as unknown as ParsedTransaction,
                { description: 'Netflix Subscription', amount: 10, date: '2023-01-01', type: 'expense' } as unknown as ParsedTransaction
            ];

            const matchCount = engine.applyRules(transactions);

            expect(matchCount).toBe(1);
            expect(transactions[0].category_id).toBe('entertainment-id');
            expect(transactions[1].category_id).toBeUndefined(); // 'Netflix Subscription' != 'Netflix'
        });

        it('should apply a contains match rule', async () => {
            const rules = [
                { id: '1', match_string: 'Uber', category_id: 'transport-id', match_type: 'contains', active: 1 }
            ];
            mockToArray.mockResolvedValue(rules);
            await engine.loadRules();

            const transactions: ParsedTransaction[] = [
                { description: 'Uber Trip', amount: 15, date: '2023-01-01', type: 'expense' } as unknown as ParsedTransaction,
                { description: 'Puber', amount: 5, date: '2023-01-01', type: 'expense' } as unknown as ParsedTransaction
            ];

            const matchCount = engine.applyRules(transactions);

            expect(matchCount).toBe(2);
            expect(transactions[0].category_id).toBe('transport-id');
            expect(transactions[1].category_id).toBe('transport-id');
        });

        it('should apply a regex match rule', async () => {
            const rules = [
                { id: '1', match_string: '^AMZN.*Mktp$', category_id: 'shopping-id', match_type: 'regex', active: 1 }
            ];
            mockToArray.mockResolvedValue(rules);
            await engine.loadRules();

            const transactions: ParsedTransaction[] = [
                { description: 'AMZN Mktp', amount: 20, date: '2023-01-01', type: 'expense' } as unknown as ParsedTransaction,
                { description: 'AMZN Prime', amount: 20, date: '2023-01-01', type: 'expense' } as unknown as ParsedTransaction
            ];

            const matchCount = engine.applyRules(transactions);

            expect(matchCount).toBe(1);
            expect(transactions[0].category_id).toBe('shopping-id');
            expect(transactions[1].category_id).toBeUndefined();
        });

        it('should skip transactions already categorized', async () => {
            const rules = [
                { id: '1', match_string: 'Netflix', category_id: 'new-id', match_type: 'contains', active: 1 }
            ];
            mockToArray.mockResolvedValue(rules);
            await engine.loadRules();

            const transactions: ParsedTransaction[] = [
                { description: 'Netflix', amount: 10, date: '2023-01-01', category_id: 'existing-id', type: 'expense' } as unknown as ParsedTransaction
            ];

            const matchCount = engine.applyRules(transactions);

            expect(matchCount).toBe(0);
            expect(transactions[0].category_id).toBe('existing-id');
        });
    });

    describe('createRule', () => {
        it('should add a new rule to the database and local state', async () => {
            (db.import_rules.add as jest.Mock).mockResolvedValue('new-id');

            const newRule = await engine.createRule('Spotify', 'music-id', 'contains');

            expect(db.import_rules.add).toHaveBeenCalledWith(expect.objectContaining({
                user_id: userId,
                match_string: 'Spotify',
                category_id: 'music-id',
                match_type: 'contains',
                active: 1
            }));

            expect(newRule.match_string).toBe('Spotify');

            // Verify it updates local state by applying it immediately
            const transactions: ParsedTransaction[] = [
                { description: 'Spotify Premium', amount: 10, date: '2023-01-01' } as unknown as ParsedTransaction
            ];
            engine.applyRules(transactions);
            expect(transactions[0].category_id).toBe('music-id');
        });
    });
});
