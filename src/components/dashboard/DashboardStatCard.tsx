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

interface DashboardStatCardProps {
    index: number;
    statsCount: number;
    totalExpense: number;
    totalIncome: number;
    balance: number;
    monthlyBudget: number | null;
    isOverBudget: boolean;
    budgetUsedPercentage: number;
    isStatsLoading: boolean;
}

export function DashboardStatCard({
    index,
    statsCount,
    totalExpense,
    totalIncome,
    balance,
    monthlyBudget,
    isOverBudget,
    budgetUsedPercentage,
    isStatsLoading,
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
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${i === index
                        ? index === 0
                            ? "bg-red-500"
                            : index === 1
                                ? "bg-green-500"
                                : index === 2
                                    ? balance >= 0
                                        ? "bg-emerald-500"
                                        : "bg-red-500"
                                    : isOverBudget
                                        ? "bg-red-500"
                                        : budgetUsedPercentage > 80
                                            ? "bg-amber-500"
                                            : "bg-blue-500"
                        : "bg-muted-foreground/30"
                        }`}
                />
            ))}
        </div>
    );

    switch (index) {
        case 0: // Expenses
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
        case 1: // Income
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
        case 2: // Balance
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
        case 3: // Budget (only if monthlyBudget exists)
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
        default:
            return null;
    }
}
