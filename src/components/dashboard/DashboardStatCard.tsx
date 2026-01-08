import {
    TrendingUp,
    TrendingDown,
    PiggyBank,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
import { SmoothLoader } from "@/components/ui/smooth-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { CountUp } from "@/components/ui/count-up";
import { Insight } from "@/lib/insightUtils";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

export type StatCardType = "expense" | "income" | "balance" | "budget" | "insight";

interface DashboardStatCardProps {
    index: number;
    statsCount: number;
    type: StatCardType;
    totalExpense: number;
    totalIncome: number;
    balance: number;
    monthlyBudget: number | null;
    isOverBudget: boolean;
    budgetUsedPercentage: number;
    isStatsLoading: boolean;
    insight?: Insight;
}

export function DashboardStatCard({
    index,
    statsCount,
    type,
    totalExpense,
    totalIncome,
    balance,
    monthlyBudget,
    isOverBudget,
    budgetUsedPercentage,
    isStatsLoading,
    insight,
}: DashboardStatCardProps) {
    const { t } = useTranslation();

    // Helper to render value or placeholder
    const renderAnimatedValue = (value: number, prefix: string = "", suffix: string = "", decimals: number = 2) => {
        if (value === 0) {
            return <span className="text-muted-foreground">-</span>;
        }

        return (
            <CountUp
                value={value}
                decimals={decimals}
                prefix={prefix}
                suffix={suffix}
            />
        );
    };

    const dotIndicators = (
        <div className="flex gap-1.5">
            {Array.from({ length: statsCount }).map((_, i) => (
                <div
                    key={i}
                    className={cn(
                        "h-1.5 w-1.5 rounded-full transition-colors",
                        i === index ? "bg-primary" : "bg-muted-foreground/30",
                        i === index && type === "expense" && "bg-red-500",
                        i === index && type === "income" && "bg-green-500",
                        i === index && type === "balance" && (balance >= 0 ? "bg-emerald-500" : "bg-red-500"),
                        i === index && type === "budget" && (isOverBudget ? "bg-red-500" : budgetUsedPercentage > 80 ? "bg-amber-500" : "bg-blue-500"),
                        i === index && type === "insight" && "bg-purple-500"
                    )}
                />
            ))}
        </div>
    );

    switch (type) {
        case "expense": // Expenses
            return (
                <div className="relative overflow-hidden rounded-xl p-4 h-full border">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-red-500/15 text-red-500">
                                <ArrowDownRight className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {t("expenses")}
                            </span>
                        </div>
                        {dotIndicators}
                    </div>
                    <SmoothLoader
                        isLoading={isStatsLoading}
                        skeleton={<Skeleton className="h-9 w-32" />}
                    >
                        <p className="text-3xl font-bold tracking-tight text-red-500">
                            {renderAnimatedValue(totalExpense, "-€")}
                        </p>
                    </SmoothLoader>

                    <div className="absolute -right-4 -bottom-4 opacity-[0.07] text-red-500">
                        <TrendingDown className="h-24 w-24" />
                    </div>
                </div>
            );
        case "income": // Income
            return (
                <div className="relative overflow-hidden rounded-xl p-4 h-full border">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-green-500/15 text-green-500">
                                <ArrowUpRight className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {t("income")}
                            </span>
                        </div>
                        {dotIndicators}
                    </div>
                    <SmoothLoader
                        isLoading={isStatsLoading}
                        skeleton={<Skeleton className="h-9 w-32" />}
                    >
                        <p className="text-3xl font-bold tracking-tight text-green-500">
                            {renderAnimatedValue(totalIncome, "+€")}
                        </p>
                    </SmoothLoader>

                    <div className="absolute -right-4 -bottom-4 opacity-[0.07] text-green-500">
                        <TrendingUp className="h-24 w-24" />
                    </div>
                </div>
            );
        case "balance": // Balance
            return (
                <div className="relative overflow-hidden rounded-xl p-4 h-full border">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div
                                className={`p-1.5 rounded-md ${balance >= 0
                                    ? "bg-emerald-500/15 text-green-500"
                                    : "bg-red-500/15 text-red-500"
                                    }`}
                            >
                                <PiggyBank className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {t("balance")}
                            </span>
                        </div>
                        {dotIndicators}
                    </div>
                    <SmoothLoader
                        isLoading={isStatsLoading}
                        skeleton={<Skeleton className="h-9 w-32" />}
                    >
                        <p
                            className={`text-3xl font-bold tracking-tight ${balance >= 0 ? "text-green-500" : "text-red-500"
                                }`}
                        >
                            {renderAnimatedValue(balance, balance >= 0 ? "+€" : "€")}
                        </p>
                    </SmoothLoader>

                    <div
                        className={`absolute -right-4 -bottom-4 opacity-[0.07] ${balance >= 0 ? "text-green-500" : "text-red-500"
                            }`}
                    >
                        <PiggyBank className="h-24 w-24" />
                    </div>
                </div>
            );
        case "budget": // Budget (only if monthlyBudget exists)
            if (!monthlyBudget) return null;
            return (
                <div className="relative overflow-hidden rounded-xl p-4 h-full border">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div
                                className={`p-1.5 rounded-md ${isOverBudget
                                    ? "bg-red-500/20 text-red-600"
                                    : budgetUsedPercentage > 80
                                        ? "bg-amber-500/20 text-amber-600"
                                        : "bg-blue-500/20 text-blue-600"
                                    }`}
                            ></div>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {t("budget")}
                            </span>
                        </div>
                        {dotIndicators}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p
                            className={`text-3xl font-bold tracking-tight ${isOverBudget
                                ? "text-red-600"
                                : budgetUsedPercentage > 80
                                    ? "text-amber-600"
                                    : "text-blue-600"
                                }`}
                        >
                            <CountUp value={budgetUsedPercentage} decimals={0} suffix="%" />
                        </p>
                        <span className="text-sm text-muted-foreground">
                            {t("budget_of_total", { total: monthlyBudget.toFixed(0) })}
                        </span>
                    </div>
                    <div className="mt-2 h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${isOverBudget
                                ? "bg-red-500"
                                : budgetUsedPercentage > 80
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                                }`}
                            style={{
                                width: `${Math.min(budgetUsedPercentage, 100)}%`,
                            }}
                        />
                    </div>

                    <div
                        className={`absolute -right-4 -bottom-4 opacity-[0.07] ${isOverBudget
                            ? "text-red-500"
                            : budgetUsedPercentage > 80
                                ? "text-amber-500"
                                : "text-blue-500"
                            }`}
                    ></div>
                </div>
            );
        case "insight":
            if (!insight) return null;
            const IconComponent = (Icons as any)[insight.icon] || Icons.Info;
            // Determine color based on type
            const colorClass = insight.type === "positive" ? "text-green-600 dark:text-green-400" :
                insight.type === "warning" ? "text-amber-600 dark:text-amber-400" :
                    insight.type === "tip" ? "text-purple-600 dark:text-purple-400" :
                        "text-blue-600 dark:text-blue-400";

            const bgClass = insight.type === "positive" ? "bg-green-500/15" :
                insight.type === "warning" ? "bg-amber-500/15" :
                    insight.type === "tip" ? "bg-purple-500/15" :
                        "bg-blue-500/15";

            return (
                <div className="relative overflow-hidden rounded-xl p-3 h-full border">
                    {/* Header Row: Icon + Title + Dots */}
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 w-full pr-12">
                            <div className={cn("p-1 rounded-md shrink-0", bgClass, colorClass)}>
                                <IconComponent className="h-4 w-4" />
                            </div>
                            <span className={cn("text-xs font-semibold uppercase tracking-wider truncate", colorClass)}>
                                {t(insight.title)}
                            </span>
                        </div>
                        <div className="absolute top-3 right-3">
                            {dotIndicators}
                        </div>
                    </div>

                    {/* Content Row */}
                    <div className="text-sm font-medium text-foreground leading-snug line-clamp-2 md:line-clamp-3">
                        {t(insight.message || "", insight.messageParams)}
                    </div>

                    {/* Background Icon */}
                    <div className={cn("absolute -right-4 -bottom-4 opacity-[0.05]", colorClass)}>
                        <IconComponent className="h-20 w-20" />
                    </div>
                </div>
            );
        default:
            return null;
    }
}
