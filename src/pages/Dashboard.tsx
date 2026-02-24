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
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useCategories } from "@/hooks/useCategories";
import { useGroups } from "@/hooks/useGroups";
import { useContexts } from "@/hooks/useContexts";
import { FlipCard, type SwipeDirection } from "@/components/ui/flip-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthProvider";
import { Transaction } from "@/lib/db";
import {
  DashboardChartCard,
  DashboardChartContent,
  DashboardTransactionsContent,
  DashboardBudgetContent,
} from "@/components/dashboard/DashboardChartCard";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { DashboardSummaryCards } from "@/components/dashboard/DashboardSummaryCards";

export function Dashboard() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { categories } = useCategories();
  const { groups } = useGroups();
  const { contexts } = useContexts();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { t } = useTranslation();
  const now = new Date();
  const currentMonth = format(now, "yyyy-MM");
  const dashboardRootRef = useRef<HTMLDivElement | null>(null);

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
  const { monthlyStats, dailyCumulativeExpenses, isLoading: isStatsLoading, insights } = useStatistics({
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
    () => transactions?.filter((t) => !t.deleted_at).slice(0, 25),
    [transactions]
  );

  // Mobile stats carousel state - MUST be declared before use
  const [statsRotation, setStatsRotation] = useState(0);
  const [chartRotation, setChartRotation] = useState(0);

  // Build a SINGLE deck structure: Expense -> Income -> Insight (placeholder) -> Balance -> (Budget)
  // The insight shown will rotate each time we complete a full cycle through the deck.
  const baseDeckLength = 3 + (monthlyBudget ? 1 : 0) + (insights && insights.length > 0 ? 1 : 0);

  // Calculate which "round" we are in based on rotation (each card flip is 180deg, full deck cycle = baseDeckLength flips)
  // We use Math.abs to handle negative rotations and Math.floor to get the round.
  const flipCount = Math.abs(statsRotation) / 180;
  const currentRound = Math.floor(flipCount / baseDeckLength);

  // Pick insight index based on round (cycles through available insights)
  const currentInsightIndex = insights && insights.length > 0 ? currentRound % insights.length : 0;
  const currentInsight = insights ? insights[currentInsightIndex] : undefined;

  // Construct card deck based on user preference and data availability
  const cards: Array<{
    type: "expense" | "income" | "balance" | "budget" | "insight";
    insight?: any;
  }> = useMemo(() => {
    const deck: any[] = [
      { type: "expense" as const },
      { type: "income" as const },
    ];

    // Add single insight slot if available (actual insight is picked dynamically)
    if (insights && insights.length > 0) {
      deck.push({ type: "insight" as const, insight: currentInsight });
    }

    deck.push({ type: "balance" as const });

    if (monthlyBudget) {
      deck.push({ type: "budget" as const });
    }

    return deck;
  }, [monthlyBudget, insights, currentInsight]);

  const statsCount = cards.length;

  // Chart Card Flip State
  const [chartFaceAIndex, setChartFaceAIndex] = useState(0);
  const [chartFaceBIndex, setChartFaceBIndex] = useState(1);
  const chartViewsCount = 3; // Chart, Transactions, Budget (if exists) -> actually logic below handles this separately?
  // Only handling stats deck logic here first.

  // Derive flip state from rotation (odd multiples of 180 are flipped)
  const isChartFlipped = (Math.abs(chartRotation / 180) % 2) === 1;
  const isStatsFlipped = (Math.abs(statsRotation / 180) % 2) === 1;

  const currentChartVisibleIndex = isChartFlipped
    ? chartFaceBIndex
    : chartFaceAIndex;

  // Handle chart flip with direction (circular navigation)
  const handleChartSwipe = useCallback((direction: SwipeDirection) => {
    const isForward = direction === "left" || direction === "up";
    const newRotation = isForward ? chartRotation - 180 : chartRotation + 180;
    setChartRotation(newRotation);

    // Chart has its own index logic (views count), separate from stats deck
    // Re-calculating views count locally for chart
    const viewsCount = monthlyBudget ? 3 : 2;

    const nextIndex = !isForward
      ? (currentChartVisibleIndex - 1 + viewsCount) % viewsCount
      : (currentChartVisibleIndex + 1) % viewsCount;

    const afterNextIndex = !isForward
      ? (nextIndex - 1 + viewsCount) % viewsCount
      : (nextIndex + 1) % viewsCount;

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
  }, [currentChartVisibleIndex, isChartFlipped, chartRotation, monthlyBudget]);

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

  // shared props without statsCount which is now dynamic
  const baseStatCardProps = {
    totalExpense,
    totalIncome,
    balance,
    monthlyBudget,
    isOverBudget,
    budgetUsedPercentage,
    isStatsLoading,
  };

  // Helper to render card with correct data
  const renderCard = (index: number) => {
    const card = cards[index];
    if (!card) return null;

    return (
      <DashboardStatCard
        index={index}
        statsCount={statsCount}
        type={card.type}
        insight={card.insight}
        {...baseStatCardProps}
      />
    );
  };

  // Transaction dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleEdit = useCallback((transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteTransaction(id);
  }, [deleteTransaction]);

  const handleSubmit = useCallback(
    async (data: TransactionFormData) => {
      if (!user) return;

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          amount: data.amount,
          description: data.description || "",
          type: data.type,
          category_id: data.category_id,
          date: data.date,
          year_month: data.date.substring(0, 7),
          context_id: data.context_id || undefined,
          group_id: data.group_id || undefined,
          paid_by_member_id: data.paid_by_member_id || undefined,
        });
      } else {
        await addTransaction({
          user_id: user.id,
          amount: data.amount,
          description: data.description || "",
          type: data.type,
          category_id: data.category_id,
          date: data.date,
          year_month: data.date.substring(0, 7),
          context_id: data.context_id || undefined,
          group_id: data.group_id || undefined,
          paid_by_member_id: data.paid_by_member_id || undefined,
        });
      }

      setIsDialogOpen(false);
      setEditingTransaction(null);
    },
    [user, addTransaction, updateTransaction, editingTransaction]
  );

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setEditingTransaction(null);
  };

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
    groups,
    contexts,
    transactions,
    onEdit: handleEdit,
    onDelete: handleDelete,
  };

  useEffect(() => {
    const isMobileViewport = window.innerWidth < 768;
    if (!isMobileViewport) return;
    const rect = dashboardRootRef.current?.getBoundingClientRect();
    const payload = {
      sessionId: "6a339b",
      runId: "pre-fix",
      hypothesisId: "H5",
      location: "Dashboard.tsx:layout-effect",
      message: "Dashboard layout metrics",
      data: {
        pathname: window.location.pathname,
        windowInnerHeight: window.innerHeight,
        windowInnerWidth: window.innerWidth,
        visualViewportHeight: window.visualViewport?.height ?? null,
        visualViewportOffsetTop: window.visualViewport?.offsetTop ?? null,
        rootTop: rect?.top ?? null,
        rootBottom: rect?.bottom ?? null,
        rootHeight: rect?.height ?? null,
        bodyClientHeight: document.body.clientHeight,
        docClientHeight: document.documentElement.clientHeight,
      },
      timestamp: Date.now(),
    };
    // #region agent log
    fetch("http://127.0.0.1:7808/ingest/822865b9-4dcd-4609-8cfb-00eae54365bf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "6a339b",
      },
      body: JSON.stringify(payload),
    }).catch(() => { });
    // #endregion
    // #region agent log
    console.log("[gonuts-debug]", payload);
    // #endregion
  }, []);


  return (
    <div ref={dashboardRootRef} className="flex flex-col md:block h-[calc(100dvh-10rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[calc(100lvh-10rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-auto gap-4 md:space-y-4">
      <h1 className="text-2xl font-bold shrink-0">{t("dashboard")}</h1>

      {/* Mobile Summary Stats - Smart FlipCard Carousel */}
      <div className="md:hidden shrink-0">
        <FlipCard
          className="h-[12vh] min-h-[80px]"
          isFlipped={isStatsFlipped}
          onSwipe={handleStatSwipe}
          rotation={statsRotation}
          disableGlobalClick
          frontContent={renderCard(faceAIndex)}
          backContent={renderCard(faceBIndex)}
        />
      </div>

      {/* Chart and Summary Cards Layout */}
      {/* Mobile: Grid showing FlipCard for Chart/Tx and hidden summary cards */}
      {/* Desktop: Grid showing Chart (left), Tx (right) and Summary cards (top) */}

      {/* Mobile Layout */}
      <div className="flex-1 min-h-0 md:hidden">
        <FlipCard
          className="h-full"
          isFlipped={isChartFlipped}
          onSwipe={handleChartSwipe}
          rotation={chartRotation}
          swipeAxis="horizontal"
          flipDirection="right"
          disableGlobalClick
          frontContent={<DashboardChartCard index={chartFaceAIndex} {...chartCardProps} dailyCumulativeExpenses={chartCardProps.dailyCumulativeExpenses.map(d => ({ ...d, day: d.day.toString() }))} />}
          backContent={<DashboardChartCard index={chartFaceBIndex} {...chartCardProps} dailyCumulativeExpenses={chartCardProps.dailyCumulativeExpenses.map(d => ({ ...d, day: d.day.toString() }))} />}
        />
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex flex-col gap-6">
        {/* Top Summary Cards */}
        <DashboardSummaryCards
          totalExpense={totalExpense}
          totalIncome={totalIncome}
          balance={balance}
          isStatsLoading={isStatsLoading}
          monthlyBudget={monthlyBudget}
          budgetUsedPercentage={budgetUsedPercentage}
          isOverBudget={isOverBudget}
          budgetRemaining={budgetRemaining}
          insight={cards.find(c => c.type === "insight")?.insight}
        />

        {/* Main Grid: Chart + Transactions */}
        <div className="grid grid-cols-12 gap-6 h-[700px]" data-testid="desktop-dashboard-grid">
          {/* Main Chart + Budget (Left 1/2) */}
          <div className="col-span-6 h-full min-h-0 flex flex-col gap-6">
            <div className="flex-1 min-h-0">
              <DashboardChartContent
                dailyCumulativeExpenses={dailyCumulativeExpenses}
                chartConfig={chartConfig}
                isStatsLoading={isStatsLoading}
              />
            </div>
            {/* Budget Card (if exists) */}
            {monthlyBudget && (
              <div className="shrink-0 h-[280px]">
                <DashboardBudgetContent
                  monthlyBudget={monthlyBudget}
                  totalExpense={totalExpense}
                  isOverBudget={isOverBudget}
                  budgetUsedPercentage={budgetUsedPercentage}
                  budgetRemaining={budgetRemaining}
                />
              </div>
            )}
          </div>

          {/* Side Panel: Transactions (Right 1/2) */}
          <div className="col-span-6 h-full min-h-0">
            <DashboardTransactionsContent
              recentTransactions={recentTransactions}
              categories={categories}
              groups={groups}
              contexts={contexts}
              transactions={transactions}
              onEdit={handleEdit}
              onDelete={handleDelete}
              headerRightContent={
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex gap-2"
                  onClick={() => {
                    setEditingTransaction(null);
                    setIsDialogOpen(true);
                  }}
                  data-testid="add-transaction-desktop"
                >
                  <Plus className="h-4 w-4" />
                  {t("add_transaction")}
                </Button>
              }
            />
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      {/* Floating Action Button - Rendered in Portal to avoid transform context issues */}
      {typeof document !== "undefined" &&
        createPortal(
          <Button
            size="icon"
            className="fixed bottom-8 right-4 h-14 w-14 rounded-full shadow-lg md:hidden z-50 animate-glow"
            onClick={() => {
              setEditingTransaction(null);
              setIsDialogOpen(true);
            }}
            data-testid="add-transaction-fab"
          >
            <Plus className="h-6 w-6 shrink-0" />
          </Button>,
          document.body
        )}

      <TransactionDialog
        open={isDialogOpen}
        onOpenChange={handleOpenChange}
        onSubmit={handleSubmit}
        editingTransaction={editingTransaction}
      />
    </div>
  );
}

export default Dashboard;
