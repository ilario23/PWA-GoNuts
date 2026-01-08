import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { SmoothLoader } from "@/components/ui/smooth-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { CountUp } from "@/components/ui/count-up";
import { Insight } from "@/lib/insightUtils";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import { Info } from "lucide-react";

interface DashboardSummaryCardsProps {
    totalExpense: number;
    totalIncome: number;
    balance: number;
    isStatsLoading: boolean;
    monthlyBudget: number | null;
    budgetUsedPercentage: number;
    isOverBudget: boolean;
    budgetRemaining: number;
    insight?: Insight;
}

export function DashboardSummaryCards({
    totalExpense,
    totalIncome,
    balance,
    isStatsLoading,
    monthlyBudget,
    isOverBudget,
    budgetRemaining,
    insight,
}: DashboardSummaryCardsProps) {
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

    // Determine grid columns based on content
    // Base is 3 (Expense, Income, Balance)
    // +1 for Budget, +1 for Insight
    const cols = 3 + (monthlyBudget ? 1 : 0) + (insight ? 1 : 0);
    const gridCols = cols === 5 ? "md:grid-cols-5" : cols === 4 ? "md:grid-cols-4" : "md:grid-cols-3";

    const renderInsightCard = () => {
        if (!insight) return null;

        const IconComponent = (Icons as any)[insight.icon] || Info;
        // Determine color based on type
        const colorClass = insight.type === "positive" ? "text-green-600 dark:text-green-400" :
            insight.type === "warning" ? "text-amber-600 dark:text-amber-400" :
                insight.type === "tip" ? "text-purple-600 dark:text-purple-400" :
                    "text-blue-600 dark:text-blue-400";

        return (
            <Card className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className={cn("text-xs font-medium uppercase tracking-wider truncate", colorClass)}>
                        {t(insight.title)}
                    </CardTitle>
                    <IconComponent className={cn("h-4 w-4", colorClass)} />
                </CardHeader>
                <CardContent>
                    <SmoothLoader
                        isLoading={isStatsLoading}
                        skeleton={<Skeleton className="h-8 w-full" />}
                    >
                        <p className="text-sm font-medium text-foreground leading-snug line-clamp-3">
                            {t(insight.message || "", insight.messageParams)}
                        </p>
                    </SmoothLoader>
                    {/* Background Icon */}
                    <div className={cn("absolute -right-4 -bottom-4 opacity-[0.07]", colorClass)}>
                        <IconComponent className="h-24 w-24" />
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className={`hidden md:grid gap-4 ${gridCols}`}>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t("total_expenses")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SmoothLoader
                        isLoading={isStatsLoading}
                        skeleton={<Skeleton className="h-8 w-28" />}
                    >
                        <div className="text-2xl font-bold text-red-600">
                            {renderAnimatedValue(totalExpense, "-€")}
                        </div>
                    </SmoothLoader>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t("total_income")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SmoothLoader
                        isLoading={isStatsLoading}
                        skeleton={<Skeleton className="h-8 w-28" />}
                    >
                        <div className="text-2xl font-bold text-green-600">
                            {renderAnimatedValue(totalIncome, "+€")}
                        </div>
                    </SmoothLoader>
                </CardContent>
            </Card>

            {/* Render Insight here if we have 4 or 5 columns, or maybe after balance? 
                User mobile flow is Expense -> Income -> Insight -> Balance.
                Let's try to match that order if possible, or put it at the end?
                Desktop summary cards are typically: Expense, Income, Balance (standard accounting).
                Adding Insight in between might be weird for the "Balance" calculation flow.
                Let's put Insight LAST or after Balance. 
                If 5 cols: Exp, Inc, Bal, Budg, Ins.
                If 4 cols (No Budg): Exp, Inc, Bal, Ins.
                If 4 cols (No Ins): Exp, Inc, Bal, Budg.
                
                Actually, the user liked "Expense, Income, Insight, Balance" on mobile.
                But on desktop, Balance usually effectively sums up Exp/Inc.
                Let's place it after Balance for now, or alongside Budget.
            */}

            {renderInsightCard()}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t("total_balance")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SmoothLoader
                        isLoading={isStatsLoading}
                        skeleton={<Skeleton className="h-8 w-28" />}
                    >
                        <div
                            className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                        >
                            {renderAnimatedValue(balance, balance >= 0 ? "+€" : "€")}
                        </div>
                    </SmoothLoader>
                </CardContent>
            </Card>
            {monthlyBudget && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {t("monthly_budget")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SmoothLoader
                            isLoading={isStatsLoading}
                            skeleton={<Skeleton className="h-8 w-28" />}
                        >
                            <div className="flex flex-col gap-1">
                                <div className="text-2xl font-bold">
                                    €{monthlyBudget}
                                </div>
                                <div className={`text-xs ${isOverBudget ? "text-red-500" : "text-muted-foreground"}`}>
                                    {isOverBudget ? (
                                        <span>+{Math.abs(budgetRemaining).toFixed(2)} {t("over")}</span>
                                    ) : (
                                        <span>{budgetRemaining.toFixed(2)} {t("remaining")}</span>
                                    )}
                                </div>
                            </div>
                        </SmoothLoader>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
