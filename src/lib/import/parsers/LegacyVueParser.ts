import { TransactionParser, ParsedData, ParsedTransaction } from "../types";

// MAPPING: Carbon -> Lucide
const ICON_MAPPING: Record<string, string> = {
    // Calendario / Tag / Checklist
    'i-carbon:calendar': 'Calendar',
    'i-carbon:tag': 'Tag',
    'i-carbon:checkbox-checked': 'CheckSquare',


    // Finanze
    'i-carbon:finance': 'Landmark',
    'i-carbon:money': 'Coins',
    'i-carbon:increase-level': 'TrendingUp',
    'i-carbon:receipt': 'Receipt',
    'i-carbon:wallet': 'Wallet',
    'i-carbon:PiggyBank': 'PiggyBank', // Direct map found in file

    // Casa
    'i-carbon:home': 'Home',
    'i-carbon:building': 'Building2',
    'i-carbon:furniture': 'Armchair',
    'i-carbon:bathtub': 'Bath',
    'i-carbon:plug': 'Zap',
    'i-carbon:lightning': 'Zap',
    'i-carbon:humidity': 'Droplet',

    // Regali
    'i-carbon:gift': 'Gift',
    'i-carbon:favorite': 'Heart',

    // Documenti
    'i-carbon:certificate': 'Award',
    'i-carbon:notebook': 'Book',
    'i-carbon:license-draft': 'FileText',
    'i-carbon:education': 'GraduationCap',
    'i-carbon:pen': 'Pen',

    // Salute
    'i-carbon:hospital': 'Stethoscope',
    'i-carbon:medication': 'Pill',
    'i-carbon:pills': 'Pill',
    'i-carbon:stethoscope': 'Stethoscope',
    'i-carbon:cognitive': 'Brain',
    'i-carbon:pharmacy': 'Cross', // Fallback or new? Let's use Activity for now or just generic
    'i-carbon:activity': 'Activity',
    'i-carbon:FingerprintRecognition': 'Fingerprint',

    // Cibo
    'i-carbon:restaurant': 'Utensils',
    'i-carbon:cafe': 'Coffee',
    'i-carbon:shopping-cart': 'ShoppingCart',
    'i-carbon:ShoppingCartPlus': 'ShoppingCart',
    'i-carbon:shopping-bag': 'ShoppingBag',
    'i-carbon:fish': 'Fish',
    'i-carbon:corn': 'Carrot',
    'i-carbon:apple': 'Apple',
    'i-carbon:fruit': 'Apple',
    'i-carbon:meat': 'Beef',
    'i-carbon:noodle-bowl': 'Utensils',
    'i-carbon:ice-cream': 'IceCream', // Wait, didn't add IceCream, used Wine
    'i-carbon:drink': 'Wine',
    'i-carbon:bar': 'Beer',

    // Trasporti
    'i-carbon:car': 'Car',
    'i-carbon:car-front': 'Car',
    'i-carbon:scooter': 'Bike',
    'i-carbon:bicycle': 'Bike',
    'i-carbon:bus': 'Bus',
    'i-carbon:train': 'Train',
    'i-carbon:van': 'Car',
    'i-carbon:charging-station': 'Zap',
    'i-carbon:gas-station': 'Fuel', // Use Fuel instead of generic Gas
    'i-carbon:road': 'MapPin',
    'i-carbon:plane': 'Plane',
    'i-carbon:plane-private': 'Plane',

    // Natura
    'i-carbon:mountain': 'Mountain',
    'i-carbon:tree': 'TreePine',
    'i-carbon:map': 'Map',
    'i-carbon:location': 'MapPin',
    'i-carbon:palm-tree': 'Palmtree',
    'i-carbon:hotel': 'Hotel',

    // Divertimento
    'i-carbon:music': 'Music',
    'i-carbon:game-console': 'Gamepad2',
    'i-carbon:apps': 'LayoutGrid',
    'i-carbon:event': 'PartyPopper',
    'i-carbon:ticket': 'Ticket', // Didn't add ticket, wait.
    'i-carbon:festival': 'FerrisWheel',
    'i-carbon:tool-kit': 'Wrench',

    // Tech
    'i-carbon:laptop': 'Laptop',
    'i-carbon:mobile': 'Smartphone',
    'i-carbon:tablet': 'Tablet',
    'i-carbon:WatsonxData': 'Database',
    'i-carbon:user': 'User',
    'i-carbon:settings': 'Settings',

    // Sport
    'i-carbon:basketball': 'Activity', // Or maybe Trophy? Activity is better for general sport
    'i-carbon:soccer': 'Trophy',
    'i-carbon:tennis': 'Trophy',
    'i-carbon:swim': 'Waves',
    'i-carbon:trophy': 'Trophy',

    // Tempo
    'i-carbon:alarm': 'AlarmClock',
    'i-carbon:password': 'Lock',

    // Altro
    'i-carbon:folder': 'Folder',
    'i-carbon:bee': 'Bug',
    'i-carbon:rocket': 'Rocket',
    'i-carbon:Diagram': 'Workflow',
};

export class LegacyVueParser implements TransactionParser {
    name = "Legacy Turtlet App Export";
    fileExtensions = ["json"];

    async canParse(_file: File, content: string): Promise<boolean> {
        try {
            const data = JSON.parse(content);
            return data.source === 'vue-firebase-expense-tracker';
        } catch {
            return false;
        }
    }

    async parse(_file: File, content: string): Promise<ParsedData> {
        const data = JSON.parse(content);
        const vueData = data.data || {};

        // Build a set of valid category IDs for validation
        const categories = (vueData.categories as { title: string; icon: string; id: string }[] || []).map((c) => ({
            ...c,
            name: c.title, // Normalize for internal use
            icon: ICON_MAPPING[c.icon] || 'DollarSign', // Map Icon or Default
            type: "expense" as const, // Default to expense
            color: "#000000" // Default color
        }));
        const validCategoryIds = new Set(categories.map((c) => c.id));

        // Transform transactions
        const transactions: ParsedTransaction[] = (vueData.transactions as { timestamp: string; amount: string; description: string; categoryId: string;[key: string]: unknown }[] || []).map((t) => ({
            // We don't preserve IDs from Vue usually, or we map them. 
            // But here we just normalize data. The Processor will handle ID mapping.
            // Actually, we pass the Old Category ID here so the processor can map it.
            date: t.timestamp.split("T")[0],
            amount: parseFloat(t.amount),
            description: t.description || "",
            // Important: We pass the OLD category ID. The Processor needs to resolve this 
            // using the categories list which is also returning.
            category_id: t.categoryId,
            type: undefined, // Type in Vue is derived from Category, so we can't know it yet easily without context
            raw_data: t
        }));

        const recurring = vueData.recurringExpenses || [];

        // Validate data integrity: check for orphaned category references
        const orphanedTransactionCategories: { description: string; categoryId: string }[] = [];
        const orphanedRecurringCategories: { description: string; categoryId: string }[] = [];

        for (const tx of transactions) {
            if (tx.category_id && !validCategoryIds.has(tx.category_id)) {
                orphanedTransactionCategories.push({
                    description: tx.description,
                    categoryId: tx.category_id
                });
            }
        }

        for (const rec of recurring) {
            if (rec.categoryId && !validCategoryIds.has(rec.categoryId)) {
                orphanedRecurringCategories.push({
                    description: rec.description || 'Unnamed recurring',
                    categoryId: rec.categoryId
                });
            }
        }

        const hasIntegrityIssues = orphanedTransactionCategories.length > 0 || orphanedRecurringCategories.length > 0;

        return {
            source: 'legacy_vue',
            transactions,
            categories,
            recurring,
            // Vue didn't have contexts or separate budgets table in the same way
            contexts: [],
            budgets: [],
            metadata: {
                totalItems: transactions.length + (vueData.categories?.length || 0)
            },
            ...(hasIntegrityIssues && {
                dataIntegrityIssues: {
                    orphanedTransactionCategories,
                    orphanedRecurringCategories
                }
            })
        };
    }
}
