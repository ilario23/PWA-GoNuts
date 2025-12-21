
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";

/**
 * Hook to retrieve the list of years that have transactions.
 * Includes the current year by default.
 */
export function useAvailableYears() {
    const years = useLiveQuery(async () => {
        // 1. Get all distinct years from the database
        // Since we don't have a distinct year index, we can iterate over unique keys or use a cursor.
        // 'year_month' is indexed. We can query it to find years.
        // Efficient approach for limited number of records:
        // iterate keys of 'year_month' index, extract year, unique set.

        // However, uniqueKeys only works if it's a primary key or unique index. 
        // year_month is just an index.

        // Alternative: Get min and max date/year_month, and check existence?
        // Or just iterate all unique 'year_month' values.

        // Let's try iterating uniqueKeys of year_month index if supported, or just all keys.
        // Dexie's uniqueKeys() provides unique values for an index.
        const uniqueYearMonths = await db.transactions.orderBy("year_month").uniqueKeys();

        const distinctYears = new Set<string>();
        const currentYear = new Date().getFullYear().toString();
        distinctYears.add(currentYear); // Always include current year

        uniqueYearMonths.forEach((key) => {
            if (typeof key === "string") {
                const year = key.split("-")[0];
                if (year) distinctYears.add(year);
            }
        });

        return Array.from(distinctYears).sort().reverse(); // Descending order
    });

    return years || [new Date().getFullYear().toString()];
}
