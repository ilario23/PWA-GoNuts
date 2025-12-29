import { useState, useMemo, startTransition, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStatistics } from "@/hooks/useStatistics";
import { useGroups } from "@/hooks/useGroups";
import { useSettings } from "@/hooks/useSettings";
import { useAvailableYears } from "@/hooks/useAvailableYears";

import { LazyChart } from "@/components/LazyChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  PieChart,
  Pie,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  ComposedChart,
  AreaChart,
  Area,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useTranslation } from "react-i18next";
import {
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthProvider";
import { StatsSummaryCards } from "@/components/statistics/StatsSummaryCards";
import { StatsBurnRateCard } from "@/components/statistics/StatsBurnRateCard";
import { StatsContextAnalytics } from "@/components/statistics/StatsContextAnalytics";
import { StatsCategoryDistribution } from "@/components/statistics/StatsCategoryDistribution";
import { StatsExpenseBreakdown } from "@/components/statistics/StatsExpenseBreakdown";
import { StatsContextTrends } from "@/components/statistics/StatsContextTrends";
import { StatsGroupBalances } from "@/components/statistics/StatsGroupBalances";
import { StatsBudgetHealth } from "@/components/statistics/StatsBudgetHealth";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export function StatisticsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { settings } = useSettings();
  const dateLocale = i18n.language === "it" ? it : enUS;
  const now = new Date();
  const navigate = useNavigate();
  const { groups, isLoading: isGroupsLoading } = useGroups();
  const [searchParams, setSearchParams] = useSearchParams();
  const contexts = useLiveQuery(() => db.contexts.toArray());

  // State for filters
  const [selectedMonth, setSelectedMonth] = useState(format(now, "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState(format(now, "yyyy"));
  const [activeTab, setActiveTab] = useState<"monthly" | "yearly">("monthly");

  // Group filtering derived from URL
  const groupIdParam = searchParams.get('group');
  const isValidGroup = useMemo(() => {
    if (!groupIdParam) return true;
    if (isGroupsLoading || !groups) return true; // Assume valid while loading
    return groups.some(g => g.id === groupIdParam);
  }, [groupIdParam, groups, isGroupsLoading]);

  const selectedGroupId = (isValidGroup && groupIdParam) ? groupIdParam : null;

  // Cleanup invalid group ID
  useEffect(() => {
    if (groupIdParam && !isGroupsLoading && !isValidGroup) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('group');
        return newParams;
      }, { replace: true });
    }
  }, [groupIdParam, isGroupsLoading, isValidGroup, setSearchParams]);

  // State for comparison period selection
  const [comparisonMonth, setComparisonMonth] = useState<string | undefined>(
    undefined
  );
  const [comparisonYear, setComparisonYear] = useState<string | undefined>(
    undefined
  );

  // State for flip cards (yearly view) - which cards show monthly average
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const toggleCard = (cardId: string) => {
    setFlippedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  // Get statistics based on current selection - pass mode for lazy calculation
  const {
    monthlyStats,
    monthlyNetBalance,
    monthlyCategoryPercentages,
    yearlyStats,
    yearlyNetBalance,
    yearlyCategoryPercentages,
    monthlyExpenses,
    monthlyIncome,
    monthlyInvestments,
    monthlyTrendData,
    monthlyCashFlow,
    contextStats,
    burnRate,
    yearlyBurnRate,
    // Comparison data
    previousMonth,
    previousYear,
    dailyCumulativeExpenses,
    previousMonthCumulativeExpenses,
    yearlyCumulativeExpenses,
    previousYearCumulativeExpenses,
    monthlyComparison,
    yearlyComparison,
    categoryComparison,
    monthlyExpensesByHierarchy,
    yearlyExpensesByHierarchy,
    monthlyContextTrends,
    groupBalances,
    monthlyBudgetHealth,
  } = useStatistics({
    selectedMonth,
    selectedYear,
    comparisonMonth,
    comparisonYear,
    mode: activeTab,
    groupId: selectedGroupId || undefined,  // Filter by group if selected
    userId: user?.id,  // Pass userId for share calculation
  });


  // Get selected group name for display
  const selectedGroup = groups?.find(g => g.id === selectedGroupId);

  // #4 - Loading state: data is loading if currentStats haven't been calculated yet
  const isLoading =
    activeTab === "monthly"
      ? monthlyStats.income === 0 &&
      monthlyStats.expense === 0 &&
      monthlyStats.investment === 0
      : yearlyStats.income === 0 &&
      yearlyStats.expense === 0 &&
      yearlyStats.investment === 0;

  // Determine which stats to display based on active tab
  const currentStats = activeTab === "monthly" ? monthlyStats : yearlyStats;
  const currentNetBalance =
    activeTab === "monthly" ? monthlyNetBalance : yearlyNetBalance;
  const currentCategoryPercentages =
    activeTab === "monthly"
      ? monthlyCategoryPercentages
      : yearlyCategoryPercentages;
  const currentExpensesByHierarchy =
    activeTab === "monthly"
      ? monthlyExpensesByHierarchy
      : yearlyExpensesByHierarchy;



  const chartConfig = {
    income: {
      label: t("income"),
      color: "var(--color-income)",
    },
    expense: {
      label: t("expense"),
      color: "var(--color-expense)",
    },
    investment: {
      label: t("investment"),
      color: "var(--color-investment)",
    },
  } satisfies ChartConfig;

  // Pie chart data
  const pieData = [
    {
      name: "income",
      value: currentStats.income,
      fill: "hsl(142.1 70.6% 45.3%)",
    },
    {
      name: "expense",
      value: currentStats.expense,
      fill: "hsl(0 84.2% 60.2%)",
    },
    {
      name: "investment",
      value: currentStats.investment,
      fill: "hsl(217.2 91.2% 59.8%)",
    },
  ].filter((item) => item.value > 0);



  // Get available years from database
  const years = useAvailableYears();

  // Generate months
  const months = [
    { value: "01", label: t("january") },
    { value: "02", label: t("february") },
    { value: "03", label: t("march") },
    { value: "04", label: t("april") },
    { value: "05", label: t("may") },
    { value: "06", label: t("june") },
    { value: "07", label: t("july") },
    { value: "08", label: t("august") },
    { value: "09", label: t("september") },
    { value: "10", label: t("october") },
    { value: "11", label: t("november") },
    { value: "12", label: t("december") },
  ];

  const handleMonthChange = (monthValue: string) => {
    setSelectedMonth(`${selectedYear}-${monthValue}`);
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (activeTab === "monthly") {
      const currentMonthPart = selectedMonth.split("-")[1];
      setSelectedMonth(`${year}-${currentMonthPart}`);
    }
  };

  // Calculate monthly averages for yearly view
  // Uses months with actual data, not always 12
  const yearlyMonthlyAverages = useMemo(() => {
    const monthsWithData = monthlyTrendData.filter(
      (m) => m.income > 0 || m.expense > 0
    ).length;
    const divisor = Math.max(monthsWithData, 1);

    return {
      income: yearlyStats.income / divisor,
      expense: yearlyStats.expense / divisor,
      investment: yearlyStats.investment / divisor,
      netBalance: yearlyNetBalance / divisor,
      monthCount: monthsWithData,
    };
  }, [yearlyStats, yearlyNetBalance, monthlyTrendData]);

  return (
    <div className="space-y-6" >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {selectedGroup
            ? t("statistics_group_title", { groupName: selectedGroup.name })
            : t("statistics")}
        </h1>
        {selectedGroupId && (
          <Button
            variant="ghost"
            onClick={() => navigate("/groups")}
            className="text-muted-foreground"
          >
            {t("back_to_groups")}
          </Button>
        )}
      </div>

      {/* Tabs and filters always visible at the top */}
      <Tabs
        value={activeTab}
        onValueChange={(value: string) =>
          startTransition(() => setActiveTab(value as "monthly" | "yearly"))
        }
      >
        <TabsList className="grid w-full grid-cols-2 mb-4 dark:bg-primary/20">
          <TabsTrigger value="monthly">{t("monthly_statistics")}</TabsTrigger>
          <TabsTrigger value="yearly">{t("yearly_statistics")}</TabsTrigger>
        </TabsList>

        {/* Filters - Always visible based on selected tab */}
        {
          activeTab === "monthly" ? (
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex flex-col gap-2 min-w-[180px]">
                <label className="text-sm font-medium">{t("select_month")}</label>
                <Select
                  value={selectedMonth.split("-")[1]}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 min-w-[140px]">
                <label className="text-sm font-medium">{t("select_year")}</label>
                <Select value={selectedYear} onValueChange={handleYearChange}>
                  <SelectTrigger>
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
          ) : (
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex flex-col gap-2 min-w-[140px]">
                <label className="text-sm font-medium">{t("select_year")}</label>
                <Select value={selectedYear} onValueChange={handleYearChange}>
                  <SelectTrigger>
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
          )
        }

        {/* Group Filter Dropdown REMOVED as per user request */}
        {/* The page now behaves as a dedicated view when accessed from a group card */}
      </Tabs >

      {/* Summary Cards - using extracted component */}
      <StatsSummaryCards
        activeTab={activeTab}
        currentStats={currentStats}
        currentNetBalance={currentNetBalance}
        yearlyMonthlyAverages={yearlyMonthlyAverages}
        flippedCards={flippedCards}
        toggleCard={toggleCard}
      />

      {/* Charts based on selected tab */}
      {
        activeTab === "monthly" ? (
          <div className="space-y-4">
            {/* Monthly Charts */}
            <div className="grid gap-4 md:grid-cols-2 min-w-0">
              {/* Pie Chart - Income vs Expense */}
              <Card className="flex flex-col min-w-0">
                <CardHeader className="items-center pb-0">
                  <CardTitle>{t("income_vs_expense")}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-0 min-w-0">
                  <LazyChart height={300} isLoading={isLoading}>
                    <ChartContainer
                      config={chartConfig}
                      className="mx-auto aspect-square max-w-full md:max-w-[280px] max-h-[300px] min-h-[250px] w-full [&_.recharts-text]:fill-foreground"
                    >
                      <PieChart>
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          strokeWidth={5}
                        />
                        <ChartLegend
                          content={
                            <ChartLegendContent className="flex-wrap gap-2" />
                          }
                        />
                      </PieChart>
                    </ChartContainer>
                  </LazyChart>
                </CardContent>
              </Card>

              {/* Category Distribution - Hybrid Component */}
              <StatsCategoryDistribution
                categoryData={currentCategoryPercentages.map(c => ({ ...c, amount: c.value, fill: c.color }))}
                isLoading={isLoading}
              />

              {/* Expense Breakdown - Expandable Cards Component */}
              <StatsExpenseBreakdown
                expensesByHierarchy={currentExpensesByHierarchy}
                totalExpense={currentStats.expense}
                isLoading={isLoading}
              />
            </div>

            {/* Burn Rate / Spending Projection Card */}
            {settings?.monthly_budget && settings.monthly_budget > 0 && (
              <StatsBurnRateCard
                spending={monthlyStats.expense}
                budget={settings.monthly_budget}
                periodName={format(new Date(selectedMonth), "MMMM yyyy", { locale: dateLocale })}
                daysInPeriod={new Date(parseInt(selectedMonth.split("-")[0]), parseInt(selectedMonth.split("-")[1]), 0).getDate()}
                daysElapsed={burnRate.daysElapsed}
                daysRemaining={burnRate.daysRemaining}
                isLoading={isLoading}
              />
            )}

            {/* Period Comparison Section - Monthly */}
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>{t("period_comparison")}</CardTitle>
                <CardDescription>
                  {t("comparison_vs_previous_month", {
                    current: format(new Date(selectedMonth), "MMMM", { locale: dateLocale }),
                    previous: format(new Date(previousMonth), "MMMM", { locale: dateLocale }),
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Comparison month selector */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">
                      {t("compare_with")}
                    </label>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {/* Income Comparison */}
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {t("income")}
                    </div>
                    <div className="text-xl font-bold">
                      €{monthlyComparison.income.current.toFixed(0)}
                    </div>
                    <div
                      className={`text-xs flex items-center gap-1 ${monthlyComparison.income.trend === "up"
                        ? "text-green-500"
                        : "text-red-500"
                        }`}
                    >
                      {monthlyComparison.income.trend === "up" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {Math.abs(monthlyComparison.income.change).toFixed(1)}%
                    </div>
                  </div>
                  {/* Expense Comparison */}
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {t("expense")}
                    </div>
                    <div className="text-xl font-bold">
                      €{monthlyComparison.expense.current.toFixed(0)}
                    </div>
                    <div
                      className={`text-xs flex items-center gap-1 ${monthlyComparison.expense.trend === "up"
                        ? "text-green-500"
                        : "text-red-500"
                        }`}
                    >
                      {monthlyComparison.expense.current <=
                        monthlyComparison.expense.previous ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )}
                      {Math.abs(monthlyComparison.expense.change).toFixed(1)}%
                    </div>
                  </div>
                  {/* Balance Comparison */}
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {t("balance")}
                    </div>
                    <div
                      className={`text-xl font-bold ${monthlyComparison.balance.current >= 0
                        ? "text-green-500"
                        : "text-red-500"
                        }`}
                    >
                      €{monthlyComparison.balance.current.toFixed(0)}
                    </div>
                    <div
                      className={`text-xs flex items-center gap-1 ${monthlyComparison.balance.trend === "up"
                        ? "text-green-500"
                        : "text-red-500"
                        }`}
                    >
                      {monthlyComparison.balance.trend === "up" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {Math.abs(monthlyComparison.balance.change).toFixed(1)}%
                    </div>
                  </div>
                  {/* Saving Rate Comparison */}
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {t("saving_rate")}
                    </div>
                    <div
                      className={`text-xl font-bold ${monthlyComparison.savingRate.current >= 0
                        ? "text-green-500"
                        : "text-red-500"
                        }`}
                    >
                      {monthlyComparison.savingRate.current.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("previous")}:{" "}
                      {monthlyComparison.savingRate.previous.toFixed(1)}%
                    </div>
                  </div>
                </div>

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
                            label: format(new Date(previousMonth), "MMMM yyyy", { locale: dateLocale }),
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
                          <ChartTooltip content={<ChartTooltipContent valueFormatter={(value) => `€${Number(value).toLocaleString()}`} />} />
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
                  <CardDescription>
                    {t("category_comparison_desc")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Comparison month selector for categories */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        {t("compare_with")}
                      </label>
                      <div className="flex gap-2">
                        <Select
                          value={comparisonMonth?.split("-")[1] || previousMonth.split("-")[1]}
                          onValueChange={(value) => {
                            const year =
                              comparisonMonth?.split("-")[0] || previousMonth.split("-")[0];
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
                          value={comparisonMonth?.split("-")[0] || previousMonth.split("-")[0]}
                          onValueChange={(year) => {
                            const month = comparisonMonth?.split("-")[1] || previousMonth.split("-")[1];
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
                            {t("trend_value", { previous: cat.previous.toFixed(0), current: cat.current.toFixed(0) })}
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
          </div>
        ) : (
          <div className="space-y-4">
            {/* Radar Charts Row */}
            <div className="grid gap-4 md:grid-cols-3 min-w-0">
              {/* Expenses Radar Chart */}
              <Card className="flex flex-col min-w-0">
                <CardHeader className="items-center pb-4">
                  <CardTitle>{t("yearly_expenses")}</CardTitle>
                  <CardDescription>{t("yearly_expenses_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="pb-0">
                  {monthlyExpenses.length > 0 ? (
                    <LazyChart height={250}>
                      <ChartContainer
                        config={{
                          value: {
                            label: t("expense"),
                            color: "hsl(var(--color-expense))",
                          },
                        }}
                        className="mx-auto aspect-square max-h-[250px]"
                      >
                        <RadarChart data={monthlyExpenses}>
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                          />
                          <PolarAngleAxis dataKey="month" />
                          <PolarGrid />
                          <Radar
                            dataKey="value"
                            fill="var(--color-value)"
                            fillOpacity={0.6}
                          />
                        </RadarChart>
                      </ChartContainer>
                    </LazyChart>
                  ) : (
                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                      {t("no_data")}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex-col gap-2 text-sm pt-4">
                  <div className="text-muted-foreground text-center leading-none">
                    {selectedYear}
                  </div>
                </CardFooter>
              </Card>

              {/* Income Radar Chart */}
              <Card className="flex flex-col min-w-0">
                <CardHeader className="items-center pb-4">
                  <CardTitle>{t("yearly_income")}</CardTitle>
                  <CardDescription>{t("yearly_income_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="pb-0">
                  {monthlyIncome.length > 0 ? (
                    <LazyChart height={250}>
                      <ChartContainer
                        config={{
                          value: {
                            label: t("income"),
                            color: "hsl(var(--color-income))",
                          },
                        }}
                        className="mx-auto aspect-square max-h-[250px]"
                      >
                        <RadarChart data={monthlyIncome}>
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                          />
                          <PolarAngleAxis dataKey="month" />
                          <PolarGrid />
                          <Radar
                            dataKey="value"
                            fill="var(--color-value)"
                            fillOpacity={0.6}
                          />
                        </RadarChart>
                      </ChartContainer>
                    </LazyChart>
                  ) : (
                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                      {t("no_data")}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex-col gap-2 text-sm pt-4">
                  <div className="text-muted-foreground text-center leading-none">
                    {selectedYear}
                  </div>
                </CardFooter>
              </Card>

              {/* Investments Radar Chart */}
              <Card className="flex flex-col min-w-0">
                <CardHeader className="items-center pb-4">
                  <CardTitle>{t("yearly_investments")}</CardTitle>
                  <CardDescription>
                    {t("yearly_investments_desc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-0">
                  {monthlyInvestments.length > 0 ? (
                    <LazyChart height={250}>
                      <ChartContainer
                        config={{
                          value: {
                            label: t("investment"),
                            color: "hsl(var(--color-investment))",
                          },
                        }}
                        className="mx-auto aspect-square max-h-[250px]"
                      >
                        <RadarChart data={monthlyInvestments}>
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                          />
                          <PolarAngleAxis dataKey="month" />
                          <PolarGrid />
                          <Radar
                            dataKey="value"
                            fill="var(--color-value)"
                            fillOpacity={0.6}
                          />
                        </RadarChart>
                      </ChartContainer>
                    </LazyChart>
                  ) : (
                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                      {t("no_data")}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex-col gap-2 text-sm pt-4">
                  <div className="text-muted-foreground text-center leading-none">
                    {selectedYear}
                  </div>
                </CardFooter>
              </Card>
            </div>

            {/* Category Distribution & Expense Breakdown Row */}
            <div className="grid gap-4 md:grid-cols-2 min-w-0">
              {/* Category Distribution - Hybrid Component (Yearly) */}
              <StatsCategoryDistribution
                categoryData={yearlyCategoryPercentages.map(c => ({ ...c, amount: c.value, fill: c.color }))}
                isLoading={false}
              />

              {/* Expense Breakdown - Expandable Cards Component (Yearly) */}
              <StatsExpenseBreakdown
                expensesByHierarchy={currentExpensesByHierarchy}
                totalExpense={currentStats.expense}
                isLoading={false}
              />
            </div>

            {/* Period Comparison Section - Yearly */}
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
              <CardContent className="min-w-0">
                {/* Comparison year selector */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">
                      {t("compare_with")}
                    </label>
                    <Select
                      value={comparisonYear || previousYear}
                      onValueChange={(value) => {
                        setComparisonYear(value);
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder={previousYear} />
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {/* Income Comparison */}
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {t("income")}
                    </div>
                    <div className="text-xl font-bold">
                      €{yearlyComparison.income.current.toFixed(0)}
                    </div>
                    <div
                      className={`text-xs flex items-center gap-1 ${yearlyComparison.income.trend === "up"
                        ? "text-green-500"
                        : "text-red-500"
                        }`}
                    >
                      {yearlyComparison.income.trend === "up" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {Math.abs(yearlyComparison.income.change).toFixed(1)}%
                    </div>
                  </div>
                  {/* Expense Comparison */}
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {t("expense")}
                    </div>
                    <div className="text-xl font-bold">
                      €{yearlyComparison.expense.current.toFixed(0)}
                    </div>
                    <div
                      className={`text-xs flex items-center gap-1 ${yearlyComparison.expense.trend === "up"
                        ? "text-green-500"
                        : "text-red-500"
                        }`}
                    >
                      {yearlyComparison.expense.current <=
                        yearlyComparison.expense.previous ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      )}
                      {Math.abs(yearlyComparison.expense.change).toFixed(1)}%
                    </div>
                  </div>
                  {/* Balance Comparison */}
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {t("balance")}
                    </div>
                    <div
                      className={`text-xl font-bold ${yearlyComparison.balance.current >= 0
                        ? "text-green-500"
                        : "text-red-500"
                        }`}
                    >
                      €{yearlyComparison.balance.current.toFixed(0)}
                    </div>
                    <div
                      className={`text-xs flex items-center gap-1 ${yearlyComparison.balance.trend === "up"
                        ? "text-green-500"
                        : "text-red-500"
                        }`}
                    >
                      {yearlyComparison.balance.trend === "up" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {Math.abs(yearlyComparison.balance.change).toFixed(1)}%
                    </div>
                  </div>
                  {/* Saving Rate Comparison */}
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">
                      {t("saving_rate")}
                    </div>
                    <div
                      className={`text-xl font-bold ${yearlyComparison.savingRate.current >= 0
                        ? "text-green-500"
                        : "text-red-500"
                        }`}
                    >
                      {yearlyComparison.savingRate.current.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("previous")}:{" "}
                      {yearlyComparison.savingRate.previous.toFixed(1)}%
                    </div>
                  </div>
                </div>

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
                            content={<ChartTooltipContent valueFormatter={(value) => `€${Number(value).toLocaleString()}`} />}
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
          </div>
        )
      }

      <div className="space-y-4">
        {/* === NEW CHARTS SECTION === */}

        {/* Temporal Trend Chart (Line/Area) */}
        {activeTab === "yearly" && (
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>{t("temporal_trend")}</CardTitle>
              <CardDescription>{t("temporal_trend_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyTrendData.length > 0 ? (
                <LazyChart height={350}>
                  <ChartContainer
                    config={{
                      income: {
                        label: t("income"),
                        color: "hsl(142.1 70.6% 45.3%)",
                      },
                      expense: {
                        label: t("expense"),
                        color: "hsl(0 84.2% 60.2%)",
                      },
                      balance: {
                        label: t("balance"),
                        color: "hsl(217.2 91.2% 59.8%)",
                      },
                    }}
                    className="h-[350px] w-full min-w-0 aspect-auto"
                  >
                    <AreaChart
                      data={monthlyTrendData}
                      margin={{ left: -5, right: 0, top: 12, bottom: 12 }}
                    >
                      <defs>
                        <linearGradient
                          id="incomeGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-income)"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-income)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="expenseGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-expense)"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-expense)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="balanceGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-balance)"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-balance)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => value.substring(0, 3)}
                        interval={monthlyTrendData.length > 9 ? 1 : 0}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `€${value}`}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent valueFormatter={(value) => `€${Number(value).toLocaleString()}`} />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="var(--color-income)"
                        fill="url(#incomeGradient)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="var(--color-expense)"
                        fill="url(#expenseGradient)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="var(--color-balance)"
                        fill="url(#balanceGradient)"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </AreaChart>
                  </ChartContainer>
                </LazyChart>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  {t("no_data")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Cash Flow Chart (Stacked Bar) */}
        {activeTab === "yearly" && (
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>{t("cash_flow")}</CardTitle>
              <CardDescription>{t("cash_flow_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {activeTab === "yearly" && monthlyCashFlow.length > 0 ? (
                <LazyChart height={300}>
                  <ChartContainer
                    config={{
                      income: {
                        label: t("income"),
                        color: "hsl(142.1 70.6% 45.3%)",
                      },
                      expense: {
                        label: t("expense"),
                        color: "hsl(0 84.2% 60.2%)",
                      },
                    }}
                    className="h-[300px] w-full min-w-0 aspect-auto"
                  >
                    <ComposedChart
                      data={monthlyCashFlow}
                      margin={{ left: -5, right: 0, top: 12, bottom: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="period"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(value) => value.substring(0, 3)}
                        interval={monthlyCashFlow.length > 9 ? 1 : 0}
                      />
                      <YAxis />
                      <ChartTooltip
                        content={<ChartTooltipContent valueFormatter={(value) => `€${Number(value).toLocaleString()}`} />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="income"
                        fill="hsl(142.1 70.6% 45.3%)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="expense"
                        fill="hsl(0 84.2% 60.2%)"
                        radius={[4, 4, 0, 0]}
                      />
                    </ComposedChart>
                  </ChartContainer>
                </LazyChart>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  {t("no_data")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Context Analytics - using extracted component */}
        <StatsContextAnalytics contextStats={contextStats} />



        {/* Group Balances - Only if group selected */}
        {selectedGroupId && groupBalances.length > 0 && (
          <StatsGroupBalances
            data={groupBalances}
            isLoading={isLoading}
          />
        )}

        {/* Context Trend Chart - Yearly Only */}
        {activeTab === "yearly" && (
          <StatsContextTrends
            data={monthlyContextTrends}
            contexts={contexts}
            isLoading={isLoading}
          />
        )}

        {/* Budget Health - Monthly Only */}
        {activeTab === "monthly" && monthlyBudgetHealth.length > 0 && (
          <StatsBudgetHealth data={monthlyBudgetHealth} />
        )}

        {/* Burn Rate / Spending Projection Card - Yearly */}
        {activeTab === "yearly" && settings?.monthly_budget && settings.monthly_budget > 0 && (
          <StatsBurnRateCard
            spending={yearlyStats.expense}
            budget={settings.monthly_budget * 12}
            periodName={selectedYear}
            daysInPeriod={yearlyBurnRate.daysElapsed + yearlyBurnRate.daysRemaining}
            daysElapsed={yearlyBurnRate.daysElapsed}
            daysRemaining={yearlyBurnRate.daysRemaining}
            isLoading={isLoading}
          />
        )}
      </div>
    </div >
  );
}
