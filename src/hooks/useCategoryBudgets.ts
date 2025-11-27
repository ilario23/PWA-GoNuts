import { useLiveQuery } from "dexie-react-hooks";
import { db, CategoryBudget } from "../lib/db";
import { syncManager } from "../lib/sync";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "./useAuth";
import { useMemo } from "react";
import { format } from "date-fns";
import {
  CategoryBudgetInputSchema,
  validate,
} from "../lib/validation";

export interface CategoryBudgetWithSpent extends CategoryBudget {
  spent: number;
  percentage: number;
  remaining: number;
  isOverBudget: boolean;
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
}

export function useCategoryBudgets(
  selectedMonth?: string,
  selectedYear?: string
) {
  const { user } = useAuth();
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
    const validatedData = validate(CategoryBudgetInputSchema, {
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
    syncManager.sync();
  };

  // Remove budget for a category
  const removeCategoryBudget = async (budgetId: string) => {
    await db.category_budgets.update(budgetId, {
      deleted_at: new Date().toISOString(),
      pendingSync: 1,
    });
    syncManager.sync();
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
