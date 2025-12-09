import { db, ImportRule as DbRule } from '../db';
import { ParsedTransaction } from './types';
import { v4 as uuidv4 } from 'uuid';

export class RulesEngine {
    private userId: string;
    private rules: DbRule[] = [];

    constructor(userId: string) {
        this.userId = userId;
    }

    /**
     * Load active rules from local database.
     */
    async loadRules() {
        this.rules = await db.import_rules
            .where('user_id')
            .equals(this.userId)
            .filter(r => r.active === 1 && !r.deleted_at)
            .toArray();
    }

    /**
     * Apply loaded rules to a list of transactions.
     * Modifies the transactions in-place by setting category_id.
     * Returns the count of categorized transactions.
     */
    applyRules(transactions: ParsedTransaction[]): number {
        let matchCount = 0;

        for (const tx of transactions) {
            if (tx.category_id) continue; // Skip if already categorized

            // Simple priority: First match wins.
            // TODO: Add priority/ordering if needed.
            for (const rule of this.rules) {
                if (this.isMatch(tx.description, rule)) {
                    tx.category_id = rule.category_id;
                    matchCount++;
                    break;
                }
            }
        }
        return matchCount;
    }

    /**
     * Create a new rule and save to DB.
     */
    async createRule(matchString: string, categoryId: string, matchType: 'contains' | 'exact' | 'regex' = 'contains'): Promise<DbRule> {
        const newRule: DbRule = {
            id: uuidv4(),
            user_id: this.userId,
            match_string: matchString,
            match_type: matchType,
            category_id: categoryId,
            active: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            pendingSync: 1
        };

        await db.import_rules.add(newRule);
        this.rules.push(newRule); // Update local cache
        return newRule;
    }

    private isMatch(description: string, rule: DbRule): boolean {
        const desc = description.toLowerCase();
        const pattern = rule.match_string.toLowerCase();

        if (!desc) return false;

        switch (rule.match_type) {
            case 'exact':
                return desc === pattern;
            case 'contains':
                return desc.includes(pattern);
            case 'regex':
                try {
                    const re = new RegExp(rule.match_string, 'i');
                    return re.test(description);
                } catch (e) {
                    console.warn(`Invalid regex rule: ${rule.match_string}`, e);
                    return false;
                }
            default:
                return false;
        }
    }
}
