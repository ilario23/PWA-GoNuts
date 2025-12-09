import { ChartConfig } from "@/components/ui/chart";
import { useTransactions } from "@/hooks/useTransactions";
import { useStatistics } from "@/hooks/useStatistics";
import { useSettings } from "@/hooks/useSettings";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import {
  TransactionDialog,
  TransactionFormData,
} from "@/components/TransactionDialog";
import { useState, useCallback, useMemo } from "react";
import { useCategories } from "@/hooks/useCategories";
import { FlipCard, type SwipeDirection } from "@/components/ui/flip-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthProvider";
import { DashboardChartCard } from "@/components/dashboard/DashboardChartCard";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";

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
  const { monthlyStats, dailyCumulativeExpenses, isLoading: isStatsLoading } = useStatistics({
    selectedMonth: currentMonth,
    userId: user?.id,
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
  const [statsRotation, setStatsRotation] = useState(0);
  const [chartRotation, setChartRotation] = useState(0);
  const statsCount = monthlyBudget ? 4 : 3;

  // Chart Card Flip State
  const [chartFaceAIndex, setChartFaceAIndex] = useState(0);
  const [chartFaceBIndex, setChartFaceBIndex] = useState(1);
  const chartViewsCount = monthlyBudget ? 3 : 2;

  // Derive flip state from rotation (odd multiples of 180 are flipped)
  const isChartFlipped = (Math.abs(chartRotation / 180) % 2) === 1;
  const isStatsFlipped = (Math.abs(statsRotation / 180) % 2) === 1;

  const currentChartVisibleIndex = isChartFlipped
    ? chartFaceBIndex
    : chartFaceAIndex;

  // Handle chart flip with direction (circular navigation)
  const handleChartSwipe = useCallback((direction: SwipeDirection) => {
    const newRotation = direction === "left" ? chartRotation - 180 : chartRotation + 180;
    setChartRotation(newRotation);

    const nextIndex = direction === "right"
      ? (currentChartVisibleIndex - 1 + chartViewsCount) % chartViewsCount
      : (currentChartVisibleIndex + 1) % chartViewsCount;

    const afterNextIndex = direction === "right"
      ? (nextIndex - 1 + chartViewsCount) % chartViewsCount
      : (nextIndex + 1) % chartViewsCount;

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
  }, [currentChartVisibleIndex, isChartFlipped, chartRotation, chartViewsCount]);

  // Track which card index is on which face
  const [faceAIndex, setFaceAIndex] = useState(0);
  const [faceBIndex, setFaceBIndex] = useState(1);

  // Current visible index (for dot indicators)
  const currentVisibleIndex = isStatsFlipped ? faceBIndex : faceAIndex;

  // Handle stat flip with direction (circular navigation)
  const handleStatSwipe = useCallback((direction: SwipeDirection) => {
    const newRotation = direction === "left" ? statsRotation - 180 : statsRotation + 180;
    setStatsRotation(newRotation);

    const nextIndex = direction === "right"
      ? (currentVisibleIndex - 1 + statsCount) % statsCount
      : (currentVisibleIndex + 1) % statsCount;

    const afterNextIndex = direction === "right"
      ? (nextIndex - 1 + statsCount) % statsCount
      : (nextIndex + 1) % statsCount;

    if (isStatsFlipped) {
      setFaceAIndex(nextIndex);
      setTimeout(() => {
        setFaceBIndex(afterNextIndex);
      }, 350);
    } else {
      setFaceBIndex(nextIndex);
      setTimeout(() => {
        setFaceAIndex(afterNextIndex);
      }, 350);
    }
  }, [currentVisibleIndex, isStatsFlipped, statsRotation, statsCount]);

  // Transaction dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSubmit = useCallback(
    async (data: TransactionFormData) => {
      if (!user) return;

      await addTransaction({
        user_id: user.id,
        amount: parseFloat(data.amount),
        description: data.description,
        type: data.type,
        category_id: data.category_id,
        date: data.date,
        year_month: data.date.substring(0, 7),
        context_id: data.context_id || undefined,
        group_id: data.group_id || undefined,
      });

      setIsDialogOpen(false);
    },
    [user, addTransaction]
  );

  // Shared props for chart cards
  const chartCardProps = {
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
    transactions,
  };

  // Shared props for stat cards
  const statCardProps = {
    statsCount,
    totalExpense,
    totalIncome,
    balance,
    monthlyBudget,
    isOverBudget,
    budgetUsedPercentage,
    isStatsLoading,
  };

  return (
    <div className="flex flex-col md:block h-[calc(100dvh-12rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-auto gap-4 md:space-y-4">
      <h1 className="text-2xl font-bold shrink-0">{t("dashboard")}</h1>

      {/* Mobile Summary Stats - Smart FlipCard Carousel */}
      <div className="md:hidden shrink-0">
        <FlipCard
          className="h-[12vh] min-h-[80px]"
          isFlipped={isStatsFlipped}
          onSwipe={handleStatSwipe}
          rotation={statsRotation}
          disableGlobalClick
          frontContent={<DashboardStatCard index={faceAIndex} {...statCardProps} />}
          backContent={<DashboardStatCard index={faceBIndex} {...statCardProps} />}
        />
      </div>

      {/* Chart and Summary Cards Layout */}
      <div className="flex-1 min-h-0 grid gap-4 md:grid-cols-[1fr_auto]">
        {/* Cumulative Expenses Chart - FlipCard with 3 states */}
        <FlipCard
          className="h-full md:h-[50vh] md:min-h-[400px]"
          isFlipped={isChartFlipped}
          onSwipe={handleChartSwipe}
          rotation={chartRotation}
          disableGlobalClick
          frontContent={<DashboardChartCard index={chartFaceAIndex} {...chartCardProps} />}
          backContent={<DashboardChartCard index={chartFaceBIndex} {...chartCardProps} />}
        />

        {/* Summary Cards - Hidden on mobile, stacked vertically on desktop */}
        <DashboardSummaryCards
          totalExpense={totalExpense}
          totalIncome={totalIncome}
          balance={balance}
          isStatsLoading={isStatsLoading}
        />
      </div>

      {/* Floating Action Button */}
      <Button
        size="icon"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg md:hidden z-50 animate-glow"
        onClick={() => setIsDialogOpen(true)}
      >
        <Plus className="h-6 w-6 shrink-0" />
      </Button>

      <TransactionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default Dashboard;
