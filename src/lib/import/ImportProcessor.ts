import { db } from "@/lib/db";
import { ParsedData, PotentialMerge } from "./types";
import { v4 as uuidv4 } from "uuid";
import { AVAILABLE_ICONS } from "@/lib/icons";
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

export type ImportProgressCallback = (current: number, total: number, status: string) => void;

export class ImportProcessor {
    private userId: string;

    constructor(userId: string) {
        this.userId = userId;
    }

    async process(data: ParsedData, onProgress?: ImportProgressCallback, mergedCategoryIds?: Map<string, string>): Promise<{
        categories: number;
        transactions: number;
        recurring: number;
    }> {
        if (data.source === 'legacy_vue') {
            return this.processVueImport(data, onProgress);
        } else {
            return this.processStandardImport(data, onProgress, mergedCategoryIds);
        }
    }

    // --- CONFLICT ANALYSIS ---
    async analyzeCategoryConflicts(data: ParsedData): Promise<PotentialMerge[]> {
        if (!data.categories || data.categories.length === 0) return [];

        const conflicts: PotentialMerge[] = [];
        const existingCategories = await db.categories.where('user_id').equals(this.userId).toArray();
        const existingNames = existingCategories.map(c => c.name);
        const existingMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c]));

        for (const importedCat of data.categories) {
            // Skip if exact match exists (logic already handles this as auto-merge)
            if (existingMap.has(importedCat.name.toLowerCase())) {
                continue;
            }

            // Check for fuzzy match
            const bestMatch = findBestMatch(importedCat.name, existingNames);

            // Threshold: length <= 3 -> distance 0 (exact only, handled above)
            // length > 3 -> distance <= 1
            // length > 6 -> distance <= 2
            let threshold = 1;
            if (importedCat.name.length > 6) threshold = 2;

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

    // --- STANDARD IMPORT STRATEGY ---
    private async processStandardImport(data: ParsedData, onProgress?: ImportProgressCallback, mergedCategoryIds?: Map<string, string>) {
        let importedCategories = 0;
        let importedTransactions = 0;
        let importedRecurring = 0;

        // We Map IDs to ensure valid references if we generate new ones
        // For standard backups, we might trust IDs if they match UUID format, 
        // but strict safety suggests checking collisions or using map.
        // For now, let's assume standard backup restores IDs if possible, or generates new if collision.
        // Actually, if we import on top of existing data, we should probably generate NEW IDs to avoid conflicts.
        // Let's stick to "Merge/New" approach.

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
                        active: 1,
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
    private async processVueImport(data: ParsedData, onProgress?: ImportProgressCallback) {
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

            const type = resolveCategoryType(vueCat.id);
            const newId = uuidv4();
            if (vueCat.id) categoryIdMap.set(vueCat.id, newId);

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
    private async ensureFallbackCategory(): Promise<string> {
        const existing = await db.categories.where('name').equalsIgnoreCase('Uncategorized').first();
        if (existing) return existing.id;

        const newId = uuidv4();
        await db.categories.put({
            id: newId,
            user_id: this.userId,
            name: "Uncategorized",
            icon: "HelpCircle",
            color: "#94a3b8",
            type: "expense",
            active: 1,
            deleted_at: null,
            pendingSync: 1
        });
        return newId;
    }
}
