import { useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import i18n from "@/i18n";
import { format } from "date-fns";

/**
 * Hook that monitors budget usage and shows warnings
 */
export function useBudgetNotifications() {
  const { user } = useAuth();
  const currentMonth = format(new Date(), "yyyy-MM");

  // Track which warnings we've already shown this session
  const shownWarnings = useRef<Set<string>>(new Set());

  // Get settings with budget
  const settings = useLiveQuery(
    () => (user ? db.user_settings.get(user.id) : undefined),
    [user]
  );

  // Get current month expenses
  const monthlyExpenses = useLiveQuery(async () => {
    if (!user) return 0;

    const transactions = await db.transactions
      .where("year_month")
      .equals(currentMonth)
      .toArray();

    return transactions
      .filter(
        (t) => t.user_id === user.id && t.type === "expense" && !t.deleted_at
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [user, currentMonth]);

  useEffect(() => {
    if (!settings?.monthly_budget || monthlyExpenses === undefined) return;

    const budget = settings.monthly_budget;
    const percentage = (monthlyExpenses / budget) * 100;
    const t = i18n.t;

    // Warning at 80%
    if (percentage >= 80 && percentage < 100) {
      const warningKey = `warning-80-${currentMonth}`;
      if (!shownWarnings.current.has(warningKey)) {
        shownWarnings.current.add(warningKey);
        toast.warning(
          t("budget_warning_80", {
            percentage: percentage.toFixed(0),
            remaining: `€${(budget - monthlyExpenses).toFixed(2)}`,
          }) ||
            `You've used ${percentage.toFixed(0)}% of your monthly budget. €${(
              budget - monthlyExpenses
            ).toFixed(2)} remaining.`,
          {
            duration: 4000,
          }
        );
      }
    }

    // Alert when exceeded
    if (percentage >= 100) {
      const warningKey = `warning-100-${currentMonth}`;
      if (!shownWarnings.current.has(warningKey)) {
        shownWarnings.current.add(warningKey);
        toast.error(
          t("budget_exceeded_notification", {
            amount: `€${(monthlyExpenses - budget).toFixed(2)}`,
          }) ||
            `Budget exceeded! You're €${(monthlyExpenses - budget).toFixed(
              2
            )} over your monthly limit.`,
          {
            duration: 4000,
          }
        );
      }
    }
  }, [settings?.monthly_budget, monthlyExpenses, currentMonth]);
}
