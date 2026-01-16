import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Number of categories to show initially before expansion */
const INITIAL_VISIBLE_COUNT = 3;

interface ChildCategory {
    name: string;
    amount: number;
    color: string;
}

interface ExpenseHierarchyItem {
    rootName: string;
    rootColor: string;
    total: number;
    _children: ChildCategory[];
    [key: string]: unknown;
}

interface StatsExpenseBreakdownProps {
    expensesByHierarchy: ExpenseHierarchyItem[];
    totalExpense: number;
    isLoading?: boolean;
}

export function StatsExpenseBreakdown({
    expensesByHierarchy,
    totalExpense,
    isLoading = false,
}: StatsExpenseBreakdownProps) {
    const { t } = useTranslation();
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [showAllCategories, setShowAllCategories] = useState(false);

    const toggleExpand = (itemName: string) => {
        setExpandedItems((prev) => {
            const next = new Set(prev);
            if (next.has(itemName)) {
                next.delete(itemName);
            } else {
                next.add(itemName);
            }
            return next;
        });
    };

    // Sort by total descending
    const sortedData = [...expensesByHierarchy].sort((a, b) => b.total - a.total);

    // Calculate visible data based on expansion state
    const hasMoreCategories = sortedData.length > INITIAL_VISIBLE_COUNT;
    const visibleData = showAllCategories
        ? sortedData
        : sortedData.slice(0, INITIAL_VISIBLE_COUNT);
    const hiddenCount = sortedData.length - INITIAL_VISIBLE_COUNT;

    if (expensesByHierarchy.length === 0 && !isLoading) {
        return (
            <Card className="min-w-0">
                <CardHeader>
                    <CardTitle>{t("expense_breakdown")}</CardTitle>
                    <CardDescription>{t("expense_breakdown_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                        {t("no_data")}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="min-w-0">
            <CardHeader className="pb-3">
                <CardTitle>{t("expense_breakdown")}</CardTitle>
                <CardDescription>{t("expense_breakdown_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-3 sm:px-6">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-16 bg-muted animate-pulse rounded-lg"
                            />
                        ))}
                    </div>
                ) : (
                    <>
                        <AnimatePresence initial={false}>
                            {visibleData.map((item) => {
                                const isExpanded = expandedItems.has(item.rootName);
                                const percentage = totalExpense > 0
                                    ? (item.total / totalExpense) * 100
                                    : 0;
                                const hasChildren = item._children.length > 1;

                                return (
                                    <motion.div
                                        key={item.rootName}
                                        layout
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="rounded-lg border bg-card overflow-hidden"
                                    >
                                        {/* Parent Category Header */}
                                        <button
                                            onClick={() => hasChildren && toggleExpand(item.rootName)}
                                            disabled={!hasChildren}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 text-left transition-colors",
                                                hasChildren && "hover:bg-accent/50 cursor-pointer",
                                                !hasChildren && "cursor-default"
                                            )}
                                        >
                                            {/* Color indicator */}
                                            <div
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ backgroundColor: item.rootColor }}
                                            />

                                            {/* Category info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-medium truncate text-sm">
                                                        {item.rootName}
                                                    </span>
                                                    <span className="font-semibold text-sm ml-2 shrink-0">
                                                        €{item.total.toFixed(2)}
                                                    </span>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="w-full bg-muted rounded-full h-2">
                                                    <div
                                                        className="h-2 rounded-full transition-all duration-500 ease-out"
                                                        style={{
                                                            width: `${Math.max(percentage, 1)}%`,
                                                            backgroundColor: item.rootColor,
                                                        }}
                                                    />
                                                </div>

                                                {/* Percentage */}
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {percentage.toFixed(1)}%
                                                    {hasChildren && (
                                                        <span className="ml-1">
                                                            · {item._children.length} {t("subcategories")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expand/Collapse indicator */}
                                            {hasChildren && (
                                                <div className="shrink-0 text-muted-foreground">
                                                    {isExpanded ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </div>
                                            )}
                                        </button>

                                        {/* Children - Expandable Section */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <div className="border-t bg-accent/20 px-3 py-2 space-y-2">
                                                        {item._children
                                                            .sort((a, b) => b.amount - a.amount)
                                                            .map((child, index) => {
                                                                const childPercentage = item.total > 0
                                                                    ? (child.amount / item.total) * 100
                                                                    : 0;

                                                                return (
                                                                    <div
                                                                        key={child.name}
                                                                        className="flex items-center gap-3 py-1.5 pl-6"
                                                                        style={{
                                                                            animationDelay: `${index * 50}ms`,
                                                                        }}
                                                                    >
                                                                        {/* Tree connector */}
                                                                        <div className="absolute left-6 w-3 border-l-2 border-b-2 border-muted-foreground/20 h-4 rounded-bl-sm" />

                                                                        {/* Color dot */}
                                                                        <div
                                                                            className="w-2 h-2 rounded-full shrink-0 opacity-70"
                                                                            style={{ backgroundColor: item.rootColor }}
                                                                        />

                                                                        {/* Child info */}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-sm truncate text-muted-foreground">
                                                                                    {child.name}
                                                                                </span>
                                                                                <span className="text-sm ml-2 shrink-0">
                                                                                    €{child.amount.toFixed(2)}
                                                                                </span>
                                                                            </div>

                                                                            {/* Mini progress bar and percentages */}
                                                                            <div className="flex items-start gap-2 mt-0.5">
                                                                                <div className="flex-1 bg-muted rounded-full h-1 mt-1.5">
                                                                                    <div
                                                                                        className="h-1 rounded-full transition-all duration-300"
                                                                                        style={{
                                                                                            width: `${Math.max(childPercentage, 1)}%`,
                                                                                            backgroundColor: item.rootColor,
                                                                                            opacity: 0.6,
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <div className="flex flex-col items-end shrink-0 w-24">
                                                                                    <span className="text-xs text-muted-foreground font-medium">
                                                                                        {childPercentage.toFixed(1)}%
                                                                                    </span>
                                                                                    {totalExpense > 0 && (
                                                                                        <span className="text-[10px] text-muted-foreground/70">
                                                                                            {((child.amount / totalExpense) * 100).toFixed(1)}% {t("of_total")}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Show more/less button */}
                        {hasMoreCategories && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowAllCategories(!showAllCategories)}
                            >
                                {showAllCategories ? (
                                    <>
                                        <ChevronUp className="h-4 w-4 mr-2" />
                                        {t("show_less")}
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4 mr-2" />
                                        {t("show_more_categories", { count: hiddenCount })}
                                    </>
                                )}
                            </Button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
