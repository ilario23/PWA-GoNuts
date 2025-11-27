import { useEffect, useRef } from "react";
import { db, RecurringTransaction } from "../lib/db";
import { syncManager } from "../lib/sync";
import { v4 as uuidv4 } from "uuid";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  parseISO,
  format,
} from "date-fns";
import { handleError, notifySuccess } from "@/lib/error-handler";
import { TIMING } from "@/lib/constants";
import i18n from "@/i18n";

/**
 * Hook that automatically generates recurring transactions on app load
 * and shows notifications for generated transactions
 */
export function useAutoGenerate() {
  const hasRun = useRef(false);

  useEffect(() => {
    // Only run once per app session
    if (hasRun.current) return;
    hasRun.current = true;

    const generate = async () => {
      try {
        const all = await db.recurring_transactions.toArray();
        const active = all.filter((rt) => rt.active === 1 && !rt.deleted_at);
        const now = new Date();
        let generatedCount = 0;
        let totalAmount = 0;

        for (const rt of active) {
          let nextDate = rt.last_generated
            ? parseISO(rt.last_generated)
            : parseISO(rt.start_date);

          // If already generated, calculate next occurrence
          if (rt.last_generated) {
            nextDate = getNextDate(nextDate, rt.frequency);
          }

          // Generate all missed transactions up to today
          while (
            isBefore(nextDate, now) ||
            nextDate.toDateString() === now.toDateString()
          ) {
            // Check end_date
            if (rt.end_date && isBefore(parseISO(rt.end_date), nextDate)) break;

            // Create transaction
            const transactionId = uuidv4();
            const dateStr = format(nextDate, "yyyy-MM-dd");

            await db.transactions.add({
              id: transactionId,
              user_id: rt.user_id,
              group_id: rt.group_id || null,
              paid_by_user_id: rt.paid_by_user_id || null,
              category_id: rt.category_id,
              context_id: rt.context_id,
              type: rt.type,
              amount: rt.amount,
              date: dateStr,
              year_month: dateStr.substring(0, 7),
              description: rt.description,
              pendingSync: 1,
              deleted_at: null,
            });

            // Update last_generated
            await db.recurring_transactions.update(rt.id, {
              last_generated: nextDate.toISOString(),
              pendingSync: 1,
            });

            generatedCount++;
            if (rt.type === "expense") {
              totalAmount += rt.amount;
            }

            // Calculate next date for loop
            nextDate = getNextDate(nextDate, rt.frequency);
          }
        }

        // Show notification if transactions were generated
        if (generatedCount > 0) {
          const t = i18n.t;
          notifySuccess(
            t("recurring_generated", {
              count: generatedCount,
              amount: `€${totalAmount.toFixed(2)}`,
            }) ||
              `Generated ${generatedCount} recurring transaction(s) totaling €${totalAmount.toFixed(
                2
              )}`
          );

          // Trigger sync
          syncManager.sync();
        }
      } catch (error) {
        handleError(
          error,
          "error",
          {
            source: "useAutoGenerate",
            operation: "generate",
          },
          { showToast: false }
        );
      }
    };

    // Small delay to ensure DB is ready
    const timeout = setTimeout(generate, TIMING.AUTO_GENERATE_DELAY);
    return () => clearTimeout(timeout);
  }, []);
}

function getNextDate(
  date: Date,
  frequency: RecurringTransaction["frequency"]
): Date {
  switch (frequency) {
    case "daily":
      return addDays(date, 1);
    case "weekly":
      return addWeeks(date, 1);
    case "monthly":
      return addMonths(date, 1);
    case "yearly":
      return addYears(date, 1);
    default:
      return addMonths(date, 1);
  }
}
