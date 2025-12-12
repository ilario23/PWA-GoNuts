import { db } from "../db";
import {
    ParsedData,
    PotentialMerge,
    RecurringConflict
} from "./types";
import { v4 as uuidv4 } from "uuid";
import { AVAILABLE_ICONS } from "../icons";
import { findBestMatch } from "../stringUtils";

// Helpers
const VALID_ICON_NAMES = new Set(AVAILABLE_ICONS.map(i => i.name));
const DEFAULT_FALLBACK_ICON = "DollarSign";

function validateIcon(iconName: string | undefined | null): string {
    if (!iconName || !VALID_ICON_NAMES.has(iconName)) {
        return DEFAULT_FALLBACK_ICON;
    }
    return iconName;
}

// Helper to normalize description for comparison
const normalizeString = (s: string | undefined | null): string => (s || "").toLowerCase().trim();

export type ImportProgressCallback = (current: number, total: number, status: string) => void;

export class ImportProcessor {
    private userId: string;
    private existingRecurring: any[] = []; // To be populated before conflict analysis

    constructor(userId: string) {
        this.userId = userId;
    }

    async process(data: ParsedData, onProgress?: ImportProgressCallback, mergedCategoryIds?: Map<string, string>, skippedRecurringIds?: Set<string>): Promise<{
        categories: number;
        transactions: number;
        recurring: number;
    }> {
        if (data.source === 'legacy_vue') {
            return this.processVueImport(data, onProgress, mergedCategoryIds, skippedRecurringIds);
        } else {
            return this.processStandardImport(data, onProgress, mergedCategoryIds, skippedRecurringIds);
        }
    }

    // --- CONFLICT ANALYSIS ---
    async analyzeCategoryConflicts(data: ParsedData): Promise<PotentialMerge[]> {
        if (!data.categories || data.categories.length === 0) return [];

        const conflicts: PotentialMerge[] = [];
        const existingCategories = await db.categories.where('user_id').equals(this.userId).toArray();
        const existingNames = existingCategories.map(c => c.name);
        const existingMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c]));

        console.log("Analyzing conflicts...", { importedCount: data.categories.length, existingCount: existingCategories.length });

        for (const importedCat of data.categories) {
            // Ensure we have a name to compare
            const importedName = importedCat.name || (importedCat as any).title;
            if (!importedName) continue;

            // Skip if exact match exists (logic already handles this as auto-merge)
            if (existingMap.has(importedName.toLowerCase())) {
                console.log(`Exact match found for '${importedName}'. Auto-merging.`);
                continue;
            }

            // Check for fuzzy match
            const bestMatch = findBestMatch(importedName, existingNames);

            if (bestMatch) {
                console.log(`Checking '${importedName}': Best match '${bestMatch.match}' (dist: ${bestMatch.distance})`);
            } else {
                console.log(`Checking '${importedName}': No close match found.`);
            }

            // Threshold: length <= 3 -> distance 0 (exact only, handled above)
            // length > 3 -> distance <= 1
            // length > 6 -> distance <= 2
            let threshold = 1;
            if (importedName.length > 6) threshold = 2;

            if (bestMatch && bestMatch.distance > 0 && bestMatch.distance <= threshold) {
                const existing = existingCategories.find(c => c.name === bestMatch.match);
                if (existing) {
                    conflicts.push({
                        imported: importedCat,
                        existing: existing,
                        score: bestMatch.distance
                    });
                }
            }
        }
        return conflicts;
    }

    async loadExistingRecurring() {
        this.existingRecurring = await db.recurring_transactions.where('user_id').equals(this.userId).toArray();
    }

    analyzeRecurringConflicts(data: ParsedData): RecurringConflict[] {
        if (!data.recurring || data.recurring.length === 0) return [];
        if (!this.existingRecurring || this.existingRecurring.length === 0) return [];

        const conflicts: RecurringConflict[] = [];

        for (const importedRec of data.recurring) {
            const impDesc = normalizeString(importedRec.description);
            const impAmount = parseFloat(importedRec.amount);

            // Check for potential duplicates
            // Logic: Same amount AND similar description
            const match = this.existingRecurring.find(ex => {
                const exDesc = normalizeString(ex.description);
                const exAmount = ex.amount;

                if (Math.abs(impAmount - exAmount) > 0.01) return false; // Amount mismatch

                // Exact description match
                if (impDesc === exDesc) return true;

                // Fuzzy description match
                const dist = findBestMatch(impDesc, [exDesc]);
                const maxLen = Math.max(impDesc.length, exDesc.length);
                // Allow ~20% difference or 2 chars
                const threshold = Math.max(2, Math.floor(maxLen * 0.2));

                return dist && dist.distance <= threshold;
            });

            if (match) {
                // Return as RecurringConflict structure
                conflicts.push({
                    imported: { ...importedRec, name: importedRec.description, id: importedRec.id || uuidv4() },
                    existing: { id: match.id, name: match.description, color: "#888888" }, // Mock color/name for compatibility with resolver UI
                    score: 0
                });
            }
        }
        return conflicts;
    }

    // --- STANDARD IMPORT STRATEGY ---
    private async processStandardImport(data: ParsedData, onProgress?: ImportProgressCallback, mergedCategoryIds?: Map<string, string>, skippedRecurringIds?: Set<string>) {
        let importedCategories = 0;
        let importedTransactions = 0;
        let importedRecurring = 0;

        // ... existing setup logic ...
        const categoryIdMap = new Map<string, string>();
        const contextIdMap = new Map<string, string>();

        // Pre-fill map with user validated merges
        if (mergedCategoryIds) {
            mergedCategoryIds.forEach((targetId, sourceId) => {
                categoryIdMap.set(sourceId, targetId);
            });
        }

        const totalSteps = (data.categories?.length || 0) + (data.contexts?.length || 0) + (data.transactions?.length || 0);
        let currentStep = 0;

        // 1. Contexts
        if (data.contexts) {
            for (const ctx of data.contexts) {
                onProgress?.(++currentStep, totalSteps, `Importing Context: ${ctx.name}`);
                // Try to find existing by name
                const existing = await db.contexts.where({ name: ctx.name, user_id: this.userId }).first();
                if (existing) {
                    if (ctx.id) contextIdMap.set(ctx.id, existing.id);
                } else {
                    const newId = uuidv4();
                    if (ctx.id) contextIdMap.set(ctx.id, newId);
                    await db.contexts.put({
                        id: newId,
                        user_id: this.userId,
                        name: ctx.name,
                        description: ctx.description,
                        active: 1,
                        deleted_at: null,
                        pendingSync: 1
                    });
                }
            }
        }

        // 2. Categories
        if (data.categories) {
            // Two pass for parents
            // Pass 1: IDs
            for (const cat of data.categories) {
                // If already mapped (via merge), skip ID generation
                if (categoryIdMap.has(cat.id)) continue;

                // Check exact match (Auto-merge)
                // Note: Dexie case-sensitivity depends on collation, usually strictly case sensitive by default, 
                // but we might want case-insensitive logic here too? 
                // For now, consistent with legacy logic: exact name match.
                // We do a manual case-insensitive check to be safe and consistent with "Normalizing" plan.
                const existing = await db.categories
                    .where('user_id').equals(this.userId)
                    .filter(c => c.name.toLowerCase() === cat.name.toLowerCase())
                    .first();

                if (existing) {
                    categoryIdMap.set(cat.id, existing.id);
                } else {
                    categoryIdMap.set(cat.id, uuidv4());
                }
            }
            // Pass 2: Insert
            for (const cat of data.categories) {
                onProgress?.(++currentStep, totalSteps, `Importing Category: ${cat.name}`);

                // If it was merged (either manually or auto-exact), we don't CREATE it.
                // But we check if it was "auto-merged" (exact match) vs "manual merge" (different ID but mapped).
                // Actually, if mapped, we just need to ensure we don't overwrite if it exists.

                const newId = categoryIdMap.get(cat.id);
                if (!newId) continue;

                const existing = await db.categories.get(newId);
                if (!existing) {
                    await db.categories.put({
                        id: newId,
                        user_id: this.userId,
                        name: cat.name,
                        icon: validateIcon(cat.icon),
                        color: cat.color,
                        type: cat.type,
                        parent_id: cat.parent_id ? categoryIdMap.get(cat.parent_id) : undefined,
                        active: cat.active !== undefined ? Number(cat.active) : 1,
                        deleted_at: null,
                        pendingSync: 1
                    });
                    importedCategories++;
                }
            }
        }

        // 3. Transactions
        for (const tx of data.transactions) {
            onProgress?.(++currentStep, totalSteps, 'Importing Transactions...');

            let finalCatId = tx.category_id ? categoryIdMap.get(tx.category_id) : undefined;
            if (!finalCatId) {
                finalCatId = await this.ensureFallbackCategory();
            }

            const finalCtxId = tx.context_id ? contextIdMap.get(tx.context_id) : undefined;

            // Normalize amount: always store as positive value
            // Type is determined by parser based on original sign
            const normalizedAmount = Math.abs(tx.amount);

            await db.transactions.put({
                id: uuidv4(),
                user_id: this.userId,
                category_id: finalCatId,
                context_id: finalCtxId,
                type: tx.type || 'expense',
                amount: normalizedAmount,
                date: tx.date,
                year_month: tx.date.substring(0, 7),
                description: tx.description,
                group_id: null,
                paid_by_member_id: null,
                deleted_at: null,
                pendingSync: 1
            });
            importedTransactions++;
        }

        // 4. Recurring (if any in standard backup)
        if (data.recurring) {
            for (const rec of data.recurring) {
                // SKIP Check
                // Assuming standard backup uses stable IDs
                if (rec.id && skippedRecurringIds?.has(rec.id)) {
                    continue;
                }

                const mappedId = rec.category_id ? categoryIdMap.get(rec.category_id) : undefined;
                const finalCatId = mappedId || await this.ensureFallbackCategory();
                const finalCtxId = rec.context_id ? contextIdMap.get(rec.context_id) : undefined;

                await db.recurring_transactions.put({
                    id: uuidv4(),
                    user_id: this.userId,
                    category_id: finalCatId,
                    context_id: finalCtxId,
                    type: rec.type,
                    amount: parseFloat(rec.amount),
                    description: rec.description,
                    frequency: rec.frequency,
                    start_date: rec.start_date,
                    end_date: rec.end_date,
                    active: rec.active ?? 1,
                    deleted_at: null,
                    pendingSync: 1
                });
                importedRecurring++;
            }
        }

        return { categories: importedCategories, transactions: importedTransactions, recurring: importedRecurring };
    }

    // --- VUE MIGRATION STRATEGY ---
    private async processVueImport(data: ParsedData, onProgress?: ImportProgressCallback, mergedCategoryIds?: Map<string, string>, skippedRecurringIds?: Set<string>) {
        // Logic extracted from Settings.tsx
        const ROOT_CATEGORY_TYPES: Record<string, "expense" | "income" | "investment"> = {
            "533d4482-df54-47e5-b8d8-000000000001": "expense",
            "533d4482-df54-47e5-b8d8-000000000002": "income",
            "533d4482-df54-47e5-b8d8-000000000003": "investment"
        };
        const ROOT_IDS = new Set(Object.keys(ROOT_CATEGORY_TYPES));

        const totalSteps = (data.categories?.length || 0) + data.transactions.length + (data.recurring?.length || 0);
        let currentStep = 0;

        let importedCategories = 0;
        let importedTransactions = 0;
        let importedRecurring = 0;

        const categoryIdMap = new Map<string, string>();
        const vueCategoriesMap = new Map<string, any>();

        // Pre-fill map with user validated merges
        if (mergedCategoryIds) {
            mergedCategoryIds.forEach((targetId, sourceId) => {
                categoryIdMap.set(sourceId, targetId);
            });
        }

        // Index
        for (const c of (data.categories || [])) {
            vueCategoriesMap.set(c.id, c);
        }

        const resolveCategoryType = (catId: string): "expense" | "income" | "investment" => {
            let currentId: string | undefined = catId;
            let depth = 0;
            while (currentId && depth < 10) {
                if (ROOT_CATEGORY_TYPES[currentId]) return ROOT_CATEGORY_TYPES[currentId];
                const cat = vueCategoriesMap.get(currentId);
                if (!cat) break;
                currentId = cat.parentCategoryId;
                depth++;
            }
            return "expense";
        };

        // Categories
        for (const vueCat of (data.categories || [])) {
            onProgress?.(++currentStep, totalSteps, `Migrating Category: ${vueCat.title}`);

            if (ROOT_IDS.has(vueCat.id)) continue;

            // If already mapped (via merge), skip creation but we might need it in map for children resolution?
            // Actually, if it's merged, we already have the target ID in categoryIdMap.
            if (categoryIdMap.has(vueCat.id)) continue;

            // Check exact match (Auto-merge) - standard safety check
            const existing = await db.categories
                .where('user_id').equals(this.userId)
                .filter(c => c.name.toLowerCase() === vueCat.title.toLowerCase())
                .first();

            if (existing) {
                categoryIdMap.set(vueCat.id, existing.id);
                continue;
            }

            const type = resolveCategoryType(vueCat.id);
            const newId = uuidv4();
            categoryIdMap.set(vueCat.id, newId);

            let newParentId: string | undefined = undefined;
            if (vueCat.parentCategoryId && !ROOT_IDS.has(vueCat.parentCategoryId)) {
                newParentId = categoryIdMap.get(vueCat.parentCategoryId);
            }

            await db.categories.put({
                id: newId,
                user_id: this.userId,
                name: vueCat.title,
                icon: validateIcon(vueCat.icon),
                color: vueCat.color || "#6366f1",
                type: type,
                parent_id: newParentId,
                active: vueCat.active ? 1 : 0,
                deleted_at: null,
                pendingSync: 1
            });
            importedCategories++;

            // Budget
            if (vueCat.budget && vueCat.budget > 0) {
                await db.category_budgets.put({
                    id: uuidv4(),
                    user_id: this.userId,
                    category_id: newId,
                    amount: vueCat.budget,
                    period: "monthly",
                    deleted_at: null,
                    pendingSync: 1,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }
        }

        // Transactions
        for (const tx of data.transactions) {
            onProgress?.(++currentStep, totalSteps, 'Migrating Transactions...');

            let finalCatId = "";
            let type: "expense" | "income" | "investment" = "expense";

            if (tx.category_id) {
                const mappedId = categoryIdMap.get(tx.category_id);
                if (mappedId) {
                    finalCatId = mappedId;
                    const cat = await db.categories.get(mappedId);
                    if (cat) type = cat.type;
                } else {
                    finalCatId = await this.ensureFallbackCategory();
                }
            } else {
                finalCatId = await this.ensureFallbackCategory();
            }

            // Normalize amount: always store as positive value
            const normalizedAmount = Math.abs(tx.amount);

            await db.transactions.put({
                id: uuidv4(),
                user_id: this.userId,
                category_id: finalCatId,
                type: type,
                amount: normalizedAmount,
                date: tx.date,
                year_month: tx.date.substring(0, 7),
                description: tx.description,
                group_id: null,
                paid_by_member_id: null,
                deleted_at: null,
                pendingSync: 1
            });
            importedTransactions++;
        }

        // Recurring
        if (data.recurring) {
            for (const vueRec of data.recurring) {
                if (vueRec.id && skippedRecurringIds?.has(vueRec.id)) {
                    continue;
                }

                onProgress?.(++currentStep, totalSteps, 'Migrating Recurring...');

                let frequency: "daily" | "weekly" | "monthly" | "yearly" = "monthly";
                if (vueRec.frequency === "WEEKLY") frequency = "weekly";
                if (vueRec.frequency === "YEARLY") frequency = "yearly";

                let finalCatId = "";
                let type: "expense" | "income" | "investment" = "expense";

                if (vueRec.categoryId) {
                    const mappedId = categoryIdMap.get(vueRec.categoryId);
                    if (mappedId) {
                        finalCatId = mappedId;
                        const cat = await db.categories.get(mappedId);
                        if (cat) type = cat.type;
                    } else {
                        finalCatId = await this.ensureFallbackCategory();
                    }
                } else {
                    finalCatId = await this.ensureFallbackCategory();
                }

                await db.recurring_transactions.put({
                    id: uuidv4(),
                    user_id: this.userId,
                    category_id: finalCatId,
                    type: type,
                    amount: parseFloat(vueRec.amount),
                    description: vueRec.description || "",
                    frequency: frequency,
                    start_date: (vueRec.nextOccurrence || vueRec.startDate).split("T")[0],
                    active: vueRec.isActive ? 1 : 0,
                    deleted_at: null,
                    pendingSync: 1
                });
                importedRecurring++;
            }
        }

        return { categories: importedCategories, transactions: importedTransactions, recurring: importedRecurring };
    }

    // --- HELPERS ---
    /**
     * Creates or retrieves the local-only "Uncategorized" category.
     * 
     * This category:
     * - Uses a reserved UUID (UNCATEGORIZED_CATEGORY.ID)
     * - Has pendingSync: 0 (never syncs to Supabase)
     * - Transactions referencing it will fail FK constraint on sync
     * - This forces users to categorize properly before syncing
     */
    private async ensureFallbackCategory(): Promise<string> {
        const { UNCATEGORIZED_CATEGORY } = await import('../constants');

        // Check if already exists (by reserved ID, not name)
        const existing = await db.categories.get(UNCATEGORIZED_CATEGORY.ID);
        if (existing) return existing.id;

        // Create local-only category
        await db.categories.put({
            id: UNCATEGORIZED_CATEGORY.ID,
            user_id: this.userId,
            name: UNCATEGORIZED_CATEGORY.NAME,
            icon: UNCATEGORIZED_CATEGORY.ICON,
            color: UNCATEGORIZED_CATEGORY.COLOR,
            type: "expense",
            active: 1,
            deleted_at: null,
            pendingSync: 0  // NEVER sync - local only
        });
        return UNCATEGORIZED_CATEGORY.ID;
    }
}
