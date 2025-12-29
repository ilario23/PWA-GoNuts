import { db, Category, Context, Transaction, RecurringTransaction, CategoryBudget } from "../db";
import {
    ParsedData,
    PotentialMerge,
    RecurringConflict
} from "./types";
import { v4 as uuidv4 } from "uuid";
import { AVAILABLE_ICONS } from "../icons";
import { findBestMatch } from "../stringUtils";
import { UNCATEGORIZED_CATEGORY } from "../constants";
import { generateSemanticColor } from "./colorUtils";

// Types
export interface ImportOptions {
    regenerateColors?: boolean;
}

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
    private existingRecurring: RecurringTransaction[] = []; // To be populated before conflict analysis

    constructor(userId: string) {
        this.userId = userId;
    }

    async process(data: ParsedData, onProgress?: ImportProgressCallback, mergedCategoryIds?: Map<string, string>, skippedRecurringIds?: Set<string>, options?: ImportOptions): Promise<{
        categories: number;
        transactions: number;
        recurring: number;
        orphanCount: number;
        skippedCount?: number;
    }> {
        if (data.source === 'legacy_vue') {
            return this.processVueImport(data, onProgress, mergedCategoryIds, skippedRecurringIds, options);
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
            const importedName = importedCat.name || importedCat.title;
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
            const match = this.existingRecurring.find((ex) => {
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
                    existing: { id: match.id, description: match.description, amount: match.amount },
                    score: 0
                });
            }
        }
        return conflicts;
    }

    analyzeGroupData(data: ParsedData): { hasGroups: boolean; groupTransactionCount: number } {
        let groupTransactionCount = 0;
        if (data.transactions) {
            groupTransactionCount = data.transactions.filter(t => {
                // Check raw_data for common group fields from various sources (though mainly GoNuts/Turtlet)
                const raw = t.raw_data as { groupId?: string; group_id?: string } || {};
                return !!(raw.group_id || raw.groupId);
            }).length;
        }
        return {
            hasGroups: groupTransactionCount > 0,
            groupTransactionCount
        };
    }

    // --- STANDARD IMPORT STRATEGY ---
    private async processStandardImport(data: ParsedData, onProgress?: ImportProgressCallback, mergedCategoryIds?: Map<string, string>, skippedRecurringIds?: Set<string>) {
        let importedCategories = 0;
        let importedTransactions = 0;
        let importedRecurring = 0;
        let orphanCount = 0;

        const categoryIdMap = new Map<string, string>();
        const contextIdMap = new Map<string, string>();

        // Pre-fill map with user validated merges
        if (mergedCategoryIds) {
            mergedCategoryIds.forEach((targetId, sourceId) => {
                categoryIdMap.set(sourceId, targetId);
            });
        }

        const totalSteps = (data.categories?.length || 0) + (data.contexts?.length || 0) + (data.transactions?.length || 0) + (data.recurring?.length || 0) + (data.budgets?.length || 0);
        let currentStep = 0;

        // Optimization: Fetch all execution data upfront to avoid N+1 queries
        // CONTEXTS LOOKUP
        const existingContexts = await db.contexts.where('user_id').equals(this.userId).toArray();
        const existingContextsMap = new Map(existingContexts.map(c => [c.name, c.id]));

        const contextsToInsert: Context[] = [];

        // 1. Contexts
        if (data.contexts) {
            onProgress?.(currentStep, totalSteps, 'Processing Contexts...');
            for (const ctx of data.contexts) {
                currentStep++;
                const existingId = existingContextsMap.get(ctx.name);
                if (existingId) {
                    if (ctx.id) contextIdMap.set(ctx.id, existingId);
                } else {
                    const newId = uuidv4();
                    if (ctx.id) contextIdMap.set(ctx.id, newId);

                    // Add to insert queue
                    contextsToInsert.push({
                        id: newId,
                        user_id: this.userId,
                        name: ctx.name,
                        description: ctx.description,
                        active: 1,
                        deleted_at: null,
                        pendingSync: 1
                    });

                    // Update map so subsequent duplicates in this import are caught
                    existingContextsMap.set(ctx.name, newId);
                }
            }
        }

        // CATEGORIES LOOKUP
        const existingCategories = await db.categories.where('user_id').equals(this.userId).toArray();
        // Map Name -> ID (lowercase for case insensitive matching)
        const existingCategoriesMap = new Map(existingCategories.filter(c => !c.deleted_at).map(c => [c.name.toLowerCase(), c.id]));
        const categoriesToInsert: Category[] = [];

        // 2. Categories
        if (data.categories) {
            onProgress?.(currentStep, totalSteps, 'Processing Categories...');

            // Pass 1: Resolve IDs
            for (const cat of data.categories) {
                if (categoryIdMap.has(cat.id)) continue; // Already mapped (from merge)

                const existingId = existingCategoriesMap.get(cat.name.toLowerCase());
                if (existingId) {
                    categoryIdMap.set(cat.id, existingId);
                } else {
                    // New category
                    categoryIdMap.set(cat.id, uuidv4());
                }
            }

            // Pass 2: Prepare Inserts
            for (const cat of data.categories) {
                currentStep++;

                const finalId = categoryIdMap.get(cat.id);
                if (!finalId) continue;

                // If this ID exists in our existing DB map, we skip insert (it's a merge/duplicate)
                // However, we need to check if we just generated this ID in Pass 1 (which means it's new)
                // Or if it was mapped to an EXISTING ID.
                const isExisting = Array.from(existingCategoriesMap.values()).includes(finalId);

                // Also check if we already queued it for insert (duplicates within import file)
                const isQueued = categoriesToInsert.some(c => c.id === finalId);

                if (!isExisting && !isQueued) {
                    categoriesToInsert.push({
                        id: finalId,
                        user_id: this.userId,
                        name: cat.name,
                        icon: validateIcon(cat.icon),
                        color: cat.color,
                        type: cat.type,
                        parent_id: cat.parent_id ? categoryIdMap.get(cat.parent_id) : undefined,
                        active: (cat.active !== undefined ? Number(cat.active) : 1),
                        deleted_at: null,
                        pendingSync: 1
                    });
                    importedCategories++;
                }
            }
        }

        const transactionsToInsert: Transaction[] = [];

        // 3. Transactions
        if (data.transactions) {
            onProgress?.(currentStep, totalSteps, 'Processing Transactions...');

            // Batch processing for transactions
            // We can just iterate and prepare them
            for (const tx of data.transactions) {
                currentStep++;
                // Update UI every 50 transactions to not spam
                if (currentStep % 50 === 0) onProgress?.(currentStep, totalSteps, 'Importing Transactions...');

                if (tx.category_id === 'SKIP') {
                    continue;
                }

                let finalCatId = tx.category_id ? categoryIdMap.get(tx.category_id) : undefined;
                if (!finalCatId) {
                    // Check if the id is ALREADY a valid category ID (manual categorization)
                    const isManualId = Array.from(existingCategoriesMap.values()).includes(tx.category_id || "");
                    if (isManualId) {
                        finalCatId = tx.category_id;
                    } else if (tx.category_id && tx.category_id !== "UNCATEGORIZED") {
                        // It has an ID but we don't know it? Maybe it's a new one not in map?
                        // Should not happen if logic is correct, but default to uncategorized if fails
                        finalCatId = UNCATEGORIZED_CATEGORY.ID;
                        orphanCount++;
                    } else {
                        finalCatId = UNCATEGORIZED_CATEGORY.ID;
                        orphanCount++;
                    }
                }

                const finalCtxId = tx.context_id ? contextIdMap.get(tx.context_id!) : undefined;

                // Normalize amount: always store as positive value
                const normalizedAmount = Math.abs(tx.amount);
                let finalAmount = normalizedAmount;

                if (tx.group_id && data.groups && data.group_members) {
                    const groupMembers = (data.group_members || []).filter((m) => m.group_id === tx.group_id);
                    const myMemberRecord = groupMembers.find((m) => m.user_id === tx.user_id);

                    if (myMemberRecord && typeof myMemberRecord.share === 'number') {
                        const sharePercentage = myMemberRecord.share;
                        const newAmount = finalAmount * (sharePercentage / 100);
                        finalAmount = Number(newAmount.toFixed(2));
                    }
                }

                transactionsToInsert.push({
                    id: uuidv4(),
                    user_id: this.userId,
                    category_id: finalCatId!,
                    context_id: finalCtxId,
                    type: tx.type || 'expense',
                    amount: finalAmount,
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
        }

        const recurringToInsert: RecurringTransaction[] = [];

        // 4. Recurring
        if (data.recurring) {
            onProgress?.(currentStep, totalSteps, 'Processing Recurring...');
            for (const rec of data.recurring) {
                currentStep++;
                if (skippedRecurringIds?.has(rec.id!)) continue;

                const mappedId = rec.category_id ? categoryIdMap.get(rec.category_id) : undefined;
                let finalCatId = mappedId;
                if (!finalCatId) {
                    finalCatId = UNCATEGORIZED_CATEGORY.ID;
                }
                const finalCtxId = rec.context_id ? contextIdMap.get(rec.context_id) : undefined;

                recurringToInsert.push({
                    id: uuidv4(),
                    user_id: this.userId,
                    category_id: finalCatId,
                    context_id: finalCtxId,
                    type: rec.type,
                    amount: parseFloat(rec.amount),
                    description: rec.description,
                    frequency: rec.frequency as "monthly" | "weekly" | "yearly",
                    start_date: rec.start_date,
                    end_date: rec.end_date,
                    active: (rec.active !== undefined ? Number(rec.active) : 1),
                    deleted_at: null,
                    pendingSync: 1
                });
                importedRecurring++;
            }
        }

        const budgetsToInsert: CategoryBudget[] = [];

        // 5. Category Budgets
        if (data.budgets) {
            onProgress?.(currentStep, totalSteps, 'Processing Budgets...');

            // Check existing budgets first to avoid duplicates
            // We need to fetch all budgets for this user
            const existingBudgets = await db.category_budgets.where('user_id').equals(this.userId).toArray();
            // Map key: category_id + period
            const existingBudgetsSet = new Set(existingBudgets.map(b => `${b.category_id}_${b.period}`));

            for (const budget of data.budgets) {
                currentStep++;
                const mappedCatId = categoryIdMap.get(budget.category_id);
                if (mappedCatId) {
                    // Check if category exists (it should, if it was in categories list or existing map)
                    // If we are creating it now, it's valid. If it's existing, it's valid.
                    // But if uncategorized?

                    const budgetKey = `${mappedCatId}_${budget.period}`;
                    if (!existingBudgetsSet.has(budgetKey)) {
                        budgetsToInsert.push({
                            id: uuidv4(),
                            user_id: this.userId,
                            category_id: mappedCatId,
                            amount: Number(budget.amount),
                            period: budget.period,
                            deleted_at: null,
                            pendingSync: 1,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });
                        // Add to set to prevent duplicates within same file
                        existingBudgetsSet.add(budgetKey);
                    }
                }
            }
        }

        // EXECUTE BULK INSERTS
        onProgress?.(totalSteps, totalSteps, 'Saving to database...');

        await db.transaction('rw', [db.contexts, db.categories, db.transactions, db.recurring_transactions, db.category_budgets], async () => {
            if (contextsToInsert.length) await db.contexts.bulkPut(contextsToInsert);
            if (categoriesToInsert.length) await db.categories.bulkPut(categoriesToInsert);
            if (transactionsToInsert.length) await db.transactions.bulkPut(transactionsToInsert);
            if (recurringToInsert.length) await db.recurring_transactions.bulkPut(recurringToInsert);
            if (budgetsToInsert.length) await db.category_budgets.bulkPut(budgetsToInsert);
        });

        return { categories: importedCategories, transactions: importedTransactions, recurring: importedRecurring, orphanCount, skippedCount: (data.transactions?.length || 0) - importedTransactions };
    }

    // --- VUE MIGRATION STRATEGY ---
    private async processVueImport(data: ParsedData, onProgress?: ImportProgressCallback, mergedCategoryIds?: Map<string, string>, skippedRecurringIds?: Set<string>, options?: ImportOptions) {
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
        let orphanCount = 0;

        const categoryIdMap = new Map<string, string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vueCategoriesMap = new Map<string, any>();

        // Pre-fill map with user validated merges
        if (mergedCategoryIds) {
            mergedCategoryIds.forEach((targetId, sourceId) => {
                categoryIdMap.set(sourceId, targetId);
            });
        }

        // Index input categories
        for (const c of (data.categories || [])) {
            vueCategoriesMap.set(c.id, c);
        }

        const resolveCategoryType = (catId: string): "expense" | "income" | "investment" => {
            let currentId: string | undefined = catId;
            let depth = 0;
            while (currentId && depth < 10) {
                if (ROOT_CATEGORY_TYPES[currentId]) {
                    return ROOT_CATEGORY_TYPES[currentId];
                }
                const cat = vueCategoriesMap.get(currentId);
                if (!cat) break;
                currentId = cat.parentCategoryId || cat.parentId || cat.parent_id;
                depth++;
            }
            return "expense";
        };

        const categoriesToInsert: Category[] = [];
        const budgetsToInsert: CategoryBudget[] = [];

        // Load existing categories for dedupe
        const existingCategories = await db.categories.where('user_id').equals(this.userId).toArray();
        const existingCategoriesMap = new Map(existingCategories.filter(c => !c.deleted_at).map(c => [c.name.toLowerCase(), c.id]));
        // Keep track of IDs we decide to insert, to avoid re-inserting same ID
        const finalCategoryIdsSet = new Set<string>();

        // Color generation counters (per type) for semantic colors
        const colorCounters: Record<"expense" | "income" | "investment", number> = {
            expense: 0,
            income: 0,
            investment: 0
        };

        // Categories
        if (data.categories) {
            onProgress?.(currentStep, totalSteps, 'Processing Categories...');
            for (const vueCat of data.categories) {
                currentStep++;

                if (ROOT_IDS.has(vueCat.id)) continue;
                if (categoryIdMap.has(vueCat.id)) continue; // Already mapped (via merge)

                // Check exact match (Auto-merge)
                const existingId = existingCategoriesMap.get((vueCat.title || "").toLowerCase());
                if (existingId) {
                    categoryIdMap.set(vueCat.id, existingId);
                    // DEBUG: Uncomment to trace auto-merge
                    // console.log(`[DEBUG Vue Import] FIRST PASS - AUTO-MERGE: "${vueCat.title}"`, { originalId: vueCat.id, mappedToExistingId: existingId });
                    continue;
                }


                // Use imported ID if valid UUID, else generate new
                // Vue IDs were UUIDs, so we try to reuse them if they don't collision?
                // Actually safer to generate new IDs to avoid conflicts with existing DB, but
                // if we want to preserve relationships within the import file, we use a map.
                const newId = uuidv4();
                categoryIdMap.set(vueCat.id, newId);

                // DEBUG: Log new ID assignment
                // if (vueCat.title?.toLowerCase().includes('carburante') || vueCat.title?.toLowerCase().includes('trasporto')) {
                //     console.log(`[DEBUG Vue Import] FIRST PASS - NEW ID: "${vueCat.title}"`, {
                //         originalId: vueCat.id,
                //         newId,
                //         parentCategoryId: vueCat.parentCategoryId,
                //     });
                // }

                // Parent resolution - deferred to later or resolved now if order permits?
                // Since we iterate randomly, parent might not be in map yet.
                // Vue import logic is simple, maybe we can resolve parents in a second pass?
                // For bulk, let's just queue them. parent_id will be mapped later.
            }

            // Second pass for content construction now that ID map is full
            for (const vueCat of data.categories) {
                if (ROOT_IDS.has(vueCat.id)) continue;
                // If it was mapped to an EXISTING ID, we skip insert
                const mappedId = categoryIdMap.get(vueCat.id);
                if (!mappedId) continue;

                // Check if mappedId corresponds to an existing DB category
                const isExisting = Array.from(existingCategoriesMap.values()).includes(mappedId);
                if (isExisting) continue;

                if (finalCategoryIdsSet.has(mappedId)) continue; // Already processed

                let newParentId: string | undefined = undefined;
                const parentId = vueCat.parentCategoryId || vueCat.parentId || vueCat.parent_id;
                if (parentId && !ROOT_IDS.has(parentId)) {
                    newParentId = categoryIdMap.get(parentId);
                }

                // Determine color: use semantic generation if enabled, otherwise original
                const categoryType = resolveCategoryType(vueCat.id);
                let categoryColor = vueCat.color || "#6366f1";
                if (options?.regenerateColors) {
                    categoryColor = generateSemanticColor(categoryType, colorCounters[categoryType]);
                    colorCounters[categoryType]++;
                }

                categoriesToInsert.push({
                    id: mappedId,
                    user_id: this.userId,
                    name: vueCat.title!, // Cast as string because we filtered undefined above/in title check
                    icon: validateIcon(vueCat.icon),
                    color: categoryColor,
                    type: categoryType,
                    parent_id: newParentId,
                    active: vueCat.active ? 1 : 0,
                    deleted_at: null,
                    pendingSync: 1
                });

                // DEBUG: Log parent resolution for testing
                // if (vueCat.title?.toLowerCase().includes('carburante') || vueCat.title?.toLowerCase().includes('trasporto')) {
                //     console.log(`[DEBUG Vue Import] Category: "${vueCat.title}"`, {
                //         originalId: vueCat.id,
                //         mappedId,
                //         originalParentId: parentId,
                //         newParentId,
                //         parentInMap: parentId ? categoryIdMap.has(parentId) : false,
                //     });
                // }

                finalCategoryIdsSet.add(mappedId);
                importedCategories++;

                // Budget
                if (vueCat.budget && vueCat.budget > 0) {
                    budgetsToInsert.push({
                        id: uuidv4(),
                        user_id: this.userId,
                        category_id: mappedId,
                        amount: vueCat.budget,
                        period: "monthly",
                        deleted_at: null,
                        pendingSync: 1,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
            }
        }

        const transactionsToInsert: Transaction[] = [];

        // Transactions
        if (data.transactions) {
            onProgress?.(currentStep, totalSteps, 'Processing Transactions...');
            for (const tx of data.transactions) {
                currentStep++;
                if (currentStep % 50 === 0) onProgress?.(currentStep, totalSteps, 'Importing Transactions...');

                let finalCatId = tx.category_id ? categoryIdMap.get(tx.category_id) : undefined;
                if (!finalCatId) {
                    finalCatId = UNCATEGORIZED_CATEGORY.ID;
                    orphanCount++;
                }

                // Normalize amount
                const normalizedAmount = Math.abs(tx.amount);
                let finalAmount = normalizedAmount;

                if (tx.group_id && data.groups && data.group_members) {
                    const groupMembers = data.group_members.filter((m) => m.group_id === tx.group_id);
                    const myMemberRecord = groupMembers.find((m) => m.user_id === tx.user_id);

                    if (myMemberRecord && typeof myMemberRecord.share === 'number') {
                        const sharePercentage = myMemberRecord.share;
                        const newAmount = finalAmount * (sharePercentage / 100);
                        finalAmount = Number(newAmount.toFixed(2));
                    }
                }

                const type = tx.type || resolveCategoryType(tx.category_id || "");

                transactionsToInsert.push({
                    id: uuidv4(),
                    user_id: this.userId,
                    category_id: finalCatId,
                    context_id: undefined,
                    type: type,
                    amount: finalAmount, // Vue legacy amount
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
        }

        const recurringToInsert: RecurringTransaction[] = [];

        // Recurring
        if (data.recurring) {
            onProgress?.(currentStep, totalSteps, 'Processing Recurring...');
            for (const vueRec of data.recurring) {
                currentStep++;
                if (vueRec.id && skippedRecurringIds?.has(vueRec.id)) continue;

                let frequency: "daily" | "weekly" | "monthly" | "yearly" = "monthly";
                if (vueRec.frequency === "WEEKLY") frequency = "weekly";
                if (vueRec.frequency === "YEARLY") frequency = "yearly";

                let finalCatId = "";
                let type: "expense" | "income" | "investment" = "expense";

                if (vueRec.categoryId) {
                    type = resolveCategoryType(vueRec.categoryId);
                    const mappedId = categoryIdMap.get(vueRec.categoryId);
                    finalCatId = mappedId || UNCATEGORIZED_CATEGORY.ID;
                } else {
                    finalCatId = UNCATEGORIZED_CATEGORY.ID;
                }

                recurringToInsert.push({
                    id: uuidv4(),
                    user_id: this.userId,
                    category_id: finalCatId,
                    type: type,
                    amount: parseFloat(vueRec.amount),
                    description: vueRec.description || "",
                    frequency: frequency as "monthly" | "weekly" | "yearly",
                    start_date: (vueRec.nextOccurrence || vueRec.startDate || "").split("T")[0],
                    active: vueRec.isActive ? 1 : 0,
                    deleted_at: null,
                    pendingSync: 1
                });
                importedRecurring++;
            }
        }

        // EXECUTE BULK INSERTS
        onProgress?.(totalSteps, totalSteps, 'Saving to database...');

        await db.transaction('rw', [db.categories, db.transactions, db.recurring_transactions, db.category_budgets], async () => {
            if (categoriesToInsert.length) await db.categories.bulkPut(categoriesToInsert);
            if (transactionsToInsert.length) await db.transactions.bulkPut(transactionsToInsert);
            if (recurringToInsert.length) await db.recurring_transactions.bulkPut(recurringToInsert);
            if (budgetsToInsert.length) await db.category_budgets.bulkPut(budgetsToInsert);
        });

        return { categories: importedCategories, transactions: importedTransactions, recurring: importedRecurring, orphanCount };
    }
}
