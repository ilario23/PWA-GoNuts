import { db } from "./db";
import { subDays, parseISO, isBefore } from "date-fns";

const CLEANUP_AGE_DAYS = 30;

/**
 * Permanently deletes soft-deleted records that have been synced and are older than 30 days.
 * This frees up space on the user's device.
 */
export async function cleanupSoftDeletedRecords() {
    console.log("[Cleanup] Starting soft-delete cleanup...");
    const thresholdDate = subDays(new Date(), CLEANUP_AGE_DAYS);
    let totalDeleted = 0;

    const tables = [
        db.transactions,
        db.categories,
        db.groups,
        db.group_members,
        db.contexts,
        db.recurring_transactions,
        db.category_budgets,
    ];

    for (const table of tables) {
        try {
            // Find records that are:
            // 1. Soft deleted (deleted_at is not null)
            // 2. Synced (pendingSync is 0 or undefined)
            // 3. Older than threshold
            // Note: We can't query all these conditions efficiently with Dexie in one go without compound indexes,
            // so we'll query by deleted_at (if indexed) or just filter.
            // Since deleted_at is indexed in most tables, we can use it?
            // Actually deleted_at is indexed.

            // However, Dexie doesn't support "where deleted_at < date" easily if deleted_at includes nulls?
            // Actually it does.

            const softDeleted = await table
                .filter((item: { deleted_at?: string | null; removed_at?: string | null; pendingSync?: number }) => (item.deleted_at != null || item.removed_at != null) && !item.pendingSync)
                .toArray();

            const toDelete = softDeleted.filter((item: { deleted_at?: string | null; removed_at?: string | null }) => {
                const dateStr = item.deleted_at || item.removed_at;
                if (!dateStr) return false;
                const deletedAt = parseISO(dateStr);
                return isBefore(deletedAt, thresholdDate);
            });

            if (toDelete.length > 0) {
                await table.bulkDelete(toDelete.map((item: { id: string }) => item.id));
                totalDeleted += toDelete.length;
                console.log(`[Cleanup] Deleted ${toDelete.length} records from ${table.name}`);
            }
        } catch (error) {
            console.error(`[Cleanup] Error cleaning table ${table.name}:`, error);
        }
    }

    if (totalDeleted > 0) {
        console.log(`[Cleanup] Completed. Total records permanently deleted: ${totalDeleted}`);
    } else {
        console.log("[Cleanup] No records to clean up.");
    }
}
