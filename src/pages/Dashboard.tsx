import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTransactions } from "@/hooks/useTransactions";
import { useStatistics } from "@/hooks/useStatistics";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "react-i18next";
import { TransactionList } from "@/components/TransactionList";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategorySelector } from "@/components/CategorySelector";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCategories } from "@/hooks/useCategories";
import { FlipCard } from "@/components/ui/flip-card";

export function Dashboard() {
  const { transactions, addTransaction } = useTransactions();
  const { categories } = useCategories();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { t } = useTranslation();
  const now = new Date();
  const currentMonth = format(now, "yyyy-MM");

  // Chart config - memoized since it depends on translation
  const chartConfig = useMemo(
    () =>
    ({
      cumulative: {
        label: t("cumulative_expenses"),
        color: "hsl(0 84.2% 60.2%)",
      },
      projection: {
        label: t("projection"),
        color: "#eb630fff",
      },
    } satisfies ChartConfig),
    [t]
  );

  // Get current month statistics
  const { monthlyStats, dailyCumulativeExpenses } = useStatistics({
    selectedMonth: currentMonth,
  });

  // Memoize expensive calculations
  const { totalIncome, totalExpense, balance } = useMemo(
    () => ({
      totalIncome: monthlyStats.income,
      totalExpense: monthlyStats.expense,
      balance: monthlyStats.income - monthlyStats.expense,
    }),
    [monthlyStats.income, monthlyStats.expense]
  );

  // Budget calculations - memoized
  const budgetData = useMemo(() => {
    const monthlyBudget = settings?.monthly_budget;
    if (!monthlyBudget) {
      return {
        monthlyBudget: null,
        budgetUsedPercentage: 0,
        budgetRemaining: 0,
        isOverBudget: false,
      };
    }
    return {
      monthlyBudget,
      budgetUsedPercentage: (totalExpense / monthlyBudget) * 100,
      budgetRemaining: monthlyBudget - totalExpense,
      isOverBudget: totalExpense > monthlyBudget,
    };
  }, [settings?.monthly_budget, totalExpense]);

  const { monthlyBudget, budgetUsedPercentage, budgetRemaining, isOverBudget } =
    budgetData;

  // Recent transactions - memoized to avoid filtering on every render
  const recentTransactions = useMemo(
    () => transactions?.filter((t) => !t.deleted_at).slice(0, 5),
    [transactions]
  );

  // Mobile stats carousel state
  const [isFlipped, setIsFlipped] = useState(false);
  const [isChartFlipped, setIsChartFlipped] = useState(false);
  const statsCount = monthlyBudget ? 4 : 3; // 4 stats if budget is set, otherwise 3

  // Chart Card Flip State
  const [chartFaceAIndex, setChartFaceAIndex] = useState(0);
  const [chartFaceBIndex, setChartFaceBIndex] = useState(1);
  // Chart views: 0=Chart, 1=Recent Transactions, 2=Budget (only if budget is set)
  const chartViewsCount = monthlyBudget ? 3 : 2;

  const currentChartVisibleIndex = isChartFlipped
    ? chartFaceBIndex
    : chartFaceAIndex;

  const handleChartFlip = useCallback(() => {
    const nextIndex = (currentChartVisibleIndex + 1) % chartViewsCount;
    const afterNextIndex = (nextIndex + 1) % chartViewsCount;

    if (isChartFlipped) {
      setChartFaceAIndex(nextIndex);
      setTimeout(() => {
        setChartFaceBIndex(afterNextIndex);
      }, 350);
    } else {
      setChartFaceBIndex(nextIndex);
      setTimeout(() => {
        setChartFaceAIndex(afterNextIndex);
      }, 350);
    }

    setIsChartFlipped(!isChartFlipped);
  }, [currentChartVisibleIndex, isChartFlipped, chartViewsCount]);

  const renderChartCard = useCallback(
    (index: number) => {
      const dotIndicators = (
        <div className="flex gap-1.5 ml-auto">
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
            <Card className="h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col space-y-1.5">
                  <CardTitle>{t("monthly_expenses_trend")}</CardTitle>
                  <CardDescription>
                    {t("cumulative_daily_expenses")} -{" "}
                    {format(now, "MMMM yyyy")}
                  </CardDescription>
                </div>
                {dotIndicators}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                {dailyCumulativeExpenses.length > 0 ? (
                  <div className="flex-1 w-full min-h-0">
                    <ChartContainer
                      config={chartConfig}
                      className="h-full w-full"
                    >
                      <AreaChart
                        accessibilityLayer
                        data={dailyCumulativeExpenses}
                        margin={{
                          left: 12,
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
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="line" />}
                        />
                        <Area
                          dataKey="cumulative"
                          type="monotone"
                          fill="url(#cumulativeGradient)"
                          stroke="var(--color-cumulative)"
                        />
                        <Area
                          dataKey="projection"
                          type="monotone"
                          fill="url(#projectionGradient)"
                          stroke="var(--color-projection)"
                          strokeDasharray="5 5"
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center text-muted-foreground">
                    {t("no_data")}
                  </div>
                )}
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
        case 1: // Recent Transactions (Moved to index 1)
          return (
            <Card className="h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col space-y-1.5">
                  <CardTitle>{t("recent_transactions")}</CardTitle>
                </div>
                {dotIndicators}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 -mr-4 pr-4">
                  <TransactionList
                    transactions={recentTransactions}
                    categories={categories}
                    showActions={false}
                    isLoading={transactions === undefined}
                  />
                </ScrollArea>
                <div className="mt-2 flex justify-end pt-2">

                </div>
              </CardContent>
            </Card>
          );
        case 2: // Budget (only shown if budget is set)
          if (!monthlyBudget) return null;
          return (
            <Card className="h-full flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex flex-col space-y-1.5">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {t("monthly_budget")}
                  </CardTitle>
                  <CardDescription>{format(now, "MMMM yyyy")}</CardDescription>
                </div>
                {dotIndicators}
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
                            ? "bg-yellow-500"
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
                        {budgetUsedPercentage.toFixed(0)}% {t("used")}
                      </span>
                      <span
                        className={
                          isOverBudget
                            ? "text-red-600 font-medium"
                            : "text-green-600 font-medium"
                        }
                      >
                        {isOverBudget
                          ? `+€${Math.abs(budgetRemaining).toFixed(2)} ${t(
                            "over"
                          )}`
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
                        {(
                          totalExpense / Math.max(new Date().getDate(), 1)
                        ).toFixed(2)}
                        /{t("day")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-auto flex justify-end">

                </div>
              </CardContent>
            </Card>
          );
        default:
          return null;
      }
    },
    [
      t,
      dailyCumulativeExpenses,
      chartConfig,
      now,
      monthlyBudget,
      totalExpense,
      isOverBudget,
      budgetUsedPercentage,
      budgetRemaining,
      recentTransactions,
      categories,
      transactions,
      chartViewsCount,
      handleChartFlip,
    ]
  );

  // Track which card index is on which face
  // faceA starts with card 0, faceB starts with card 1
  const [faceAIndex, setFaceAIndex] = useState(0);
  const [faceBIndex, setFaceBIndex] = useState(1);

  // Current visible index (for dot indicators)
  const currentVisibleIndex = isFlipped ? faceBIndex : faceAIndex;

  // Handle flip - swap to the other face, then update the hidden face
  const handleStatFlip = useCallback(() => {
    const nextIndex = (currentVisibleIndex + 1) % statsCount;
    const afterNextIndex = (nextIndex + 1) % statsCount;

    if (isFlipped) {
      // Currently showing faceB, will flip to faceA
      // faceA should already have nextIndex from last flip
      // After flip, update faceB (now hidden) with afterNextIndex
      setFaceAIndex(nextIndex);
      setTimeout(() => {
        setFaceBIndex(afterNextIndex);
      }, 350);
    } else {
      // Currently showing faceA, will flip to faceB
      // faceB should already have nextIndex from last flip
      // After flip, update faceA (now hidden) with afterNextIndex
      setFaceBIndex(nextIndex);
      setTimeout(() => {
        setFaceAIndex(afterNextIndex);
      }, 350);
    }

    setIsFlipped(!isFlipped);
  }, [currentVisibleIndex, isFlipped, statsCount]);

  // Render a stat card by index
  const renderStatCard = useCallback(
    (index: number) => {
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
              <p className="text-3xl font-bold tracking-tight text-red-500">
                -€{totalExpense.toFixed(2)}
              </p>

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
              <p className="text-3xl font-bold tracking-tight text-green-500">
                +€{totalIncome.toFixed(2)}
              </p>

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
              <p
                className={`text-3xl font-bold tracking-tight ${balance >= 0 ? "text-green-500" : "text-red-500"
                  }`}
              >
                {balance >= 0 ? "+" : "-"}€{Math.abs(balance).toFixed(2)}
              </p>

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
                  {budgetUsedPercentage.toFixed(0)}%
                </p>
                <span className="text-sm text-muted-foreground">
                  / €{monthlyBudget.toFixed(0)}
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
    },
    [
      t,
      totalExpense,
      totalIncome,
      balance,
      monthlyBudget,
      isOverBudget,
      budgetUsedPercentage,
      statsCount,
      handleStatFlip,
    ]
  );

  // Transaction dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    type: "expense" as "income" | "expense" | "investment",
    category_id: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Reset category when type changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, category_id: "" }));
  }, [formData.type]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      if (!formData.category_id) {
        alert(t("select_category_required"));
        return;
      }

      await addTransaction({
        user_id: user.id,
        amount: parseFloat(formData.amount),
        description: formData.description,
        type: formData.type,
        category_id: formData.category_id,
        date: formData.date,
        year_month: formData.date.substring(0, 7),
      });

      setIsDialogOpen(false);
      setFormData({
        amount: "",
        description: "",
        category_id: "",
        type: "expense",
        date: new Date().toISOString().split("T")[0],
      });
    },
    [user, formData, addTransaction, t]
  );

  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case "expense":
        return "bg-red-500 hover:bg-red-600 text-white";
      case "income":
        return "bg-green-500 hover:bg-green-600 text-white";
      case "investment":
        return "bg-blue-500 hover:bg-blue-600 text-white";
      default:
        return "";
    }
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>

      {/* Mobile Summary Stats - Smart FlipCard Carousel */}
      <div className="md:hidden">
        <FlipCard
          className="h-[120px]"
          isFlipped={isFlipped}
          onFlip={handleStatFlip}
          direction="right"
          disableGlobalClick
          frontContent={renderStatCard(faceAIndex)}
          backContent={renderStatCard(faceBIndex)}
        />
      </div>
      {/* Chart and Summary Cards Layout */}
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        {/* Cumulative Expenses Chart - FlipCard with 3 states */}
        <FlipCard
          className="h-[55vh] min-h-[420px]"
          isFlipped={isChartFlipped}
          onFlip={handleChartFlip}
          direction="right"
          disableGlobalClick
          frontContent={renderChartCard(chartFaceAIndex)}
          backContent={renderChartCard(chartFaceBIndex)}
        />

        {/* Summary Cards - Hidden on mobile, stacked vertically on desktop */}
        <div className="hidden md:flex md:flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("total_expenses")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -€{totalExpense.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("total_income")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +€{totalIncome.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("total_balance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"
                  }`}
              >
                €{balance.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 hidden md:block">
        <Card>
          <CardHeader>
            <CardTitle>{t("recent_transactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px] pr-4 sm:h-[400px] lg:h-[300px]">
              <TransactionList
                transactions={recentTransactions}
                categories={categories}
                showActions={false}
                isLoading={transactions === undefined}
              />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button - Mobile Only */}
      <Button
        onClick={() => setIsDialogOpen(true)}
        className="md:hidden fixed bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.5rem))] right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Add Transaction Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>{t("add_transaction")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("add_transaction_desc") || "Enter transaction details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("type")}</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full ${formData.type === "expense" ? getTypeColor("expense") : ""
                    }`}
                  onClick={() => setFormData({ ...formData, type: "expense" })}
                >
                  {t("expense")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full ${formData.type === "income" ? getTypeColor("income") : ""
                    }`}
                  onClick={() => setFormData({ ...formData, type: "income" })}
                >
                  {t("income")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full ${formData.type === "investment"
                    ? getTypeColor("investment")
                    : ""
                    }`}
                  onClick={() =>
                    setFormData({ ...formData, type: "investment" })
                  }
                >
                  {t("investment")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("category")}</label>
              <CategorySelector
                value={formData.category_id}
                onChange={(value) =>
                  setFormData({ ...formData, category_id: value })
                }
                type={formData.type}
                modal
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("amount")}</label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("date")}</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("description")}</label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </div>
            <Button type="submit" className="w-full">
              {t("save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
