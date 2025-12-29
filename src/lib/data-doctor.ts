import { db } from "./db";

export type IssueType = "orphan_category" | "zombie_recurring" | "future_transaction";

export interface DataIssue {
    id: string; // ID of the problematic item (transaction id, recurring id)
    type: IssueType;
    description: string;
    table: "transactions" | "recurring_transactions";
    item: unknown;
}

export interface HealthReport {
    issues: DataIssue[];
    timestamp: number;
}

export const DataDoctor = {
    /**
     * Run all checks and return a report
     */
    async checkup(): Promise<HealthReport> {
        const issues: DataIssue[] = [];

        // Load data needed for checks
        const transactions = await db.transactions.toArray();
        const recurring = await db.recurring_transactions.toArray();
        const categories = await db.categories.toArray();

        const categoryIds = new Set(categories.map(c => c.id));
        const now = new Date();

        // 1. Check for Orphaned Transactions (category_id references missing category)
        transactions.forEach(t => {
            if (!t.deleted_at && !categoryIds.has(t.category_id)) {
                issues.push({
                    id: t.id,
                    type: "orphan_category",
                    description: `Transaction "${t.description || 'Unknown'}" has a missing category (${t.category_id})`,
                    table: "transactions",
                    item: t
                });
            }
        });

        // 2. Check for Zombie Recurring Transactions (active but end_date passed)
        // Using string comparison for dates YYYY-MM-DD works
        const todayStr = now.toISOString().split('T')[0];

        recurring.forEach(r => {
            if (!r.deleted_at && r.active && r.end_date && r.end_date < todayStr) {
                issues.push({
                    id: r.id,
                    type: "zombie_recurring",
                    description: `Recurring transaction "${r.description}" is active but ended on ${r.end_date}`,
                    table: "recurring_transactions",
                    item: r
                });
            }
        });

        // 3. Check for Future Transactions (accidentally set far in future, e.g. > 1 year from now)
        // This is a heuristic check.
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        const limitDateStr = oneYearFromNow.toISOString().split('T')[0];

        transactions.forEach(t => {
            if (!t.deleted_at && t.date > limitDateStr) {
                issues.push({
                    id: t.id,
                    type: "future_transaction",
                    description: `Transaction "${t.description}" is dated far in the future (${t.date})`,
                    table: "transactions",
                    item: t
                });
            }
        });

        return {
            issues,
            timestamp: Date.now()
        };
    },

    /**
     * Fix a specific issue
     */
    async fixIssue(issue: DataIssue, fixType: "delete" | "archive" | "uncategorized"): Promise<void> {
        if (issue.table === "transactions") {
            if (issue.type === "orphan_category" && fixType === "uncategorized") {
                // Determine 'Uncategorized' ID or create/find a placeholder
                // For now, let's assume we want to ask user to select category, but this function implies auto-fix.
                // Simple fix: delete (soft delete).
                // Or if 'uncategorized', we need a fallback category ID.
                // Let's implement 'delete' only for now or strict fixes.
            }

            if (fixType === "delete") {
                await db.transactions.update(issue.id, { deleted_at: new Date().toISOString() });
            }
        }

        if (issue.table === "recurring_transactions") {
            if (issue.type === "zombie_recurring" && fixType === "archive") {
                // Set active = 0 (false)
                await db.recurring_transactions.update(issue.id, { active: 0 });
            }
        }
    }
};
