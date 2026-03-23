import { useEffect, useRef } from "react";
import { processRecurringTransactions } from "../lib/recurring";
import { syncManager } from "../lib/sync";
import { handleError, notifySuccess } from "@/lib/error-handler";
import { TIMING } from "@/lib/constants";
import i18n from "@/i18n";

/**
 * Hook that automatically generates recurring transactions on app load
 * and shows notifications for generated transactions.
 */
export function useAutoGenerate() {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const generate = async () => {
      try {
        const { generatedCount, expenseTotal } =
          await processRecurringTransactions();

        if (generatedCount > 0) {
          const t = i18n.t;
          notifySuccess(
            t("recurring_generated", {
              count: generatedCount,
              amount: `€${expenseTotal.toFixed(2)}`,
            }) ||
              `Generated ${generatedCount} recurring transaction(s) totaling €${expenseTotal.toFixed(
                2
              )}`
          );

          console.log(
            "[AutoGenerate] Generated transactions, triggering sync..."
          );
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

    const timeout = setTimeout(generate, TIMING.AUTO_GENERATE_DELAY);
    return () => clearTimeout(timeout);
  }, []);
}
