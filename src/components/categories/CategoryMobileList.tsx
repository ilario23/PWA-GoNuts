import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileCategoryRow } from "@/components/MobileCategoryRow";
import { SmoothLoader } from "@/components/ui/smooth-loader";
import { ContentLoader } from "@/components/ui/content-loader";
import { useTranslation } from "react-i18next";
import type { Category, Group } from "@/lib/db";

interface CategoryMobileListProps {
    categories: Category[] | undefined;
    filteredCategories: Category[];
    expandedCategoryIds: Set<string>;
    setExpandedCategoryIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    groups: Group[];
    getBudgetForCategory: (categoryId: string) => { amount: number; spent: number; percentage: number; period: "monthly" | "yearly" } | null | undefined;
    onCategoryClick: (category: Category) => void;
    isLoading: boolean;
}

export function CategoryMobileList({
    categories,
    filteredCategories,
    expandedCategoryIds,
    setExpandedCategoryIds,
    groups,
    getBudgetForCategory,
    onCategoryClick,
    isLoading,
}: CategoryMobileListProps) {
    const { t } = useTranslation();

    const toggleExpand = (categoryId: string) => {
        setExpandedCategoryIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };


    const renderCategoryNode = (
        category: Category,
        categoriesOfType: Category[],
        depth: number = 0,
        isFirst: boolean = false
    ) => {
        const children = categoriesOfType.filter(
            (c) => c.parent_id === category.id
        );

        const isExpanded = expandedCategoryIds.has(category.id);
        const hasChildren = children.length > 0;

        const budget =
            category.type === "expense"
                ? getBudgetForCategory(category.id)
                : null;

        const row = (
            <MobileCategoryRow
                category={category}
                onClick={onCategoryClick}
                childCount={children.length}
                budget={budget ? {
                    amount: budget.amount,
                    spent: budget.spent,
                    percentage: budget.percentage,
                    period: budget.period
                } : null}
                isExpanded={isExpanded}
                isFirst={isFirst}
                groupName={
                    category.group_id
                        ? groups?.find((g) => g.id === category.group_id)?.name
                        : undefined
                }
                onToggleExpand={
                    hasChildren
                        ? () => toggleExpand(category.id)
                        : undefined
                }
            />
        );

        const expandedChildren = (
            <AnimatePresence initial={false}>
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-muted/30"
                    >
                        {children.map((child, i) =>
                            renderCategoryNode(child, categoriesOfType, depth + 1, i === 0)
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        );

        // Root level: contiguous ledger line within the type sheet.
        if (depth === 0) {
            return (
                <div key={category.id}>
                    {row}
                    {expandedChildren}
                </div>
            );
        }

        // Nested level: indented ledger line on a tinted track.
        return (
            <div key={category.id} className="pl-5">
                {row}
                {expandedChildren}
            </div>
        );
    };

    return (
        <div className="space-y-3 md:hidden">
            <SmoothLoader
                isLoading={isLoading}
                skeleton={<ContentLoader variant="category-mobile" count={5} />}
            >
                {categories && categories.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                        {t("no_categories")}
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                        {t("no_results_found")}
                    </div>
                ) : (
                    <div className="pb-20">
                        {/* Render each type group */}
                        {["expense", "income", "investment"].map((type) => {
                            const categoriesOfType = filteredCategories.filter(
                                (c) => c.type === type
                            );
                            if (categoriesOfType.length === 0) return null;

                            // Get root categories (no parent) for this type
                            const rootCategories = categoriesOfType.filter(
                                (c) => !c.parent_id
                            );

                            return (
                                <div key={type} className="mb-6 relative z-0">
                                    <div className="flex items-baseline justify-between px-1 mb-2 sticky top-0 bg-background/95 backdrop-blur py-2 z-20">
                                        <h3 className="text-[13px] font-bold uppercase tracking-wide text-foreground/70">
                                            {t(type)}
                                        </h3>
                                        <span className="num text-[12px] font-semibold tabular-nums text-muted-foreground/80">
                                            {rootCategories.length}
                                        </span>
                                    </div>

                                    <div className="rounded-[22px] border border-border/50 bg-card shadow-card overflow-hidden">
                                        {rootCategories.map((category, i) =>
                                            renderCategoryNode(category, categoriesOfType, 0, i === 0)
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SmoothLoader>
        </div>
    );
}
