import { useState } from "react";
import { useStatistics } from "@/hooks/useStatistics";
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
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  LineChart,
  Line,
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
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";

export function StatisticsPage() {
  const { t } = useTranslation();
  const now = new Date();

  // State for filters
  const [selectedMonth, setSelectedMonth] = useState(format(now, "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState(format(now, "yyyy"));
  const [activeTab, setActiveTab] = useState<"monthly" | "yearly">("monthly");

  // State for comparison period selection
  const [comparisonMonth, setComparisonMonth] = useState<string | undefined>(
    undefined
  );
  const [comparisonYear, setComparisonYear] = useState<string | undefined>(
    undefined
  );

  // Get statistics based on current selection
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
  } = useStatistics({
    selectedMonth,
    selectedYear,
    comparisonMonth,
    comparisonYear,
  });

  // Determine which stats to display based on active tab
  const currentStats = activeTab === "monthly" ? monthlyStats : yearlyStats;
  const currentNetBalance =
    activeTab === "monthly" ? monthlyNetBalance : yearlyNetBalance;
  const currentCategoryPercentages =
    activeTab === "monthly"
      ? monthlyCategoryPercentages
      : yearlyCategoryPercentages;

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

  // Bar chart data
  const barData = currentStats.byCategory.map((item, index) => ({
    ...item,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`, // Use chart colors for variety
  }));

  const sortedBarData = [...barData].sort((a, b) => b.value - a.value);

  // Create dynamic config for category charts (for legend)
  const categoryChartConfig = currentCategoryPercentages.reduce(
    (acc, item, index) => {
      acc[item.name] = {
        label: item.name,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      };
      return acc;
    },
    {} as ChartConfig
  );

  // Generate years for selector (last 5 years + current + next)
  const currentYearNum = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) =>
    (currentYearNum - 5 + i).toString()
  );

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("statistics")}</h1>

      {/* Tabs and filters always visible at the top */}
      <Tabs
        value={activeTab}
        onValueChange={(value: string) =>
          setActiveTab(value as "monthly" | "yearly")
        }
      >
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="monthly">{t("monthly_statistics")}</TabsTrigger>
          <TabsTrigger value="yearly">{t("yearly_statistics")}</TabsTrigger>
        </TabsList>

        {/* Filters - Always visible based on selected tab */}
        {activeTab === "monthly" ? (
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
        )}
      </Tabs>

      {/* Summary Cards - Always visible, dynamic content based on selected tab */}
      <div className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("total_income")}
            </CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
          </CardHeader>
          <CardContent className="pb-2 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-green-500">
              +€{currentStats.income.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("total_expenses")}
            </CardTitle>
            <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
          </CardHeader>
          <CardContent className="pb-2 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-red-500">
              -€{currentStats.expense.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("investment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2 md:pb-6">
            <div className="text-lg md:text-2xl font-bold text-blue-500">
              €{currentStats.investment.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("net_balance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2 md:pb-6">
            <div
              className={`text-lg md:text-2xl font-bold ${
                currentNetBalance >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {currentNetBalance >= 0 ? "+" : ""}€{currentNetBalance.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("saving_rate")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2 md:pb-6">
            {currentStats.income > 0 ? (
              <div
                className={`text-lg md:text-2xl font-bold ${
                  ((currentStats.income - currentStats.expense) /
                    currentStats.income) *
                    100 >=
                  0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {(
                  ((currentStats.income - currentStats.expense) /
                    currentStats.income) *
                  100
                ).toFixed(1)}
                %
              </div>
            ) : (
              <div className="text-lg md:text-2xl font-bold text-muted-foreground">
                -
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("saving_rate_with_investments")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2 md:pb-6">
            {currentStats.income > 0 ? (
              <div
                className={`text-lg md:text-2xl font-bold ${
                  ((currentStats.income -
                    currentStats.expense -
                    currentStats.investment) /
                    currentStats.income) *
                    100 >=
                  0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {(
                  ((currentStats.income -
                    currentStats.expense -
                    currentStats.investment) /
                    currentStats.income) *
                  100
                ).toFixed(1)}
                %
              </div>
            ) : (
              <div className="text-lg md:text-2xl font-bold text-muted-foreground">
                -
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts based on selected tab */}
      {activeTab === "monthly" ? (
        <div className="space-y-4">
          {/* Monthly Charts */}
          <div className="grid gap-4 md:grid-cols-2 min-w-0">
            {/* Pie Chart - Income vs Expense */}
            <Card className="flex flex-col min-w-0">
              <CardHeader className="items-center pb-0">
                <CardTitle>{t("income_vs_expense")}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pb-0 min-w-0">
                <ChartContainer
                  config={chartConfig}
                  className="mx-auto aspect-square max-w-[280px] max-h-[300px] min-h-[250px] w-full [&_.recharts-text]:fill-foreground"
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
              </CardContent>
            </Card>

            {/* Radial Chart - Category Distribution */}
            <Card className="flex flex-col min-w-0">
              <CardHeader className="items-center pb-0">
                <CardTitle>{t("category_distribution")}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pb-0 min-w-0">
                {currentCategoryPercentages.length > 0 ? (
                  <ChartContainer
                    config={categoryChartConfig}
                    className="mx-auto aspect-square max-w-[280px] max-h-[300px] min-h-[250px] w-full [&_.recharts-text]:fill-foreground"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={currentCategoryPercentages}
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
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    {t("no_data")}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Horizontal Bar Chart - Expense Breakdown */}
            <Card className="md:col-span-2 min-w-0">
              <CardHeader>
                <CardTitle>{t("expense_breakdown")}</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                {sortedBarData.length > 0 ? (
                  <ChartContainer
                    config={{}}
                    className="w-full max-w-[100%] overflow-hidden"
                    style={{
                      height: `${Math.max(sortedBarData.length * 45, 250)}px`,
                    }}
                  >
                    <BarChart
                      accessibilityLayer
                      data={sortedBarData}
                      layout="vertical"
                      margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
                    >
                      <CartesianGrid horizontal={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        width={100}
                        className="text-xs font-medium"
                      />
                      <XAxis type="number" hide />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={4} barSize={32}>
                        <LabelList
                          dataKey="value"
                          position="right"
                          className="fill-foreground font-bold"
                          fontSize={12}
                          formatter={(value: any) =>
                            `€${Number(value).toFixed(0)}`
                          }
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                    {t("no_data")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Period Comparison Section - Monthly */}
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>{t("period_comparison")}</CardTitle>
              <CardDescription>
                {t("comparison_vs_previous_month", {
                  current: selectedMonth,
                  previous: previousMonth,
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
                      value={comparisonMonth?.split("-")[1] || "auto"}
                      onValueChange={(value) => {
                        if (value === "auto") {
                          setComparisonMonth(undefined);
                        } else {
                          const year =
                            comparisonMonth?.split("-")[0] || selectedYear;
                          setComparisonMonth(`${year}-${value}`);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder={t("previous_month")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">
                          {t("previous_month")}
                        </SelectItem>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {comparisonMonth ? (
                      <Select
                        value={comparisonMonth.split("-")[0]}
                        onValueChange={(year) => {
                          const month = comparisonMonth.split("-")[1];
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
                    ) : (
                      <div className="flex items-center justify-center px-3 h-10 w-[100px] rounded-md border bg-muted text-sm font-medium text-muted-foreground">
                        {selectedYear}
                      </div>
                    )}
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
                    className={`text-xs flex items-center gap-1 ${
                      monthlyComparison.income.trend === "up"
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
                    className={`text-xs flex items-center gap-1 ${
                      monthlyComparison.expense.trend === "up"
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
                    className={`text-xl font-bold ${
                      monthlyComparison.balance.current >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    €{monthlyComparison.balance.current.toFixed(0)}
                  </div>
                  <div
                    className={`text-xs flex items-center gap-1 ${
                      monthlyComparison.balance.trend === "up"
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
                    className={`text-xl font-bold ${
                      monthlyComparison.savingRate.current >= 0
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
                  <ChartContainer
                    config={{
                      current: {
                        label: t("current_month"),
                        color: "hsl(0 84.2% 60.2%)",
                      },
                      previous: {
                        label: t("previous_month"),
                        color: "hsl(0 84.2% 60.2% / 0.3)",
                      },
                    }}
                    className="h-[250px] w-full"
                  >
                    <AreaChart
                      data={dailyCumulativeExpenses.map((d, i) => ({
                        day: d.day,
                        current: d.cumulative,
                        previous:
                          previousMonthCumulativeExpenses[i]?.cumulative || 0,
                      }))}
                      margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis tickFormatter={(v) => `€${v}`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="previous"
                        stroke="var(--color-previous)"
                        fill="var(--color-previous)"
                        fillOpacity={0.3}
                        strokeDasharray="5 5"
                      />
                      <Area
                        type="monotone"
                        dataKey="current"
                        stroke="var(--color-current)"
                        fill="var(--color-current)"
                        fillOpacity={0.3}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                  </ChartContainer>
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
                        value={comparisonMonth?.split("-")[1] || "auto"}
                        onValueChange={(value) => {
                          if (value === "auto") {
                            setComparisonMonth(undefined);
                          } else {
                            const year =
                              comparisonMonth?.split("-")[0] || selectedYear;
                            setComparisonMonth(`${year}-${value}`);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder={t("previous_month")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">
                            {t("previous_month")}
                          </SelectItem>
                          {months.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {comparisonMonth ? (
                        <Select
                          value={comparisonMonth.split("-")[0]}
                          onValueChange={(year) => {
                            const month = comparisonMonth.split("-")[1];
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
                      ) : (
                        <div className="flex items-center justify-center px-3 h-10 w-[100px] rounded-md border bg-muted text-sm font-medium text-muted-foreground">
                          {selectedYear}
                        </div>
                      )}
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
                          className={`flex items-center gap-1 text-sm ${
                            cat.trend === "improved"
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
            {/* Radial Chart - Category Distribution (Yearly) */}
            <Card className="flex flex-col min-w-0">
              <CardHeader className="items-center pb-0">
                <CardTitle>{t("category_distribution")}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 pb-0 min-w-0">
                {yearlyCategoryPercentages.length > 0 ? (
                  <ChartContainer
                    config={yearlyCategoryPercentages.reduce(
                      (acc, item, index) => {
                        acc[item.name] = {
                          label: item.name,
                          color: `hsl(var(--chart-${(index % 5) + 1}))`,
                        };
                        return acc;
                      },
                      {} as ChartConfig
                    )}
                    className="mx-auto aspect-square max-w-[280px] max-h-[300px] min-h-[250px] w-full [&_.recharts-text]:fill-foreground"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Pie
                        data={yearlyCategoryPercentages}
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
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    {t("no_data")}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Horizontal Bar Chart - Expense Breakdown (Yearly) */}
            <Card className="flex flex-col min-w-0">
              <CardHeader>
                <CardTitle>{t("expense_breakdown")}</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                {sortedBarData.length > 0 ? (
                  <ChartContainer
                    config={{}}
                    className="min-h-[300px] w-full max-w-[100%] overflow-hidden"
                  >
                    <BarChart
                      accessibilityLayer
                      data={sortedBarData.slice(0, 8)}
                      layout="vertical"
                      margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
                    >
                      <CartesianGrid horizontal={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        width={100}
                        className="text-xs font-medium"
                      />
                      <XAxis type="number" hide />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" radius={4} barSize={32}>
                        <LabelList
                          dataKey="value"
                          position="right"
                          className="fill-foreground font-bold"
                          fontSize={12}
                          formatter={(value: any) =>
                            `€${Number(value).toFixed(0)}`
                          }
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                    {t("no_data")}
                  </div>
                )}
              </CardContent>
            </Card>
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
            <CardContent>
              {/* Comparison year selector */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    {t("compare_with")}
                  </label>
                  <Select
                    value={comparisonYear || "auto"}
                    onValueChange={(value) => {
                      if (value === "auto") {
                        setComparisonYear(undefined);
                      } else {
                        setComparisonYear(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={t("previous_year")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t("previous_year")}</SelectItem>
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
                    className={`text-xs flex items-center gap-1 ${
                      yearlyComparison.income.trend === "up"
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
                    className={`text-xs flex items-center gap-1 ${
                      yearlyComparison.expense.trend === "up"
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
                    className={`text-xl font-bold ${
                      yearlyComparison.balance.current >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    €{yearlyComparison.balance.current.toFixed(0)}
                  </div>
                  <div
                    className={`text-xs flex items-center gap-1 ${
                      yearlyComparison.balance.trend === "up"
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
                    className={`text-xl font-bold ${
                      yearlyComparison.savingRate.current >= 0
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
                  <ChartContainer
                    config={{
                      current: {
                        label: selectedYear,
                        color: "hsl(0 84.2% 60.2%)",
                      },
                      previous: {
                        label: previousYear,
                        color: "hsl(0 84.2% 60.2% / 0.3)",
                      },
                    }}
                    className="h-[250px] w-full"
                  >
                    <AreaChart
                      data={yearlyCumulativeExpenses.map((d, i) => ({
                        month: d.month,
                        current: d.cumulative,
                        previous:
                          previousYearCumulativeExpenses[i]?.cumulative || 0,
                      }))}
                      margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `€${v}`} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="previous"
                        stroke="var(--color-previous)"
                        fill="var(--color-previous)"
                        fillOpacity={0.3}
                        strokeDasharray="5 5"
                      />
                      <Area
                        type="monotone"
                        dataKey="current"
                        stroke="var(--color-current)"
                        fill="var(--color-current)"
                        fillOpacity={0.3}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
                  className="h-[350px] w-full"
                >
                  <LineChart
                    data={monthlyTrendData}
                    margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `€${value}`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="income"
                      stroke="var(--color-income)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      stroke="var(--color-expense)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="var(--color-balance)"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
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
                  className="h-[300px] w-full"
                >
                  <ComposedChart
                    data={monthlyCashFlow}
                    margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
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
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  {t("no_data")}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Context Analytics (if contexts exist) */}
        {contextStats.length > 0 && (
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>{t("context_analytics")}</CardTitle>
              <CardDescription>{t("context_analytics_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contextStats.map((ctx, index) => (
                  <div
                    key={ctx.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    {/* Context header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))`,
                          }}
                        />
                        <span className="font-semibold">{ctx.name}</span>
                      </div>
                      <span className="text-lg font-bold">€{ctx.total}</span>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-muted-foreground text-xs">
                          {t("transactions")}
                        </div>
                        <div className="font-medium">{ctx.transactionCount}</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-muted-foreground text-xs">
                          {t("average")}
                        </div>
                        <div className="font-medium">
                          €{ctx.avgPerTransaction}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-muted-foreground text-xs">
                          {t("top_category")}
                        </div>
                        <div className="font-medium truncate">
                          {ctx.topCategory || "-"}
                        </div>
                      </div>
                    </div>

                    {/* Category breakdown - top 3 */}
                    {ctx.categoryBreakdown.length > 1 && (
                      <div className="space-y-1 pt-2 border-t">
                        <div className="text-xs text-muted-foreground mb-2">
                          {t("breakdown_by_category")}
                        </div>
                        {ctx.categoryBreakdown.slice(0, 3).map((cat) => (
                          <div
                            key={cat.name}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground truncate max-w-[50%]">
                              {cat.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-muted rounded overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded"
                                  style={{ width: `${cat.percentage}%` }}
                                />
                              </div>
                              <span className="font-medium w-16 text-right">
                                €{cat.amount}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Burn Rate Indicator */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>{t("burn_rate")}</CardTitle>
              <CardDescription>{t("burn_rate_desc")}</CardDescription>
            </div>
            {(activeTab === "monthly" ? burnRate : yearlyBurnRate).noBudget ? (
              <Activity className="h-5 w-5 text-muted-foreground" />
            ) : (activeTab === "monthly" ? burnRate : yearlyBurnRate)
                .onTrack ? (
              <Activity className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("daily_average")}
                </div>
                <div className="text-2xl font-bold">
                  €
                  {(activeTab === "monthly"
                    ? burnRate
                    : yearlyBurnRate
                  ).dailyAverage.toFixed(2)}
                  {t("per_day")}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  {activeTab === "monthly"
                    ? t("projected_month_end")
                    : t("projected_year_end")}
                </div>
                <div
                  className={`text-2xl font-bold ${
                    (activeTab === "monthly" ? burnRate : yearlyBurnRate)
                      .noBudget
                      ? "text-foreground"
                      : (activeTab === "monthly" ? burnRate : yearlyBurnRate)
                          .onTrack
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  €
                  {(activeTab === "monthly"
                    ? burnRate.projectedMonthEnd
                    : yearlyBurnRate.projectedYearEnd
                  ).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {t("days_elapsed")}:{" "}
                  {
                    (activeTab === "monthly" ? burnRate : yearlyBurnRate)
                      .daysElapsed
                  }
                </span>
                <span>
                  {t("days_remaining")}:{" "}
                  {
                    (activeTab === "monthly" ? burnRate : yearlyBurnRate)
                      .daysRemaining
                  }
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    (activeTab === "monthly" ? burnRate : yearlyBurnRate)
                      .noBudget
                      ? "bg-muted-foreground"
                      : (activeTab === "monthly" ? burnRate : yearlyBurnRate)
                          .onTrack
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                  style={{
                    width: `${
                      ((activeTab === "monthly" ? burnRate : yearlyBurnRate)
                        .daysElapsed /
                        ((activeTab === "monthly" ? burnRate : yearlyBurnRate)
                          .daysElapsed +
                          (activeTab === "monthly" ? burnRate : yearlyBurnRate)
                            .daysRemaining)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
