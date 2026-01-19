import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextStat {
    id: string;
    name: string;
    total: number;
    transactionCount: number;
    avgPerTransaction: number;
    topCategory: string | null;
    categoryBreakdown: Array<{
        name: string;
        amount: number;
        percentage: number;
    }>;
}

interface StatsContextAnalyticsProps {
    contextStats: ContextStat[];
}

export function StatsContextAnalytics({
    contextStats,
}: StatsContextAnalyticsProps) {
    const { t } = useTranslation();
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    const toggleExpand = (itemId: string) => {
        setExpandedItems((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    if (contextStats.length === 0) return null;

    const grandTotal = contextStats.reduce((acc, curr) => acc + curr.total, 0);

    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle>{t("context_analytics")}</CardTitle>
                <CardDescription>{t("context_analytics_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-3 sm:px-6">
                <AnimatePresence initial={false}>
                    {contextStats.map((ctx, index) => {
                        const isExpanded = expandedItems.has(ctx.id);
                        const percentage = grandTotal > 0
                            ? (ctx.total / grandTotal) * 100
                            : 0;
                        const hasChildren = ctx.categoryBreakdown.length > 0;

                        return (
                            <motion.div
                                key={ctx.id}
                                layout
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                transition={{ duration: 0.3 }}
                                className="rounded-lg border bg-card overflow-hidden"
                            >
                                {/* Parent Context Header */}
                                <button
                                    onClick={() => hasChildren && toggleExpand(ctx.id)}
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
                                        style={{
                                            backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))`,
                                        }}
                                    />

                                    {/* Context info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-medium truncate text-sm">
                                                {ctx.name}
                                            </span>
                                            <span className="font-semibold text-sm ml-2 shrink-0">
                                                €{Number(ctx.total).toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full transition-all duration-500 ease-out"
                                                style={{
                                                    width: `${Math.max(percentage, 1)}%`,
                                                    backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))`,
                                                }}
                                            />
                                        </div>

                                        {/* Stats row inside header */}
                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                            <div>
                                                {percentage.toFixed(1)}% {t("of_total")}
                                            </div>
                                            <div>
                                                {ctx.transactionCount} {t("transactions")}
                                            </div>
                                            <div>
                                                {t("average")}: €{Number(ctx.avgPerTransaction).toFixed(2)}
                                            </div>
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

                                {/* Children - Expandable Category Breakdown */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <div className="border-t bg-accent/20 px-3 py-2 space-y-2">
                                                {ctx.categoryBreakdown.map((cat, catIndex) => (
                                                    <div
                                                        key={cat.name}
                                                        className="flex items-center gap-3 py-1.5 pl-6"
                                                        style={{
                                                            animationDelay: `${catIndex * 50}ms`,
                                                        }}
                                                    >
                                                        {/* Tree connector */}
                                                        <div className="absolute left-6 w-3 border-l-2 border-b-2 border-muted-foreground/20 h-4 rounded-bl-sm" />

                                                        {/* Color dot */}
                                                        <div
                                                            className="w-2 h-2 rounded-full shrink-0 opacity-70"
                                                            style={{
                                                                backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))`,
                                                            }}
                                                        />

                                                        {/* Category info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm truncate text-muted-foreground">
                                                                    {cat.name}
                                                                </span>
                                                                <span className="text-sm ml-2 shrink-0">
                                                                    €{Number(cat.amount).toFixed(2)}
                                                                </span>
                                                            </div>

                                                            {/* Mini progress bar and percentages */}
                                                            <div className="flex items-start gap-2 mt-0.5">
                                                                <div className="flex-1 bg-muted rounded-full h-1 mt-1.5">
                                                                    <div
                                                                        className="h-1 rounded-full transition-all duration-300"
                                                                        style={{
                                                                            width: `${Math.max(cat.percentage, 1)}%`,
                                                                            backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))`,
                                                                            opacity: 0.6,
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col items-end shrink-0 w-24">
                                                                    <span className="text-xs text-muted-foreground font-medium">
                                                                        {cat.percentage.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}
