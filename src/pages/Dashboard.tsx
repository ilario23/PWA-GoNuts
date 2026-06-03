import { useTransactions } from "@/hooks/useTransactions";
import { useStatistics } from "@/hooks/useStatistics";
import { useSettings } from "@/hooks/useSettings";
import { useCategories } from "@/hooks/useCategories";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, ChevronRight, Plus } from "lucide-react";
import {
  TransactionDialog,
  TransactionFormData,
} from "@/components/TransactionDialog";
import { createElement, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getIconComponent } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Transaction } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";

// Currency symbol from code (€, $, £, etc.)
function getCurrencySymbol(code: string): string {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency: code })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? code
  );
}

// Transaction row for the "Recent" section
function RecentTxRow({
  tx,
  catName,
  catColor,
  catIcon,
  currencySymbol,
  onEdit,
}: {
  tx: Transaction;
  catName: string;
  catColor: string;
  catIcon: string;
  currencySymbol: string;
  onEdit: (tx: Transaction) => void;
}) {
  const IconComponent = getIconComponent(catIcon);
  const sign = tx.type === "income" ? "+" : tx.type === "investment" ? "↗" : "−";
  const amountColor =
    tx.type === "income"
      ? "text-[hsl(var(--gonuts-good))]"
      : tx.type === "investment"
      ? "text-[hsl(var(--color-investment))]"
      : "text-foreground";

  return (
    <button
      onClick={() => onEdit(tx)}
      className="flex items-center gap-3 w-full py-3 text-left"
    >
      <span
        className="flex items-center justify-center w-10 h-10 rounded-[14px] shrink-0"
        style={{ backgroundColor: catColor, color: "#fff" }}
      >
        {IconComponent ? (
          createElement(IconComponent, { className: "w-5 h-5" })
        ) : (
          <span className="text-xs font-bold">{catName[0]}</span>
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[15px] truncate leading-tight">
          {tx.description || catName}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">{catName}</div>
      </div>
      <span className={cn("num font-bold text-[15px] whitespace-nowrap", amountColor)}>
        {sign}
        {currencySymbol}
        {tx.amount.toFixed(2)}
      </span>
    </button>
  );
}

export function Dashboard() {
  const { transactions, addTransaction, updateTransaction } =
    useTransactions();
  const { categories } = useCategories();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { t } = useTranslation();

  const now = new Date();
  const currentMonth = format(now, "yyyy-MM");
  const monthName = format(now, "MMMM");

  const {
    monthlyStats,
    dailyCumulativeExpenses,
    isLoading,
    monthlyBudgetHealth,
  } = useStatistics({ selectedMonth: currentMonth, userId: user?.id });

  const currencySymbol = getCurrencySymbol(settings?.currency ?? "EUR");

  // Category lookup map for icons
  const catMap = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories]
  );

  // Stats
  const { totalIncome, totalExpense, totalInvestment } = useMemo(
    () => ({
      totalIncome: monthlyStats.income,
      totalExpense: monthlyStats.expense,
      totalInvestment: monthlyStats.investment,
    }),
    [monthlyStats.income, monthlyStats.expense, monthlyStats.investment]
  );

  // Hero number — integer and cents
  const heroInt = Math.floor(totalExpense);
  const heroCents = (totalExpense % 1).toFixed(2).slice(1); // ".XX"

  // Expense count this month
  const expenseCount = (transactions ?? []).filter(
    (tx) =>
      !tx.deleted_at &&
      tx.type === "expense" &&
      tx.year_month === currentMonth
  ).length;

  // Top categories for "Where it went" (top 4 by value, expenses only)
  const topCategories = useMemo(() => {
    const sorted = [...monthlyStats.byCategory]
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
    return sorted.map((c) => {
      const fullCat = (categories ?? []).find((cat) => cat.name === c.name);
      return { ...c, icon: fullCat?.icon ?? "Folder" };
    });
  }, [monthlyStats.byCategory, categories]);

  // Daily amounts derived from cumulative (for bar chart)
  const dailyAmounts = useMemo(() => {
    return dailyCumulativeExpenses.map((d, i) => {
      const hasData = d.cumulative !== undefined;
      const prev =
        i > 0 ? dailyCumulativeExpenses[i - 1].cumulative ?? 0 : 0;
      const curr = d.cumulative ?? 0;
      return {
        day: Number(d.day),
        value: hasData ? Math.max(0, curr - prev) : 0,
        hasData,
      };
    });
  }, [dailyCumulativeExpenses]);

  const maxDailyAmount = useMemo(
    () => Math.max(...dailyAmounts.map((d) => d.value), 1),
    [dailyAmounts]
  );

  const hasDailyData = useMemo(
    () => dailyAmounts.some((d) => d.value > 0),
    [dailyAmounts]
  );

  const today = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Recent transactions (last 4, current month, not deleted)
  const recentTransactions = (transactions ?? [])
    .filter((tx) => !tx.deleted_at && tx.year_month === currentMonth)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setIsDialogOpen(true);
  }, []);

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

  const handleOpenChange = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setEditingTransaction(null);
  }, []);

  return (
    <div className="pb-4">
      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="px-0 pt-2 pb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {monthName} · {t("so_far")}
          </p>
          {/* Desktop add button */}
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex gap-1.5"
            onClick={() => {
              setEditingTransaction(null);
              setIsDialogOpen(true);
            }}
            data-testid="add-transaction-desktop"
          >
            <Plus className="h-4 w-4" />
            {t("add_transaction")}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="num font-extrabold leading-none tracking-tight"
                style={{ fontSize: "clamp(2.5rem,8vw,3.5rem)" }}>
                {currencySymbol}{heroInt.toLocaleString()}
              </span>
              <span className="num text-2xl text-muted-foreground font-bold">{heroCents}</span>
            </div>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              {t("spent_on_transactions", { count: expenseCount })}
            </p>
          </>
        )}

        {/* Mini stat cards */}
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          {[
            {
              label: t("income"),
              val: totalIncome,
              Icon: ArrowDownLeft,
              color: "hsl(var(--gonuts-good))",
            },
            {
              label: t("expense"),
              val: totalExpense,
              Icon: ArrowUpRight,
              color: "hsl(var(--foreground))",
            },
            {
              label: t("invested"),
              val: totalInvestment,
              Icon: TrendingUp,
              color: "hsl(var(--color-investment))",
            },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-[var(--radius)] border border-border/50 bg-card
                shadow-[0_1px_0_rgba(26,23,20,0.04),0_6px_16px_-8px_rgba(26,23,20,0.12)]
                dark:shadow-[0_1px_0_rgba(0,0,0,0.12),0_6px_16px_-8px_rgba(0,0,0,0.30)]
                p-3"
            >
              <div className="flex items-center gap-1.5 mb-2" style={{ color: m.color }}>
                <m.Icon className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wide">{m.label}</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-14" />
              ) : (
                <span className="num font-bold text-base">
                  {currencySymbol}{Math.round(m.val).toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Where it went ──────────────────────────────────── */}
      {(topCategories.length > 0 || isLoading) && (
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-lg font-bold">{t("where_it_went")}</h2>
            <Link
              to="/statistics"
              className="flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("see_all")}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="rounded-[var(--radius)] border border-border/50 bg-card p-4
            shadow-[0_1px_0_rgba(26,23,20,0.04),0_6px_16px_-8px_rgba(26,23,20,0.12)]
            dark:shadow-[0_1px_0_rgba(0,0,0,0.12),0_6px_16px_-8px_rgba(0,0,0,0.30)]">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-3 w-full rounded-full" />
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <>
                {/* Segmented bar */}
                <div className="flex h-3 rounded-full overflow-hidden mb-4">
                  {topCategories.map((c) => (
                    <div
                      key={c.name}
                      style={{
                        width: `${(c.value / totalExpense) * 100}%`,
                        backgroundColor: c.color,
                      }}
                      title={c.name}
                    />
                  ))}
                  <div className="flex-1 bg-muted" />
                </div>
                {/* Category rows */}
                <div className="space-y-0">
                  {topCategories.map((c, i) => {
                    const IconComp = getIconComponent(c.icon);
                    const pct = totalExpense > 0 ? ((c.value / totalExpense) * 100).toFixed(0) : "0";
                    return (
                      <div
                        key={c.name}
                        className={cn(
                          "flex items-center justify-between py-2.5",
                          i > 0 && "border-t border-border/40"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                            style={{ backgroundColor: c.color, color: "#fff" }}
                          >
                            {IconComp ? (
                              <IconComp className="w-4 h-4" />
                            ) : (
                              <span className="text-xs font-bold">{c.name[0]}</span>
                            )}
                          </span>
                          <span className="font-semibold text-sm">{c.name}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[11px] text-muted-foreground">{pct}%</span>
                          <span className="num font-bold text-sm">
                            {currencySymbol}{c.value.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── Budgets ────────────────────────────────────────── */}
      {(monthlyBudgetHealth.length > 0 || isLoading) && (
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-lg font-bold">{t("budget")}</h2>
            <Link
              to="/settings"
              className="flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("manage")}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="rounded-[var(--radius)] border border-border/50 bg-card
            shadow-[0_1px_0_rgba(26,23,20,0.04),0_6px_16px_-8px_rgba(26,23,20,0.12)]
            dark:shadow-[0_1px_0_rgba(0,0,0,0.12),0_6px_16px_-8px_rgba(0,0,0,0.30)]">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              monthlyBudgetHealth.slice(0, 3).map((b, i) => {
                const catObj = catMap.get(b.categoryId);
                const IconComp = catObj ? getIconComponent(catObj.icon) : null;
                const over = b.isOverBudget;
                const warn = b.percentage >= 80 && !over;
                const barColor = over
                  ? "hsl(var(--gonuts-bad))"
                  : warn
                  ? "hsl(var(--chart-5))"
                  : b.categoryColor;
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "px-4 py-3",
                      i > 0 && "border-t border-border/40"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex items-center justify-center w-8 h-8 rounded-[10px] shrink-0"
                          style={{ backgroundColor: b.categoryColor, color: "#fff" }}
                        >
                          {IconComp ? (
                            <IconComp className="w-4 h-4" />
                          ) : (
                            <span className="text-xs font-bold">{b.categoryName[0]}</span>
                          )}
                        </span>
                        <span className="font-semibold text-sm">{b.categoryName}</span>
                      </div>
                      <div className="num text-sm font-bold">
                        <span style={{ color: over ? "hsl(var(--gonuts-bad))" : undefined }}>
                          {currencySymbol}{b.spent.toFixed(0)}
                        </span>
                        <span className="text-muted-foreground font-normal">
                          {" "}/ {currencySymbol}{b.limit.toFixed(0)}
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, b.percentage)}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                    {(over || warn) && (
                      <p
                        className="text-xs font-semibold mt-1.5"
                        style={{ color: barColor }}
                      >
                        {over
                          ? t("over_by", {
                              amount: `${currencySymbol}${(b.spent - b.limit).toFixed(0)}`,
                            })
                          : t("budget_getting_tight", {
                              pct: b.percentage.toFixed(0),
                            })}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* ── Daily rhythm ───────────────────────────────────── */}
      <section className="mb-5">
        <h2 className="text-lg font-bold mb-2.5">{t("daily_rhythm")}</h2>
        <div className="rounded-[var(--radius)] border border-border/50 bg-card p-4
          shadow-[0_1px_0_rgba(26,23,20,0.04),0_6px_16px_-8px_rgba(26,23,20,0.12)]
          dark:shadow-[0_1px_0_rgba(0,0,0,0.12),0_6px_16px_-8px_rgba(0,0,0,0.30)]">
          {isLoading ? (
            <Skeleton className="h-[84px] w-full" />
          ) : !hasDailyData ? (
            <div className="flex items-center justify-center h-[84px] text-sm text-muted-foreground">
              {t("no_spending_this_month")}
            </div>
          ) : (
            <>
              <div className="flex items-end gap-[3px] h-[84px]">
                {dailyAmounts.map((d) => {
                  const h = d.hasData
                    ? Math.max(3, (d.value / maxDailyAmount) * 80)
                    : 3;
                  const isToday = d.day === today;
                  const bg = isToday
                    ? "hsl(var(--gonuts-orange))"
                    : d.value > 0
                    ? "hsl(var(--foreground))"
                    : "hsl(var(--muted))";
                  return (
                    <div
                      key={d.day}
                      className="flex-1 rounded-[3px] transition-all"
                      style={{ height: h, backgroundColor: bg }}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <span>1 {monthName}</span>
                <span>
                  {t("today")}
                </span>
                <span>
                  {daysInMonth} {monthName}
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Recent ─────────────────────────────────────────── */}
      <section className="mb-5">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-lg font-bold">{t("recent")}</h2>
          <Link
            to="/transactions"
            className="flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("see_all")}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="rounded-[var(--radius)] border border-border/50 bg-card px-4
          shadow-[0_1px_0_rgba(26,23,20,0.04),0_6px_16px_-8px_rgba(26,23,20,0.12)]
          dark:shadow-[0_1px_0_rgba(0,0,0,0.12),0_6px_16px_-8px_rgba(0,0,0,0.30)]">
          {isLoading ? (
            <div className="py-3 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentTransactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("no_transactions")}
            </p>
          ) : (
            <div>
              {recentTransactions.map((tx, i) => {
                const cat = catMap.get(tx.category_id ?? "");
                return (
                  <div
                    key={tx.id}
                    className={cn(i > 0 && "border-t border-border/40")}
                  >
                    <RecentTxRow
                      tx={tx}
                      catName={cat?.name ?? t("uncategorized", { defaultValue: "Uncategorized" })}
                      catColor={cat?.color ?? "#888"}
                      catIcon={cat?.icon ?? "Folder"}
                      currencySymbol={currencySymbol}
                      onEdit={handleEdit}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

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
