import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { it, enUS } from "date-fns/locale";
import { format } from "date-fns";
import { Wallet } from "lucide-react";
import { SmoothLoader } from "@/components/ui/smooth-loader";
import { ContentLoader } from "@/components/ui/content-loader";
import { TransactionList } from "@/components/TransactionList";
import { Transaction, Category, Context, Group } from "@/lib/db";
import { useTranslation } from "react-i18next";
import { useMobile } from "@/hooks/useMobile";
import { DESKTOP_ROW_HEIGHT, MOBILE_ROW_HEIGHT, MOBILE_HEADER_HEIGHT } from "@/components/TransactionList";
import { useState, useEffect, useRef } from "react";
import { CountUp } from "@/components/ui/count-up";

interface DashboardChartCardProps {
    index: number;
    chartViewsCount: number;
    dailyCumulativeExpenses: Array<{
        day: string;
        cumulative: number;
        projection?: number;
    }>;
    chartConfig: ChartConfig;
    isStatsLoading: boolean;
    monthlyBudget: number | null;
    totalExpense: number;
    isOverBudget: boolean;
    budgetUsedPercentage: number;
    budgetRemaining: number;
    recentTransactions: Transaction[] | undefined;
    categories: Category[] | undefined;
    groups: Group[] | undefined;
    contexts: Context[] | undefined;
    transactions: Transaction[] | undefined;
    onEdit?: (transaction: Transaction) => void;
    onDelete?: (id: string) => void;
}

// ------------------------------------------------------------------
// Internal Components (Exported for Desktop Reuse)
// ------------------------------------------------------------------

export function DashboardChartContent({
    dailyCumulativeExpenses,
    chartConfig,
    isStatsLoading,
    headerRightContent,
}: {
    dailyCumulativeExpenses: Array<{
        day: string;
        cumulative: number;
        projection?: number;
    }>;
    chartConfig: ChartConfig;
    isStatsLoading: boolean;
    headerRightContent?: React.ReactNode;
}) {
    const { t, i18n } = useTranslation();
    const now = new Date();
    const dateLocale = i18n.language === "it" ? it : enUS;

    return (
        <Card className="h-full flex flex-col shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col space-y-1.5">
                    <CardTitle>{t("monthly_expenses_trend")}</CardTitle>
                    <CardDescription>
                        {t("cumulative_daily_expenses")} - {format(now, "MMMM yyyy", { locale: dateLocale })}
                    </CardDescription>
                </div>
                {headerRightContent}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
                <SmoothLoader
                    isLoading={isStatsLoading}
                    skeleton={<ContentLoader variant="chart" />}
                    className="flex-1 w-full min-h-0"
                >
                    {dailyCumulativeExpenses.length > 0 ? (
                        <div className="items-center justify-center flex w-full h-full">
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <AreaChart
                                    accessibilityLayer
                                    data={dailyCumulativeExpenses}
                                    margin={{
                                        left: -5,
                                        right: 12,
                                        top: 12,
                                        bottom: 12,
                                    }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="cumulativeGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="var(--color-cumulative)"
                                                stopOpacity={0.8}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="var(--color-cumulative)"
                                                stopOpacity={0.1}
                                            />
                                        </linearGradient>
                                        <linearGradient
                                            id="projectionGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="var(--color-projection)"
                                                stopOpacity={0.6}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="var(--color-projection)"
                                                stopOpacity={0.1}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="day"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => `€${value}`}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={
                                            <ChartTooltipContent
                                                indicator="line"
                                                valueFormatter={(value) =>
                                                    `€${Number(value).toLocaleString()}`
                                                }
                                            />
                                        }
                                    />
                                    <Area
                                        dataKey="cumulative"
                                        type="monotone"
                                        fill="url(#cumulativeGradient)"
                                        stroke="var(--color-cumulative)"
                                        animationBegin={100}
                                        animationDuration={1200}
                                        animationEasing="ease-out"
                                    />
                                    <Area
                                        dataKey="projection"
                                        type="monotone"
                                        fill="url(#projectionGradient)"
                                        stroke="var(--color-projection)"
                                        strokeDasharray="5 5"
                                        animationBegin={100}
                                        animationDuration={1200}
                                        animationEasing="ease-out"
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </div>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center text-center p-4 h-full gap-3">
                            <div className="p-3 bg-muted/50 rounded-full">
                                <Wallet className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-medium text-foreground">{t("dashboard_chart_empty_title")}</h3>
                                <p className="text-sm text-muted-foreground max-w-[220px]">
                                    {t("dashboard_chart_empty_subtitle")}
                                </p>
                            </div>
                        </div>
                    )}
                </SmoothLoader>
                {/* Chart Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-auto pt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: "hsl(0 84.2% 60.2%)" }}
                        />
                        <span>{t("chart_legend_actual")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-3 h-0.5 border-t-2 border-dashed"
                            style={{ borderColor: "#eb630fff", width: "12px" }}
                        />
                        <span>{t("chart_legend_projection")}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function DashboardTransactionsContent({
    recentTransactions,
    categories,
    groups,
    contexts,
    transactions,
    headerRightContent,
    onEdit,
    onDelete,
}: {
    recentTransactions: Transaction[] | undefined;
    categories: Category[] | undefined;
    groups: Group[] | undefined;
    contexts: Context[] | undefined;
    transactions: Transaction[] | undefined;
    headerRightContent?: React.ReactNode;
    onEdit?: (transaction: Transaction) => void;
    onDelete?: (id: string) => void;
}) {
    const { t } = useTranslation();
    const isMobile = useMobile();
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState(5);

    useEffect(() => {
        const calculateVisibleTransactions = () => {
            if (!containerRef.current || !recentTransactions) return;

            const totalHeight = containerRef.current.clientHeight;
            let currentHeight = 0;
            let count = 0;

            if (isMobile) {
                let lastDate = "";
                for (const transaction of recentTransactions) {
                    let itemHeight = MOBILE_ROW_HEIGHT;
                    if (transaction.date !== lastDate) {
                        itemHeight += MOBILE_HEADER_HEIGHT;
                        lastDate = transaction.date;
                    }
                    if (currentHeight + itemHeight > totalHeight) break;
                    currentHeight += itemHeight;
                    currentHeight += 1; // Gap/border compensation
                    count++;
                }
            } else {
                const tableHeaderHeight = 51;
                currentHeight += tableHeaderHeight;
                for (const _ of recentTransactions) {
                    if (currentHeight + DESKTOP_ROW_HEIGHT > totalHeight) break;
                    currentHeight += DESKTOP_ROW_HEIGHT;
                    count++;
                }
            }
            setVisibleCount(Math.max(1, count));
        };

        calculateVisibleTransactions();
        const observer = new ResizeObserver(() => calculateVisibleTransactions());
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isMobile, recentTransactions]);

    return (
        <Card className="h-full flex flex-col shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col space-y-1.5">
                    <CardTitle>{t("recent_transactions")}</CardTitle>
                </div>
                {headerRightContent}
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden min-h-0">
                <div ref={containerRef} className="h-full w-full">
                    <TransactionList
                        transactions={recentTransactions?.slice(0, visibleCount)}
                        categories={categories}
                        groups={groups}
                        contexts={contexts}
                        showActions={false}
                        isLoading={transactions === undefined}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

export function DashboardBudgetContent({
    monthlyBudget,
    totalExpense,
    isOverBudget,
    budgetUsedPercentage,
    budgetRemaining,
    headerRightContent,
}: {
    monthlyBudget: number;
    totalExpense: number;
    isOverBudget: boolean;
    budgetUsedPercentage: number;
    budgetRemaining: number;
    headerRightContent?: React.ReactNode;
}) {
    const { t, i18n } = useTranslation();
    const now = new Date();
    const dateLocale = i18n.language === "it" ? it : enUS;

    return (
        <Card className="h-full flex flex-col shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col space-y-1.5">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {t("monthly_budget")}
                    </CardTitle>
                    <CardDescription>
                        {format(now, "MMMM yyyy", { locale: dateLocale })}
                    </CardDescription>
                </div>
                {headerRightContent}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center space-y-6">
                <div className="space-y-6">
                    {/* Budget Overview */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">
                                {t("spent")}
                            </span>
                            <span className="text-3xl font-bold text-red-600">
                                €{totalExpense.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">
                                {t("budget")}
                            </span>
                            <span className="text-3xl font-bold">
                                €{monthlyBudget.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="h-6 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 rounded-full ${isOverBudget
                                    ? "bg-red-500"
                                    : budgetUsedPercentage > 80
                                        ? "bg-amber-500"
                                        : "bg-green-500"
                                    }`}
                                style={{
                                    width: `${Math.min(budgetUsedPercentage, 100)}%`,
                                }}
                            />
                        </div>
                        <div className="flex justify-between text-base">
                            <span
                                className={`font-medium ${isOverBudget
                                    ? "text-red-600"
                                    : budgetUsedPercentage > 80
                                        ? "text-yellow-600"
                                        : "text-green-600"
                                    }`}
                            >
                                <CountUp value={budgetUsedPercentage} decimals={0} suffix="%" /> {t("used")}
                            </span>
                            <span
                                className={
                                    isOverBudget
                                        ? "text-red-600 font-medium"
                                        : "text-green-600 font-medium"
                                }
                            >
                                {isOverBudget
                                    ? `+€${Math.abs(budgetRemaining).toFixed(2)} ${t("over")}`
                                    : `€${budgetRemaining.toFixed(2)} ${t("remaining")}`}
                            </span>
                        </div>
                    </div>

                    {/* Daily Average Info */}
                    <div className="pt-4 border-t">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{t("daily_average")}</span>
                            <span>
                                €
                                {(totalExpense / Math.max(new Date().getDate(), 1)).toFixed(
                                    2
                                )}
                                /{t("day")}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="mt-auto flex justify-end"></div>
            </CardContent>
        </Card>
    );
}

// ------------------------------------------------------------------
// Main Component (Mobile Wrapper)
// ------------------------------------------------------------------

export function DashboardChartCard({
    index,
    chartViewsCount,
    dailyCumulativeExpenses,
    chartConfig,
    isStatsLoading,
    monthlyBudget,
    totalExpense,
    isOverBudget,
    budgetUsedPercentage,
    budgetRemaining,
    recentTransactions,
    categories,
    groups,
    contexts,
    transactions,
    onEdit,
    onDelete,
}: DashboardChartCardProps) {
    const dotIndicators = (
        <div className="flex md:flex-col gap-1.5 ml-auto">
            {Array.from({ length: chartViewsCount }).map((_, i) => (
                <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${i === index ? "bg-primary" : "bg-muted-foreground/30"
                        }`}
                />
            ))}
        </div>
    );

    switch (index) {
        case 0: // Chart
            return (
                <DashboardChartContent
                    dailyCumulativeExpenses={dailyCumulativeExpenses}
                    chartConfig={chartConfig}
                    isStatsLoading={isStatsLoading}
                    headerRightContent={dotIndicators}
                />
            );
        case 1: // Recent Transactions
            return (
                <DashboardTransactionsContent
                    recentTransactions={recentTransactions}
                    categories={categories}
                    groups={groups}
                    contexts={contexts}
                    transactions={transactions}
                    headerRightContent={dotIndicators}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            );
        case 2: // Budget
            if (!monthlyBudget) return null;
            return (
                <DashboardBudgetContent
                    monthlyBudget={monthlyBudget}
                    totalExpense={totalExpense}
                    isOverBudget={isOverBudget}
                    budgetUsedPercentage={budgetUsedPercentage}
                    budgetRemaining={budgetRemaining}
                    headerRightContent={dotIndicators}
                />
            );
        default:
            return null;
    }
}
