import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { subDays, format } from "date-fns";

/**
 * Hook to get the usage frequency of categories in the last specific number of days.
 * Returns a map of category_id -> count.
 * 
 * @param days Lookback period in days (default: 30)
 */
export function useRecentCategoryUsage(days: number = 30) {
    const usageStats = useLiveQuery(async () => {
        const result: Record<string, number> = {};

        // Calculate the date threshold
        const startDate = format(subDays(new Date(), days), "yyyy-MM-dd");

        // Query transactions from the last X days
        // We use the 'date' index for efficient range query
        const transactions = await db.transactions
            .where("date")
            .aboveOrEqual(startDate)
            .toArray();

        // Count category usage
        for (const tx of transactions) {
            if (tx.category_id) {
                result[tx.category_id] = (result[tx.category_id] || 0) + 1;
            }
        }

        return result;
    }, [days]);

    return usageStats || {};
}
