import { Activity, AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import { CountUp } from "@/components/ui/count-up";
import { useEffect, useState } from "react";

interface StatsBurnRateCardProps {
    spending: number;
    budget: number | null;
    periodName: string; // "January 2024" or "2024"
    daysInPeriod: number;
    daysElapsed: number;
    daysRemaining: number;
    isLoading?: boolean;
}

export function StatsBurnRateCard({
    spending,
    budget,
    periodName,
    daysInPeriod,
    daysElapsed,
    daysRemaining,
    isLoading = false
}: StatsBurnRateCardProps) {
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <Card className="min-w-0 h-full">
                <CardHeader className="pb-2">
                    <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="h-20 bg-muted animate-pulse rounded-lg" />
                    <div className="space-y-2">
                        <div className="h-4 w-full bg-muted animate-pulse rounded" />
                        <div className="h-2 w-full bg-muted animate-pulse rounded-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Calculations
    const dailyAverage = daysElapsed > 0 ? spending / daysElapsed : 0;
    const projectedTotal = spending + (dailyAverage * daysRemaining);

    // Safety calculations
    const budgetAmount = budget || 0;
    const hasBudget = budget !== null && budget > 0;
    const remainingBudget = Math.max(0, budgetAmount - spending);
    const safeDailyLimit = hasBudget && daysRemaining > 0 ? remainingBudget / daysRemaining : 0;
    const isOverBudget = hasBudget && spending > budgetAmount;

    // Status Logic
    const isOnTrack = !hasBudget
        ? true // If no budget, we can't be off track essentially (or use historical - logic moved to display)
        : projectedTotal <= budgetAmount;

    // Progress Bar Logic
    // We want to show time progress vs money progress
    const timeProgress = (daysElapsed / daysInPeriod) * 100;
    const rawMoneyProgress = hasBudget ? (spending / budgetAmount) * 100 : 0;
    const moneyProgress = Math.min(rawMoneyProgress, 100);

    return (
        <Card className="min-w-0 h-full flex flex-col justify-between">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{t("spending_projection")}</CardTitle>
                        <CardDescription>{t("spending_projection_desc", { period: periodName })}</CardDescription>
                    </div>
                    <div className={cn(
                        "p-2 rounded-full bg-opacity-10",
                        !hasBudget ? "bg-slate-100 text-slate-500" :
                            isOnTrack ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    )}>
                        {hasBudget ? (
                            isOnTrack ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />
                        ) : (
                            <Activity className="h-5 w-5" />
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Main Metric: Projected vs Budget */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">{t("projected_total")}</div>
                        <div className={cn(
                            "text-2xl font-bold font-mono tracking-tight",
                            hasBudget && !isOnTrack ? "text-destructive" : "text-foreground"
                        )}>
                            €<CountUp value={projectedTotal} />
                        </div>
                        {hasBudget && (
                            <div className="text-xs text-muted-foreground mt-1">
                                {t("budget")}: €{budgetAmount.toFixed(0)}
                            </div>
                        )}
                    </div>

                    {/* Secondary Metric: Safe Limit or Daily Avg */}
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">
                            {hasBudget ? (isOverBudget ? t("over_budget_by") : t("safe_daily_limit")) : t("daily_average")}
                        </div>
                        {hasBudget ? (
                            isOverBudget ? (
                                <div className="text-2xl font-bold text-destructive font-mono tracking-tight">
                                    €<CountUp value={spending - budgetAmount} />
                                </div>
                            ) : (
                                <div className="text-2xl font-bold text-green-600 font-mono tracking-tight">
                                    €<CountUp value={safeDailyLimit} /><span className="text-sm font-sans text-muted-foreground">/{t("day_short")}</span>
                                </div>
                            )
                        ) : (
                            <div className="text-2xl font-bold text-foreground font-mono tracking-tight">
                                €<CountUp value={dailyAverage} /><span className="text-sm font-sans text-muted-foreground">/{t("day_short")}</span>
                            </div>
                        )}
                        {hasBudget && !isOverBudget && (
                            <div className="text-xs text-muted-foreground mt-1">
                                {t("current_avg")}: €{dailyAverage.toFixed(0)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bars */}
                {hasBudget && (
                    <div className="space-y-3 pt-2">
                        {/* Budget Usage */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>{t("budget_used")} ({(rawMoneyProgress).toFixed(0)}%)</span>
                                <span className="font-medium">€<CountUp value={spending} /></span>
                            </div>
                            <AnimatedProgress value={moneyProgress} className={cn("h-2", isOverBudget ? "bg-red-100 [&>div]:bg-red-500" : "")} />
                        </div>

                        {/* Time Elapsed (Context) */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{t("time_elapsed")} ({timeProgress.toFixed(0)}%)</span>
                                <span>{daysRemaining} {t("days_left")}</span>
                            </div>
                            <AnimatedProgress value={timeProgress} className="h-1.5 bg-secondary" />
                        </div>
                    </div>
                )}

                {!hasBudget && (
                    <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded-md border border-yellow-100">
                        <AlertCircle className="h-4 w-4" />
                        <span>{t("no_budget_set_hint")}</span>
                    </div>
                )}

            </CardContent>
        </Card>
    );
}

function AnimatedProgress({ value, className }: { value: number; className?: string }) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setProgress(value), 100);
        return () => clearTimeout(timer);
    }, [value]);

    return <Progress value={progress} className={className} />;
}
