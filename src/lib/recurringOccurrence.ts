import { v5 as uuidv5 } from "uuid";

/**
 * Fixed namespace UUID for deriving deterministic transaction IDs from
 * (recurring_template_id + occurrence date). Must never change once deployed.
 */
export const RECURRING_OCCURRENCE_NAMESPACE =
    "3e3b807a-2c6d-4b9e-9c1d-8f4a2b7e6d91";

/** Stable text key stored in DB and used for idempotency (before hashing to UUID). */
export function recurringOccurrenceKey(
    recurringTransactionId: string,
    occurrenceDateYmd: string
): string {
    return `${recurringTransactionId}|${occurrenceDateYmd}`;
}

/** Deterministic transaction primary key for a recurring occurrence (same on all devices). */
export function recurringOccurrenceTransactionId(
    recurringTransactionId: string,
    occurrenceDateYmd: string
): string {
    return uuidv5(
        recurringOccurrenceKey(recurringTransactionId, occurrenceDateYmd),
        RECURRING_OCCURRENCE_NAMESPACE
    );
}
