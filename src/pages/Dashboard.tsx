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
  Wallet,
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategorySelector } from "@/components/CategorySelector";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCategories } from "@/hooks/useCategories";

export function Dashboard() {
  const { transactions, addTransaction } = useTransactions();
  const { categories } = useCategories();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { t } = useTranslation();
  const now = new Date();
  const currentMonth = format(now, "yyyy-MM");

  // Get current month statistics
  const { monthlyStats, dailyCumulativeExpenses } = useStatistics({
    selectedMonth: currentMonth,
  });

  // Memoize expensive calculations
  const { totalIncome, totalExpense, balance } = useMemo(() => ({
    totalIncome: monthlyStats.income,
    totalExpense: monthlyStats.expense,
    balance: monthlyStats.income - monthlyStats.expense,
  }), [monthlyStats.income, monthlyStats.expense]);

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
      budgetUsedPercentage: Math.min((totalExpense / monthlyBudget) * 100, 100),
      budgetRemaining: monthlyBudget - totalExpense,
      isOverBudget: totalExpense > monthlyBudget,
    };
  }, [settings?.monthly_budget, totalExpense]);

  const { monthlyBudget, budgetUsedPercentage, budgetRemaining, isOverBudget } = budgetData;

  // Recent transactions - memoized to avoid filtering on every render
  const recentTransactions = useMemo(() => 
    transactions?.filter((t) => !t.deleted_at).slice(0, 5),
    [transactions]
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
  }, [user, formData, addTransaction, t]);

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

  // Chart config - memoized since it depends on translation
  const chartConfig = useMemo(() => ({
    cumulative: {
      label: t("cumulative_expenses"),
      color: "hsl(0 84.2% 60.2%)",
    },
    projection: {
      label: t("projection"),
      color: "#eb630fff",
    },
  } satisfies ChartConfig), [t]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("dashboard")}</h1>

      {/* Mobile Summary Stats - Horizontal scroll with compact cards */}
      <div className="md:hidden -mx-4 px-4">
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
          {/* Expense Card - First */}
          <div className="snap-start shrink-0 w-[140px]">
            <div className="relative overflow-hidden rounded-xl p-3 h-[90px] bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="p-1 rounded-md bg-red-500/20 text-red-600">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t("expenses")}
                </span>
              </div>
              <p className="text-xl font-bold tracking-tight text-red-600">
                -€{totalExpense.toFixed(0)}
              </p>
              <div className="absolute -right-3 -bottom-3 opacity-[0.07] text-red-500">
                <TrendingDown className="h-16 w-16" />
              </div>
            </div>
          </div>

          {/* Budget Card (if set) - Second */}
          {monthlyBudget && (
            <div className="snap-start shrink-0 w-[160px]">
              <div
                className={`relative overflow-hidden rounded-xl p-3 h-[90px] ${
                  isOverBudget
                    ? "bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20"
                    : budgetUsedPercentage > 80
                    ? "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20"
                    : "bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className={`p-1 rounded-md ${
                      isOverBudget
                        ? "bg-red-500/20 text-red-600"
                        : budgetUsedPercentage > 80
                        ? "bg-amber-500/20 text-amber-600"
                        : "bg-blue-500/20 text-blue-600"
                    }`}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {t("budget")}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <p
                    className={`text-xl font-bold tracking-tight ${
                      isOverBudget
                        ? "text-red-600"
                        : budgetUsedPercentage > 80
                        ? "text-amber-600"
                        : "text-blue-600"
                    }`}
                  >
                    {budgetUsedPercentage.toFixed(0)}%
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    / €{monthlyBudget.toFixed(0)}
                  </span>
                </div>
                {/* Mini progress bar */}
                <div className="mt-1.5 h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isOverBudget
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
                  className={`absolute -right-3 -bottom-3 opacity-[0.07] ${
                    isOverBudget
                      ? "text-red-500"
                      : budgetUsedPercentage > 80
                      ? "text-amber-500"
                      : "text-blue-500"
                  }`}
                >
                  <Wallet className="h-16 w-16" />
                </div>
              </div>
            </div>
          )}

          {/* Income Card - Third */}
          <div className="snap-start shrink-0 w-[140px]">
            <div className="relative overflow-hidden rounded-xl p-3 h-[90px] bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="p-1 rounded-md bg-green-500/20 text-green-600">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t("income")}
                </span>
              </div>
              <p className="text-xl font-bold tracking-tight text-green-600">
                +€{totalIncome.toFixed(0)}
              </p>
              <div className="absolute -right-3 -bottom-3 opacity-[0.07] text-green-500">
                <TrendingUp className="h-16 w-16" />
              </div>
            </div>
          </div>

          {/* Balance Card - Fourth */}
          <div className="snap-start shrink-0 w-[140px]">
            <div
              className={`relative overflow-hidden rounded-xl p-3 h-[90px] ${
                balance >= 0
                  ? "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20"
                  : "bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div
                  className={`p-1 rounded-md ${
                    balance >= 0
                      ? "bg-emerald-500/20 text-emerald-600"
                      : "bg-red-500/20 text-red-600"
                  }`}
                >
                  <PiggyBank className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {t("total_balance")}
                </span>
              </div>
              <p
                className={`text-xl font-bold tracking-tight ${
                  balance >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                €{Math.abs(balance).toFixed(0)}
              </p>
              <div
                className={`absolute -right-3 -bottom-3 opacity-[0.07] ${
                  balance >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                <PiggyBank className="h-16 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Chart and Summary Cards Layout */}
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        {/* Cumulative Expenses Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t("monthly_expenses_trend")}</CardTitle>
            <CardDescription>
              {t("cumulative_daily_expenses")} - {format(now, "MMMM yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dailyCumulativeExpenses.length > 0 ? (
              <ChartContainer
                config={chartConfig}
                className="h-[180px] w-full md:h-[250px] min-h-[180px]"
              >
                <AreaChart
                  accessibilityLayer
                  data={dailyCumulativeExpenses}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                >
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
                    fill="var(--color-cumulative)"
                    fillOpacity={0.4}
                    stroke="var(--color-cumulative)"
                  />
                  <Area
                    dataKey="projection"
                    type="monotone"
                    fill="var(--color-projection)"
                    fillOpacity={0.3}
                    stroke="var(--color-projection)"
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                {t("no_data")}
              </div>
            )}
          </CardContent>
        </Card>

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
                className={`text-2xl font-bold ${
                  balance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                €{balance.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Budget Progress Card */}
      {monthlyBudget && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              {t("monthly_budget")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("budget_spent", {
                  spent: `€${totalExpense.toFixed(2)}`,
                  budget: `€${monthlyBudget.toFixed(2)}`,
                })}
              </span>
              <span
                className={
                  isOverBudget
                    ? "text-red-600 font-medium"
                    : "text-green-600 font-medium"
                }
              >
                {isOverBudget
                  ? t("budget_exceeded", {
                      amount: `€${Math.abs(budgetRemaining).toFixed(2)}`,
                    })
                  : t("budget_remaining", {
                      remaining: `€${budgetRemaining.toFixed(2)}`,
                    })}
              </span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isOverBudget
                    ? "bg-red-500"
                    : budgetUsedPercentage > 80
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(budgetUsedPercentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {budgetUsedPercentage.toFixed(0)}%
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("recent_transactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[250px] pr-4 md:h-[300px]">
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
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("type")}</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full ${
                    formData.type === "expense" ? getTypeColor("expense") : ""
                  }`}
                  onClick={() => setFormData({ ...formData, type: "expense" })}
                >
                  {t("expense")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full ${
                    formData.type === "income" ? getTypeColor("income") : ""
                  }`}
                  onClick={() => setFormData({ ...formData, type: "income" })}
                >
                  {t("income")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full ${
                    formData.type === "investment"
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
