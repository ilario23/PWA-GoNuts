import { db } from "./db";

/**
 * Full local backup: a JSON dump of every Dexie table.
 * Covers data the CSV export does not (categories, budgets, groups,
 * contexts, recurring templates, import rules, settings) so users can
 * take their complete data with them or recover from a lost device.
 */

const BACKUP_VERSION = 1;

const BACKUP_TABLES = [
    "groups",
    "group_members",
    "transactions",
    "categories",
    "contexts",
    "recurring_transactions",
    "settlement_payments",
    "user_settings",
    "category_budgets",
    "profiles",
    "import_rules",
] as const;

interface BackupFile {
    app: "gonuts";
    backupVersion: number;
    exportedAt: string;
    tables: Record<string, unknown[]>;
}

export async function exportFullBackup(): Promise<void> {
    const tables: Record<string, unknown[]> = {};
    for (const tableName of BACKUP_TABLES) {
        tables[tableName] = await db.table(tableName).toArray();
    }

    const backup: BackupFile = {
        app: "gonuts",
        backupVersion: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        tables,
    };

    const blob = new Blob([JSON.stringify(backup)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gonuts-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Restore a backup file into the local database.
 * Existing rows with the same id are overwritten; rows that only exist
 * locally are left untouched. Sync flags are preserved as exported, so
 * anything that was pending will be pushed on the next sync.
 *
 * @returns number of restored rows
 */
export async function importFullBackup(file: File): Promise<number> {
    const text = await file.text();
    let parsed: BackupFile;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error("Invalid backup file: not valid JSON");
    }

    if (parsed?.app !== "gonuts" || typeof parsed.backupVersion !== "number") {
        throw new Error("Invalid backup file: not a GoNuts backup");
    }
    if (parsed.backupVersion > BACKUP_VERSION) {
        throw new Error(
            "Backup was created by a newer app version. Update the app first."
        );
    }

    let restored = 0;
    await db.transaction(
        "rw",
        BACKUP_TABLES.map((name) => db.table(name)),
        async () => {
            for (const tableName of BACKUP_TABLES) {
                const rows = parsed.tables?.[tableName];
                if (!Array.isArray(rows) || rows.length === 0) continue;
                await db.table(tableName).bulkPut(rows);
                restored += rows.length;
            }
        }
    );

    return restored;
}
