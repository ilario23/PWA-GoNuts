import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MobileCategoryRow } from "@/components/MobileCategoryRow";
import { SmoothLoader } from "@/components/ui/smooth-loader";
import { ContentLoader } from "@/components/ui/content-loader";
import { useTranslation } from "react-i18next";
import type { Category, Group } from "@/lib/db";
import { cn } from "@/lib/utils";

interface CategoryMobileListProps {
    categories: Category[] | undefined;
    filteredCategories: Category[];
    expandedCategoryIds: Set<string>;
    setExpandedCategoryIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    groups: Group[];
    getBudgetForCategory: (categoryId: string) => { amount: number } | null | undefined;
    onEdit: (category: Category) => void;
    onDelete: (id: string) => void;
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
    onEdit,
    onDelete,
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
        depth: number = 0
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

        // Root Level Styling (Depth 0)
        if (depth === 0) {
            return (
                <div key={category.id} className="mb-3">
                    <MobileCategoryRow
                        category={category}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onClick={onCategoryClick}
                        childCount={children.length}
                        budgetAmount={budget?.amount}
                        isExpanded={isExpanded}
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
                        className={cn(
                            "z-10 relative font-medium shadow-sm transition-colors",
                            hasChildren && isExpanded ? "mb-1 ring-1 ring-border/50" : "mb-0",
                            "border-l-4 border-l-transparent",
                            category.color && { borderColor: category.color }
                        )}
                        style={{
                            borderLeftColor: category.color
                        }}
                    />

                    <AnimatePresence>
                        {hasChildren && isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden pl-4 flex flex-col relative"
                            >
                                {/* Tree Guide Line for Level 1 */}
                                <div className="absolute left-[22px] top-0 bottom-4 w-px bg-border/60" />

                                {children.map((child) =>
                                    renderCategoryNode(child, categoriesOfType, depth + 1)
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        }

        // Child Level Styling (Depth >= 1)
        return (
            <div key={category.id} className="relative pl-4 mt-1">
                {/* Horizontal connector to parent's vertical line */}
                <div className="absolute left-0 top-[36px] w-4 h-px bg-border/60" />

                <MobileCategoryRow
                    category={category}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onClick={onCategoryClick}
                    childCount={children.length}
                    budgetAmount={budget?.amount}
                    isExpanded={isExpanded}
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
                    className={cn(
                        "bg-muted/10 border-muted rounded-md mb-1 shadow-none transition-colors",
                        // Differentiate nested items? Maybe slightly lighter background or just indentation
                        hasChildren && isExpanded && "bg-muted/20"
                    )}
                />

                {/* Recursive Children for Depth > 0 */}
                <AnimatePresence>
                    {hasChildren && isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden pl-4 flex flex-col relative"
                        >
                            {/* Inner Tree Guide Line */}
                            <div className="absolute left-[22px] top-0 bottom-4 w-px bg-border/60" />

                            {children.map((child) =>
                                renderCategoryNode(child, categoriesOfType, depth + 1)
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
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
                                    <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1 sticky top-0 bg-background/95 backdrop-blur py-2 z-20">
                                        {t(type)}
                                    </h3>

                                    <div className="space-y-2">
                                        {rootCategories.map((category) =>
                                            renderCategoryNode(category, categoriesOfType)
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
