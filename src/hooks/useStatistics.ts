import { useLiveQuery } from "dexie-react-hooks";
import { db, Transaction, GroupMember } from "../lib/db";
import { useTranslation } from "react-i18next";
import { format, subMonths } from "date-fns";
import { useMemo, useCallback, useEffect, useState, useRef } from "react";
import StatsWorker from "../workers/statistics.worker?worker";
import { StatisticsWorkerRequest, StatisticsWorkerResponse } from "../types/worker";

/**
 * Parameters for configuring the statistics hook.
 */
interface UseStatisticsParams {
  /** Selected month for monthly stats (format: 'YYYY-MM') */
  selectedMonth?: string;
  /** Selected year for yearly stats (format: 'YYYY') */
  selectedYear?: string;
  /** Custom month for comparison (format: 'YYYY-MM'), defaults to previous month */
  comparisonMonth?: string;
  /** Custom year for comparison (format: 'YYYY'), defaults to previous year */
  comparisonYear?: string;
  /** Active mode - only calculates data for the active tab for performance */
  mode?: "monthly" | "yearly";
  /** Filter by specific group ID - only includes transactions from that group */
  groupId?: string;
  /** Current user ID for calculating group shares */
  userId?: string;
}

/**
 * Hook for calculating comprehensive financial statistics and analytics.
 * 
 * Uses a Web Worker to offload heavy calculations from the main thread.
 */
export function useStatistics(params?: UseStatisticsParams) {
  const now = new Date();
  const currentMonth = params?.selectedMonth || format(now, "yyyy-MM");
  const currentYear = params?.selectedYear || format(now, "yyyy");
  const mode = params?.mode || "monthly";
  const userId = params?.userId;

  const { t } = useTranslation();

  // Helper to get localized short month names
  const getMonthNames = useCallback(() => {
    return [
      t('months_short.jan'),
      t('months_short.feb'),
      t('months_short.mar'),
      t('months_short.apr'),
      t('months_short.may'),
      t('months_short.jun'),
      t('months_short.jul'),
      t('months_short.aug'),
      t('months_short.sep'),
      t('months_short.oct'),
      t('months_short.nov'),
      t('months_short.dec')
    ];
  }, [t]);

  // Calculate previous periods for comparison
  const defaultPreviousMonth = format(
    subMonths(new Date(`${currentMonth}-01`), 1),
    "yyyy-MM"
  );
  const previousMonth = params?.comparisonMonth || defaultPreviousMonth;
  const defaultPreviousYear = (parseInt(currentYear) - 1).toString();
  const previousYear = params?.comparisonYear || defaultPreviousYear;

  // --- Data Fetching (Main Thread) ---
  const transactions = useLiveQuery(
    () =>
      mode === "monthly"
        ? db.transactions.where("year_month").equals(currentMonth).toArray()
          .then(txs => params?.groupId
            ? txs.filter(t => t.group_id === params.groupId)
            : txs)
        : Promise.resolve([] as Transaction[]),
    [currentMonth, mode, params?.groupId]
  );

  const yearlyTransactions = useLiveQuery(
    () =>
      mode === "yearly"
        ? db.transactions
          .where("year_month")
          .between(`${currentYear}-01`, `${currentYear}-12`, true, true)
          .toArray()
          .then(txs => params?.groupId
            ? txs.filter(t => t.group_id === params.groupId)
            : txs)
        : Promise.resolve([] as Transaction[]),
    [currentYear, mode, params?.groupId]
  );

  const previousMonthTransactions = useLiveQuery(
    () =>
      mode === "monthly"
        ? db.transactions.where("year_month").equals(previousMonth).toArray()
          .then(txs => params?.groupId
            ? txs.filter(t => t.group_id === params.groupId)
            : txs)
        : Promise.resolve([] as Transaction[]),
    [previousMonth, mode, params?.groupId]
  );

  const categories = useLiveQuery(() => db.categories.toArray());
  const contexts = useLiveQuery(() => db.contexts.toArray());

  const groupMemberships = useLiveQuery(
    () => userId ? db.group_members.where("user_id").equals(userId).toArray() : Promise.resolve([] as GroupMember[]),
    [userId]
  );

  const activeGroupMembers = useLiveQuery(
    () => params?.groupId
      ? db.group_members.where("group_id").equals(params.groupId).toArray()
      : Promise.resolve([] as GroupMember[]),
    [params?.groupId]
  );

  const categoryBudgets = useLiveQuery(() => db.category_budgets.toArray());

  // --- Worker Management ---
  const workerRef = useRef<Worker | null>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // State for worker results
  const [workerResult, setWorkerResult] = useState<StatisticsWorkerResponse["payload"]>({
    monthlyStats: { income: 0, expense: 0, investment: 0, byCategory: [] },
    yearlyStats: { income: 0, expense: 0, investment: 0, byCategory: [] },
    monthlyNetBalance: 0,
    yearlyNetBalance: 0,
    monthlyCategoryPercentages: [],
    yearlyCategoryPercentages: [],
    monthlyExpensesByHierarchy: [],
    yearlyExpensesByHierarchy: [],
    monthlyTrendData: [],
    monthlyCashFlow: [],
    contextStats: [],
    dailyCumulativeExpenses: [],
    monthlyExpenses: [],
    monthlyIncome: [],
    monthlyInvestments: [],
    monthlyContextTrends: [],
    monthlyRecurringSplit: [],
    groupBalances: [],
    monthlyBudgetHealth: [],
  });

  useEffect(() => {
    // Initialize worker
    workerRef.current = new StatsWorker();

    // Listen for messages
    workerRef.current.onmessage = (event: MessageEvent<StatisticsWorkerResponse>) => {
      if (event.data.type === "STATS_RESULT") {
        setWorkerResult(event.data.payload);
        setIsLoading(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Send data to worker when it changes
  useEffect(() => {
    if (
      workerRef.current &&
      (transactions || yearlyTransactions) &&
      categories &&
      contexts
    ) {
      if (!isLoading) setIsLoading(true); // Set loading if not already matching

      const message: StatisticsWorkerRequest = {
        type: "CALCULATE_STATS",
        payload: {
          transactions: transactions || [],
          yearlyTransactions: yearlyTransactions || [],
          categories,
          contexts,
          groupId: params?.groupId,
          mode,
          currentMonth,
          currentYear,
          userId,
          groupMemberships,
          activeGroupMembers,
          categoryBudgets,
        },
      };
      workerRef.current.postMessage(message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    transactions,
    yearlyTransactions,
    categories,
    contexts,
    params?.groupId,
    mode,
    currentMonth,
    currentYear,
    userId,
    groupMemberships,
  ]);


  // --- Comparisons & Helpers ---
  const getEffectiveAmount = useCallback((t: Transaction) => {
    if (!params?.groupId && !t.group_id) return t.amount;
    if (!groupMemberships || groupMemberships.length === 0) return t.amount;

    const share = groupMemberships.find(m => m.group_id === t.group_id)
    if (share) return (t.amount * share.share) / 100;
    return t.amount;
  }, [groupMemberships, params?.groupId]);

  const monthlyComparison = useMemo(() => {
    if (mode !== "monthly" || !transactions || !previousMonthTransactions)
      return {
        income: { current: 0, previous: 0, change: 0, trend: "neutral" },
        expense: { current: 0, previous: 0, change: 0, trend: "neutral" },
        balance: { current: 0, previous: 0, change: 0, trend: "neutral" },
        savingRate: { current: 0, previous: 0, change: 0, trend: "neutral" },
      };

    const current = { income: workerResult.monthlyStats.income, expense: workerResult.monthlyStats.expense };
    const previous = previousMonthTransactions.reduce((acc, t) => {
      const amt = getEffectiveAmount(t);
      if (t.type === 'income') acc.income += amt;
      if (t.type === 'expense') acc.expense += amt;
      return acc;
    }, { income: 0, expense: 0 });

    const calculateChange = (curr: number, prev: number) => {
      if (prev === 0) return curr === 0 ? 0 : 100;
      return ((curr - prev) / prev) * 100;
    };

    return {
      income: {
        current: current.income,
        previous: previous.income,
        change: calculateChange(current.income, previous.income),
        trend: current.income >= previous.income ? "up" : "down"
      },
      expense: {
        current: current.expense,
        previous: previous.expense,
        change: calculateChange(current.expense, previous.expense),
        trend: current.expense <= previous.expense ? "down" : "up"
      },
      balance: {
        current: current.income - current.expense,
        previous: previous.income - previous.expense,
        change: calculateChange(current.income - current.expense, previous.income - previous.expense),
        trend: (current.income - current.expense) >= (previous.income - previous.expense) ? "up" : "down"
      },
      savingRate: {
        current: current.income ? ((current.income - current.expense) / current.income) * 100 : 0,
        previous: previous.income ? ((previous.income - previous.expense) / previous.income) * 100 : 0,
        change: 0,
        trend: "neutral"
      }
    }
  }, [workerResult.monthlyStats, previousMonthTransactions, mode, getEffectiveAmount]);

  const previousYearTransactions = useLiveQuery(
    () =>
      mode === "yearly"
        ? db.transactions
          .where("year_month")
          .between(`${previousYear}-01`, `${previousYear}-12`, true, true)
          .toArray()
          .then(txs => params?.groupId
            ? txs.filter(t => t.group_id === params.groupId)
            : txs)
        : Promise.resolve([] as Transaction[]),
    [previousYear, mode, params?.groupId]
  );

  const yearlyComparison = useMemo(() => {
    if (mode !== "yearly" || !yearlyTransactions || !previousYearTransactions)
      return {
        income: { current: 0, previous: 0, change: 0, trend: "neutral" },
        expense: { current: 0, previous: 0, change: 0, trend: "neutral" },
        balance: { current: 0, previous: 0, change: 0, trend: "neutral" },
        savingRate: { current: 0, previous: 0, change: 0, trend: "neutral" },
      };

    const current = { income: workerResult.yearlyStats.income, expense: workerResult.yearlyStats.expense };
    const previous = previousYearTransactions.reduce((acc, t) => {
      const amt = getEffectiveAmount(t);
      if (t.type === 'income') acc.income += amt;
      if (t.type === 'expense') acc.expense += amt;
      return acc;
    }, { income: 0, expense: 0 });

    const calculateChange = (curr: number, prev: number) => {
      if (prev === 0) return curr === 0 ? 0 : 100;
      return ((curr - prev) / prev) * 100;
    };

    return {
      income: {
        current: current.income,
        previous: previous.income,
        change: calculateChange(current.income, previous.income),
        trend: current.income >= previous.income ? "up" : "down"
      },
      expense: {
        current: current.expense,
        previous: previous.expense,
        change: calculateChange(current.expense, previous.expense),
        trend: current.expense <= previous.expense ? "down" : "up"
      },
      balance: {
        current: current.income - current.expense,
        previous: previous.income - previous.expense,
        change: calculateChange(current.income - current.expense, previous.income - previous.expense),
        trend: (current.income - current.expense) >= (previous.income - previous.expense) ? "up" : "down"
      },
      savingRate: {
        current: current.income ? ((current.income - current.expense) / current.income) * 100 : 0,
        previous: previous.income ? ((previous.income - previous.expense) / previous.income) * 100 : 0,
        change: 0,
        trend: "neutral"
      }
    }
  }, [workerResult.yearlyStats, previousYearTransactions, mode, getEffectiveAmount]);

  const burnRate = useMemo(() => {
    const [yearStr, monthStr] = currentMonth.split("-");
    const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();
    const today = new Date();
    const isCurrentMonth = currentMonth === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const daysElapsed = isCurrentMonth ? today.getDate() : daysInMonth;
    const daysRemaining = daysInMonth - daysElapsed;

    const expense = workerResult.monthlyStats.expense;

    return {
      total: expense,
      dailyAverage: daysElapsed > 0 ? expense / daysElapsed : 0,
      projectedTotal: daysElapsed > 0 ? (expense / daysElapsed) * daysInMonth : 0,
      daysElapsed,
      daysRemaining
    }
  }, [currentMonth, workerResult.monthlyStats.expense]);



  const yearlyBurnRate = useMemo(() => {
    const year = parseInt(currentYear);
    const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    const daysInYear = isLeapYear ? 366 : 365;

    const today = new Date();
    const isCurrentYear = currentYear === today.getFullYear().toString();

    let daysElapsed = daysInYear;
    if (isCurrentYear) {
      const startOfYear = new Date(year, 0, 0);
      const diff = today.getTime() - startOfYear.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      daysElapsed = Math.floor(diff / oneDay);
    }

    const daysRemaining = daysInYear - daysElapsed;
    const expense = workerResult.yearlyStats.expense;

    return {
      total: expense,
      dailyAverage: daysElapsed > 0 ? expense / daysElapsed : 0,
      projectedTotal: daysElapsed > 0 ? (expense / daysElapsed) * daysInYear : 0,
      daysElapsed,
      daysRemaining
    }
  }, [currentYear, workerResult.yearlyStats.expense]);

  return {
    ...workerResult,
    monthlyComparison,
    yearlyComparison,
    burnRate,
    yearlyBurnRate,
    // Map trend data to localized names
    monthlyTrendData: workerResult.monthlyTrendData.map(d => ({
      ...d,
      period: getMonthNames()[d.monthIndex]
    })),
    monthlyCashFlow: workerResult.monthlyCashFlow.map(d => ({
      ...d,
      period: getMonthNames()[d.monthIndex]
    })),
    monthlyExpenses: workerResult.monthlyExpenses ? workerResult.monthlyExpenses.map(d => ({
      ...d,
      month: getMonthNames()[d.monthIndex]
    })) : [],
    monthlyIncome: workerResult.monthlyIncome ? workerResult.monthlyIncome.map(d => ({
      ...d,
      month: getMonthNames()[d.monthIndex]
    })) : [],
    monthlyInvestments: workerResult.monthlyInvestments ? workerResult.monthlyInvestments.map(d => ({
      ...d,
      month: getMonthNames()[d.monthIndex]
    })) : [],
    monthlyContextTrends: workerResult.monthlyContextTrends ? workerResult.monthlyContextTrends.map(d => ({
      ...d,
      period: getMonthNames()[d.monthIndex]
    })) : [],
    monthlyRecurringSplit: workerResult.monthlyRecurringSplit ? workerResult.monthlyRecurringSplit.map(d => ({
      ...d,
      period: getMonthNames()[d.monthIndex]
    })) : [],
    groupBalances: workerResult.groupBalances || [], // No mapping needed as it uses member IDs/names

    // Placeholders
    previousMonthComparison: null,
    categoryComparison: [] as any[],
    previousMonth,
    previousYear,
    previousMonthCumulativeExpenses: [] as any[],
    yearlyCumulativeExpenses: [] as any[],
    previousYearCumulativeExpenses: [] as any[],
    isLoading,
  };
}
