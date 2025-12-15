import { useLiveQuery } from "dexie-react-hooks";
import { db, CategoryBudget } from "../lib/db";
import { syncManager } from "../lib/sync";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "./useAuth";
import { useMemo } from "react";
import { format } from "date-fns";
import { getCategoryBudgetInputSchema, validate } from "../lib/validation";
import { useTranslation } from "react-i18next";

/**
 * Extended budget type with spending calculations and category info.
 */
export interface CategoryBudgetWithSpent extends CategoryBudget {
  /** Amount already spent against this budget */
  spent: number;
  /** Percentage of budget used (0-100+) */
  percentage: number;
  /** Remaining budget (can be negative if over) */
  remaining: number;
  /** Whether spending exceeds budget amount */
  isOverBudget: boolean;
  /** Name of the associated category */
  categoryName?: string;
  /** Color of the associated category */
  categoryColor?: string;
  /** Icon of the associated category */
  categoryIcon?: string;
}

/**
 * Hook for managing category-level budgets with spending tracking.
 *
 * Supports both monthly and yearly budget periods. Automatically calculates
 * spending against each budget and provides warnings for over-budget categories.
 *
 * @param selectedMonth - Month to track spending for (format: 'YYYY-MM')
 * @param selectedYear - Year to track spending for (format: 'YYYY')
 *
 * @returns Object containing:
 *   - `categoryBudgets`: Budgets enriched with spending data
 *   - `getBudgetForCategory`: Get budget for a specific category
 *   - `setCategoryBudget`: Create or update a category budget
 *   - `removeCategoryBudget`: Soft-delete a budget
 *   - `overBudgetCategories`: Categories that exceeded their budget
 *   - `warningCategories`: Categories at 80%+ of budget
 *
 * @example
 * ```tsx
 * const { categoryBudgets, setCategoryBudget, overBudgetCategories } = useCategoryBudgets();
 *
 * // Set a monthly budget of €500 for groceries
 * await setCategoryBudget(groceryCategoryId, 500, 'monthly');
 *
 * // Check for alerts
 * if (overBudgetCategories.length > 0) {
 *   alert(`${overBudgetCategories.length} categories over budget!`);
 * }
 * ```
 */
export function useCategoryBudgets(
  selectedMonth?: string,
  selectedYear?: string
) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const now = new Date();
  const currentMonth = selectedMonth || format(now, "yyyy-MM");
  const currentYear = selectedYear || format(now, "yyyy");

  // Get all category budgets
  const categoryBudgets = useLiveQuery(
    () =>
      user
        ? db.category_budgets
          .filter((b) => b.user_id === user.id && !b.deleted_at)
          .toArray()
        : [],
    [user?.id]
  );

  // Get categories for enrichment
  const categories = useLiveQuery(
    () =>
      user
        ? db.categories
          .filter((c) => c.user_id === user.id && !c.deleted_at)
          .toArray()
        : [],
    [user?.id]
  );

  // Get transactions for the current period
  const monthlyTransactions = useLiveQuery(
    () => db.transactions.where("year_month").equals(currentMonth).toArray(),
    [currentMonth]
  );

  const yearlyTransactions = useLiveQuery(
    () =>
      db.transactions
        .where("year_month")
        .between(`${currentYear}-01`, `${currentYear}-12`, true, true)
        .toArray(),
    [currentYear]
  );

  // Calculate spent amounts per category
  const categorySpending = useMemo(() => {
    const monthlySpending = new Map<string, number>();
    const yearlySpending = new Map<string, number>();

    monthlyTransactions?.forEach((t) => {
      if (t.deleted_at || t.type !== "expense") return;
      const current = monthlySpending.get(t.category_id) || 0;
      monthlySpending.set(t.category_id, current + Number(t.amount));
    });

    yearlyTransactions?.forEach((t) => {
      if (t.deleted_at || t.type !== "expense") return;
      const current = yearlySpending.get(t.category_id) || 0;
      yearlySpending.set(t.category_id, current + Number(t.amount));
    });

    return { monthly: monthlySpending, yearly: yearlySpending };
  }, [monthlyTransactions, yearlyTransactions]);

  // Enrich budgets with spent data and category info
  const budgetsWithSpent: CategoryBudgetWithSpent[] = useMemo(() => {
    if (!categoryBudgets || !categories) return [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return categoryBudgets.map((budget) => {
      const category = categoryMap.get(budget.category_id);
      const spending =
        budget.period === "monthly"
          ? categorySpending.monthly
          : categorySpending.yearly;
      const spent = spending.get(budget.category_id) || 0;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const remaining = budget.amount - spent;

      return {
        ...budget,
        spent,
        percentage,
        remaining,
        isOverBudget: spent > budget.amount,
        categoryName: category?.name,
        categoryColor: category?.color,
        categoryIcon: category?.icon,
      };
    });
  }, [categoryBudgets, categories, categorySpending]);

  // Get budget for a specific category
  const getBudgetForCategory = (
    categoryId: string,
    period: "monthly" | "yearly" = "monthly"
  ): CategoryBudgetWithSpent | undefined => {
    return budgetsWithSpent.find(
      (b) => b.category_id === categoryId && b.period === period
    );
  };

  // Add or update budget for a category
  const setCategoryBudget = async (
    categoryId: string,
    amount: number,
    period: "monthly" | "yearly" = "monthly"
  ) => {
    if (!user) return;

    // Validate input data
    const validatedData = validate(getCategoryBudgetInputSchema(t), {
      user_id: user.id,
      category_id: categoryId,
      amount,
      period,
    });

    // Check if budget already exists
    const existing = categoryBudgets?.find(
      (b) => b.category_id === categoryId && b.period === period
    );

    if (existing) {
      await db.category_budgets.update(existing.id, {
        amount: validatedData.amount,
        pendingSync: 1,
        updated_at: new Date().toISOString(),
      });
    } else {
      const id = uuidv4();
      await db.category_budgets.add({
        id,
        ...validatedData,
        pendingSync: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    syncManager.schedulePush();
  };

  // Remove budget for a category
  const removeCategoryBudget = async (budgetId: string) => {
    await db.category_budgets.update(budgetId, {
      deleted_at: new Date().toISOString(),
      pendingSync: 1,
    });
    syncManager.schedulePush();
  };

  // Get categories that are over budget
  const overBudgetCategories = useMemo(
    () => budgetsWithSpent.filter((b) => b.isOverBudget),
    [budgetsWithSpent]
  );

  // Get categories approaching budget (> 80%)
  const warningCategories = useMemo(
    () => budgetsWithSpent.filter((b) => b.percentage >= 80 && !b.isOverBudget),
    [budgetsWithSpent]
  );

  return {
    categoryBudgets: budgetsWithSpent,
    budgetsWithSpent, // Alias for backwards compatibility
    getBudgetForCategory,
    setCategoryBudget,
    removeCategoryBudget,
    overBudgetCategories,
    warningCategories,
  };
}
