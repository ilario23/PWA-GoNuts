import { db, RecurringTransaction } from "./db";
import { syncManager } from "./sync";
import {
    addDays,
    addWeeks,
    addMonths,
    addYears,
    isBefore,
    parseISO,
    format,
} from "date-fns";
import {
    recurringOccurrenceKey,
    recurringOccurrenceTransactionId,
} from "./recurringOccurrence";

export interface ProcessRecurringResult {
    /** New transaction rows inserted this run */
    generatedCount: number;
    /** Sum of amounts for newly generated expense occurrences */
    expenseTotal: number;
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

/**
 * Parses last_generated / start_date as a calendar date (YYYY-MM-DD or ISO).
 */
function parseRecurringAnchor(value: string): Date {
    const d = parseISO(value.length <= 10 ? `${value}T12:00:00` : value);
    return d;
}

/**
 * Processes all active recurring transactions and generates new transactions
 * if they are due. Uses deterministic transaction IDs and recurrence_key so
 * multiple devices converge to a single row per occurrence.
 */
export async function processRecurringTransactions(): Promise<ProcessRecurringResult> {
    const all = await db.recurring_transactions.toArray();
    const active = all.filter((rt) => rt.active === 1 && !rt.deleted_at);
    const now = new Date();
    let generatedCount = 0;
    let expenseTotal = 0;
    let changesMade = false;

    for (const rt of active) {
        let nextDate = rt.last_generated
            ? parseRecurringAnchor(rt.last_generated)
            : parseRecurringAnchor(rt.start_date);

        if (rt.last_generated) {
            nextDate = getNextDate(nextDate, rt.frequency);
        }

        while (
            isBefore(nextDate, now) ||
            nextDate.toDateString() === now.toDateString()
        ) {
            if (rt.end_date && isBefore(parseISO(rt.end_date), nextDate)) break;

            const dateStr = format(nextDate, "yyyy-MM-dd");
            const transactionId = recurringOccurrenceTransactionId(rt.id, dateStr);
            const recurrenceKey = recurringOccurrenceKey(rt.id, dateStr);

            const existing = await db.transactions.get(transactionId);
            if (existing) {
                await db.recurring_transactions.update(rt.id, {
                    last_generated: dateStr,
                    pendingSync: 1,
                });
                changesMade = true;
                nextDate = getNextDate(nextDate, rt.frequency);
                continue;
            }

            await db.transactions.add({
                id: transactionId,
                user_id: rt.user_id,
                group_id: rt.group_id || null,
                paid_by_member_id: rt.paid_by_member_id || null,
                category_id: rt.category_id,
                context_id: rt.context_id,
                type: rt.type,
                amount: rt.amount,
                date: dateStr,
                year_month: dateStr.substring(0, 7),
                description:
                    rt.description || `Recurring: ${rt.frequency}`,
                pendingSync: 1,
                deleted_at: null,
                recurring_transaction_id: rt.id,
                recurrence_occurrence_date: dateStr,
                recurrence_key: recurrenceKey,
            });

            await db.recurring_transactions.update(rt.id, {
                last_generated: dateStr,
                pendingSync: 1,
            });

            generatedCount++;
            if (rt.type === "expense") {
                expenseTotal += rt.amount;
            }
            changesMade = true;
            nextDate = getNextDate(nextDate, rt.frequency);
        }
    }

    if (changesMade) {
        syncManager.schedulePush();
    }

    return { generatedCount, expenseTotal };
}
