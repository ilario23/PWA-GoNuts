import { TransactionParser, ParsedData, ParsedTransaction } from "../types";

export class AntigravityBackupParser implements TransactionParser {
    name = "GoNuts Backup";
    fileExtensions = ["json"];

    async canParse(_file: File, content: string): Promise<boolean> {
        try {
            const data = JSON.parse(content);
            // Check for signature fields of our backup
            return (
                data.source !== 'vue-firebase-expense-tracker' && // Explicitly exclude Vue
                (!!data.transactions || !!data.categories || !!data.contexts)
            );
        } catch {
            return false;
        }
    }

    async parse(_file: File, content: string): Promise<ParsedData> {
        const data = JSON.parse(content);

        // Transform transactions to normalized format
        const transactions: ParsedTransaction[] = (data.transactions || []).map((t: any) => ({
            id: t.id,
            date: t.date,
            amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount,
            description: t.description,
            category_id: t.category_id,
            context_id: t.context_id,
            type: t.type,
            raw_data: t
        }));

        // Pass through other entities "as is" for the wizard to handle
        // The wizard (Processor) will handle the persistence logic
        return {
            source: 'antigravity_backup',
            transactions,
            categories: data.categories || [],
            contexts: data.contexts || [],
            recurring: data.recurring_transactions || [],
            budgets: data.category_budgets || [],
            metadata: {
                totalItems: transactions.length + (data.categories?.length || 0)
            }
        };
    }
}
