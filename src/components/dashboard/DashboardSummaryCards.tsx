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

interface DashboardSummaryCardsProps {
    totalExpense: number;
    totalIncome: number;
    balance: number;
    isStatsLoading: boolean;
    monthlyBudget: number | null;
    budgetUsedPercentage: number;
    isOverBudget: boolean;
    budgetRemaining: number;
}

export function DashboardSummaryCards({
    totalExpense,
    totalIncome,
    balance,
    isStatsLoading,
    monthlyBudget,
    isOverBudget,
    budgetRemaining,
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
    const gridCols = monthlyBudget ? "md:grid-cols-4" : "md:grid-cols-3";

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
