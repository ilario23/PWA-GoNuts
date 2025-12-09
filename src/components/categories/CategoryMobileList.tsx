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

    const renderCategory = (
        category: Category,
        categoriesOfType: Category[],
        depth: number = 0,
        index: number = 0
    ): React.ReactNode => {
        const children = categoriesOfType.filter(
            (c) => c.parent_id === category.id
        );
        const budget =
            category.type === "expense"
                ? getBudgetForCategory(category.id)
                : null;
        const isExpanded = expandedCategoryIds.has(category.id);

        return (
            <motion.div
                key={category.id}
                className={depth > 0 ? "mt-1" : ""}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                    duration: 0.2,
                    delay: depth === 0 ? index * 0.05 : 0,
                }}
            >
                <div
                    style={{
                        marginLeft: depth > 0 ? `${depth * 16}px` : "0",
                        paddingLeft: depth > 0 ? "8px" : "0",
                        borderLeft:
                            depth > 0 ? "2px solid hsl(var(--muted))" : "none",
                    }}
                >
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
                            children.length > 0
                                ? () => toggleExpand(category.id)
                                : undefined
                        }
                    />
                </div>

                {/* Recursively render children - only if expanded */}
                <AnimatePresence>
                    {children.length > 0 && isExpanded && (
                        <motion.div
                            className="space-y-1 overflow-hidden"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            {children.map((child, childIndex) =>
                                renderCategory(child, categoriesOfType, depth + 1, childIndex)
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
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
                                <div key={type} className="mb-6">
                                    {/* Type header */}
                                    <h3 className="font-semibold text-sm text-muted-foreground mb-3 px-1 sticky top-0 bg-background/95 backdrop-blur z-10 py-2 uppercase tracking-wider">
                                        {t(type)}
                                    </h3>

                                    <div className="space-y-4">
                                        {rootCategories.map((category, index) =>
                                            renderCategory(category, categoriesOfType, 0, index)
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
