import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { LazyChart } from "@/components/LazyChart";
import {
    AreaChart,
    Area,
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts";
import { ArrowUp, ArrowDown } from "lucide-react";
import { format, Locale } from "date-fns";
import { useTranslation } from "react-i18next";

interface ComparisonData {
    income: { current: number; previous: number; change: number; trend: string };
    expense: { current: number; previous: number; change: number; trend: string };
    balance: { current: number; previous: number; change: number; trend: string };
    savingRate: { current: number; previous: number };
}

interface CategoryComparisonItem {
    name: string;
    current: number;
    previous: number;
    change: number;
    trend: string;
}

interface MonthData {
    value: string;
    label: string;
}

interface StatsPeriodComparisonProps {
    activeTab: "monthly" | "yearly";
    // Monthly props
    monthlyComparison: ComparisonData;
    selectedMonth: string;
    previousMonth: string;
    comparisonMonth: string | undefined;
    setComparisonMonth: (month: string | undefined) => void;
    dailyCumulativeExpenses: Array<{ day: number; cumulative: number }>;
    previousMonthCumulativeExpenses: Array<{ day: number; cumulative: number }>;
    categoryComparison: CategoryComparisonItem[];
    // Yearly props
    yearlyComparison: ComparisonData;
    selectedYear: string;
    previousYear: string;
    comparisonYear: string | undefined;
    setComparisonYear: (year: string | undefined) => void;
    yearlyCumulativeExpenses: Array<{ month: string; cumulative: number }>;
    previousYearCumulativeExpenses: Array<{ month: string; cumulative: number }>;
    // Shared
    months: MonthData[];
    years: string[];
    dateLocale: Locale;
}

export function StatsPeriodComparison({
    activeTab,
    monthlyComparison,
    selectedMonth,
    previousMonth,
    comparisonMonth,
    setComparisonMonth,
    dailyCumulativeExpenses,
    previousMonthCumulativeExpenses,
    categoryComparison,
    yearlyComparison,
    selectedYear,
    previousYear,
    comparisonYear,
    setComparisonYear,
    yearlyCumulativeExpenses,
    previousYearCumulativeExpenses,
    months,
    years,
    dateLocale,
}: StatsPeriodComparisonProps) {
    const { t } = useTranslation();

    const comparison = activeTab === "monthly" ? monthlyComparison : yearlyComparison;
    const periodPrevious = activeTab === "monthly" ? previousMonth : previousYear;

    const renderComparisonGrid = () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* Income Comparison */}
            <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t("income")}</div>
                <div className="text-xl font-bold">
                    €{comparison.income.current.toFixed(0)}
                </div>
                <div
                    className={`text-xs flex items-center gap-1 ${comparison.income.trend === "up" ? "text-green-500" : "text-red-500"
                        }`}
                >
                    {comparison.income.trend === "up" ? (
                        <ArrowUp className="h-3 w-3" />
                    ) : (
                        <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(comparison.income.change).toFixed(1)}%
                </div>
            </div>
            {/* Expense Comparison */}
            <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t("expense")}</div>
                <div className="text-xl font-bold">
                    €{comparison.expense.current.toFixed(0)}
                </div>
                <div
                    className={`text-xs flex items-center gap-1 ${comparison.expense.trend === "up" ? "text-green-500" : "text-red-500"
                        }`}
                >
                    {comparison.expense.current <= comparison.expense.previous ? (
                        <ArrowDown className="h-3 w-3" />
                    ) : (
                        <ArrowUp className="h-3 w-3" />
                    )}
                    {Math.abs(comparison.expense.change).toFixed(1)}%
                </div>
            </div>
            {/* Balance Comparison */}
            <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t("balance")}</div>
                <div
                    className={`text-xl font-bold ${comparison.balance.current >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                >
                    €{comparison.balance.current.toFixed(0)}
                </div>
                <div
                    className={`text-xs flex items-center gap-1 ${comparison.balance.trend === "up" ? "text-green-500" : "text-red-500"
                        }`}
                >
                    {comparison.balance.trend === "up" ? (
                        <ArrowUp className="h-3 w-3" />
                    ) : (
                        <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(comparison.balance.change).toFixed(1)}%
                </div>
            </div>
            {/* Saving Rate Comparison */}
            <div className="space-y-1">
                <div className="text-sm text-muted-foreground">{t("saving_rate")}</div>
                <div
                    className={`text-xl font-bold ${comparison.savingRate.current >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                >
                    {comparison.savingRate.current.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">
                    {t("previous")}: {comparison.savingRate.previous.toFixed(1)}%
                </div>
            </div>
        </div>
    );

    if (activeTab === "monthly") {
        return (
            <>
                <Card className="min-w-0">
                    <CardHeader>
                        <CardTitle>{t("period_comparison")}</CardTitle>
                        <CardDescription>
                            {t("comparison_vs_previous_month", {
                                current: format(new Date(selectedMonth), "MMMM", {
                                    locale: dateLocale,
                                }),
                                previous: format(new Date(periodPrevious), "MMMM", {
                                    locale: dateLocale,
                                }),
                            })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Comparison month selector */}
                        <div className="flex flex-wrap gap-4 mb-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium">{t("compare_with")}</label>
                                <div className="flex gap-2">
                                    <Select
                                        value={
                                            comparisonMonth?.split("-")[1] ||
                                            previousMonth.split("-")[1]
                                        }
                                        onValueChange={(value) => {
                                            const year =
                                                comparisonMonth?.split("-")[0] ||
                                                previousMonth.split("-")[0];
                                            setComparisonMonth(`${year}-${value}`);
                                        }}
                                    >
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder={t("previous_month")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {months.map((month) => (
                                                <SelectItem key={month.value} value={month.value}>
                                                    {month.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select
                                        value={
                                            comparisonMonth?.split("-")[0] ||
                                            previousMonth.split("-")[0]
                                        }
                                        onValueChange={(year) => {
                                            const month =
                                                comparisonMonth?.split("-")[1] ||
                                                previousMonth.split("-")[1];
                                            setComparisonMonth(`${year}-${month}`);
                                        }}
                                    >
                                        <SelectTrigger className="w-[100px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {years.map((year) => (
                                                <SelectItem key={year} value={year}>
                                                    {year}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {renderComparisonGrid()}

                        {/* Cumulative Expense Comparison Chart */}
                        {dailyCumulativeExpenses.length > 0 && (
                            <div className="mt-6">
                                <h4 className="text-sm font-medium mb-4">
                                    {t("cumulative_expenses_comparison")}
                                </h4>
                                <LazyChart height={250}>
                                    <ChartContainer
                                        config={{
                                            current: {
                                                label: t("current_month"),
                                                color: "hsl(0 84.2% 60.2% )",
                                            },
                                            previous: {
                                                label: format(new Date(previousMonth), "MMMM yyyy", {
                                                    locale: dateLocale,
                                                }),
                                                color: "hsl(var(--muted-foreground))",
                                            },
                                        }}
                                        className="h-[250px] w-full aspect-auto"
                                    >
                                        <AreaChart
                                            data={dailyCumulativeExpenses.map((d, i) => {
                                                const prevMonthData = previousMonthCumulativeExpenses[i];
                                                return {
                                                    day: d.day,
                                                    current: d.cumulative,
                                                    previous: prevMonthData?.cumulative,
                                                };
                                            })}
                                            margin={{ left: -5, right: 0, top: 12, bottom: 12 }}
                                        >
                                            <defs>
                                                <linearGradient
                                                    id="currentGradient"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="5%"
                                                        stopColor="var(--color-current)"
                                                        stopOpacity={0.8}
                                                    />
                                                    <stop
                                                        offset="95%"
                                                        stopColor="var(--color-current)"
                                                        stopOpacity={0.1}
                                                    />
                                                </linearGradient>
                                                <linearGradient
                                                    id="previousGradient"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="5%"
                                                        stopColor="var(--color-previous)"
                                                        stopOpacity={0.6}
                                                    />
                                                    <stop
                                                        offset="95%"
                                                        stopColor="var(--color-previous)"
                                                        stopOpacity={0.1}
                                                    />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="day" />
                                            <YAxis tickFormatter={(v) => `€${v}`} />
                                            <ChartTooltip
                                                content={
                                                    <ChartTooltipContent
                                                        valueFormatter={(value) =>
                                                            `€${Number(value).toLocaleString()}`
                                                        }
                                                    />
                                                }
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="previous"
                                                stroke="var(--color-previous)"
                                                fill="url(#previousGradient)"
                                                strokeDasharray="5 5"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="current"
                                                stroke="var(--color-current)"
                                                fill="url(#currentGradient)"
                                            />
                                            <ChartLegend content={<ChartLegendContent />} />
                                        </AreaChart>
                                    </ChartContainer>
                                </LazyChart>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Category Comparison */}
                {categoryComparison.length > 0 && (
                    <Card className="min-w-0">
                        <CardHeader>
                            <CardTitle>{t("category_comparison")}</CardTitle>
                            <CardDescription>{t("category_comparison_desc")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-4 mb-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium">{t("compare_with")}</label>
                                    <div className="flex gap-2">
                                        <Select
                                            value={
                                                comparisonMonth?.split("-")[1] ||
                                                previousMonth.split("-")[1]
                                            }
                                            onValueChange={(value) => {
                                                const year =
                                                    comparisonMonth?.split("-")[0] ||
                                                    previousMonth.split("-")[0];
                                                setComparisonMonth(`${year}-${value}`);
                                            }}
                                        >
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue placeholder={t("previous_month")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {months.map((month) => (
                                                    <SelectItem key={month.value} value={month.value}>
                                                        {month.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={
                                                comparisonMonth?.split("-")[0] ||
                                                previousMonth.split("-")[0]
                                            }
                                            onValueChange={(year) => {
                                                const month =
                                                    comparisonMonth?.split("-")[1] ||
                                                    previousMonth.split("-")[1];
                                                setComparisonMonth(`${year}-${month}`);
                                            }}
                                        >
                                            <SelectTrigger className="w-[100px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {years.map((year) => (
                                                    <SelectItem key={year} value={year}>
                                                        {year}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {categoryComparison.slice(0, 8).map((cat) => (
                                    <div
                                        key={cat.name}
                                        className="flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{cat.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-muted-foreground">
                                                €{cat.previous.toFixed(0)} → €{cat.current.toFixed(0)}
                                            </span>
                                            <div
                                                className={`flex items-center gap-1 text-sm ${cat.trend === "improved"
                                                    ? "text-green-500"
                                                    : "text-red-500"
                                                    }`}
                                            >
                                                {cat.trend === "improved" ? (
                                                    <ArrowDown className="h-3 w-3" />
                                                ) : (
                                                    <ArrowUp className="h-3 w-3" />
                                                )}
                                                {Math.abs(cat.change).toFixed(0)}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </>
        );
    }

    // Yearly comparison view
    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle>{t("yearly_comparison")}</CardTitle>
                <CardDescription>
                    {t("comparison_vs_previous_year", {
                        current: selectedYear,
                        previous: previousYear,
                    })}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Comparison year selector */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">{t("compare_with")}</label>
                        <Select
                            value={comparisonYear || previousYear}
                            onValueChange={setComparisonYear}
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((year) => (
                                    <SelectItem key={year} value={year}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {renderComparisonGrid()}

                {/* Cumulative Expense Comparison Chart - Yearly */}
                {yearlyCumulativeExpenses.length > 0 && (
                    <div className="mt-6">
                        <h4 className="text-sm font-medium mb-4">
                            {t("cumulative_expenses_yearly")}
                        </h4>
                        <LazyChart height={250}>
                            <ChartContainer
                                config={{
                                    current: {
                                        label: selectedYear,
                                        color: "hsl(0 84.2% 60.2%)",
                                    },
                                    previous: {
                                        label: previousYear,
                                        color: "hsl(var(--muted-foreground))",
                                    },
                                }}
                                className="h-[250px] w-full aspect-auto"
                            >
                                <AreaChart
                                    data={yearlyCumulativeExpenses.map((d, i) => {
                                        const prevYearData = previousYearCumulativeExpenses[i];
                                        return {
                                            month: d.month,
                                            current: d.cumulative,
                                            previous: prevYearData?.cumulative,
                                        };
                                    })}
                                    margin={{ left: -5, right: 0, top: 12, bottom: 12 }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="currentYearlyGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="var(--color-current)"
                                                stopOpacity={0.8}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="var(--color-current)"
                                                stopOpacity={0.1}
                                            />
                                        </linearGradient>
                                        <linearGradient
                                            id="previousYearlyGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="var(--color-previous)"
                                                stopOpacity={0.6}
                                            />
                                            <stop
                                                offset="95%"
                                                stopColor="var(--color-previous)"
                                                stopOpacity={0.1}
                                            />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(value) => value.substring(0, 3)}
                                        interval={yearlyCumulativeExpenses.length > 9 ? 1 : 0}
                                    />
                                    <YAxis tickFormatter={(v) => `€${v}`} />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                valueFormatter={(value) =>
                                                    `€${Number(value).toLocaleString()}`
                                                }
                                            />
                                        }
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="previous"
                                        stroke="var(--color-previous)"
                                        fill="url(#previousYearlyGradient)"
                                        strokeDasharray="5 5"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="current"
                                        stroke="var(--color-current)"
                                        fill="url(#currentYearlyGradient)"
                                    />
                                    <ChartLegend content={<ChartLegendContent />} />
                                </AreaChart>
                            </ChartContainer>
                        </LazyChart>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
