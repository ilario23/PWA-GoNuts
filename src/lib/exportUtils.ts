
import { Transaction, Category, Context, Group, GroupMember } from "./db";
import { format } from "date-fns";

/**
 * Neutralizes CSV formula-injection. Spreadsheet apps (Excel, Google Sheets,
 * LibreOffice) execute any cell whose value starts with = + - @ or a control
 * char as a formula, so a description like `=HYPERLINK(...)` or
 * `=cmd|'/c calc'!A1` becomes an attack when the export is opened. We prefix
 * such values with a single quote (the standard mitigation) and then apply the
 * usual double-quote escaping/wrapping.
 *
 * @see https://owasp.org/www-community/attacks/CSV_Injection
 */
function sanitizeCsvCell(value: string | number | null | undefined): string {
    const str = value == null ? "" : String(value);
    // Leading = + - @ , and TAB/CR are the formula/control triggers.
    const needsGuard = /^[=+\-@\t\r]/.test(str);
    const guarded = needsGuard ? `'${str}` : str;
    return `"${guarded.replace(/"/g, '""')}"`;
}

/**
 * Exports a list of transactions to a CSV file.
 *
 * @param transactions List of transactions to export
 * @param categories List of categories for name resolution
 * @param contexts List of contexts for name resolution
 * @param groups List of groups for name resolution
 * @param members List of group members for name resolution
 * @param t Translation function
 */
export function exportTransactionsToCSV(
    transactions: Transaction[],
    categories: Category[],
    contexts: Context[],
    groups: Group[],
    members: GroupMember[],
    t: (key: string) => string
) {
    // 1. Create Lookup Maps for efficiency
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const contextMap = new Map(contexts.map((c) => [c.id, c]));
    const groupMap = new Map(groups.map((g) => [g.id, g]));
    const memberMap = new Map(members.map((m) => [m.id, m]));

    // 2. Define CSV Headers
    const headers = [
        t("date") || "Date",
        t("description") || "Description",
        t("amount") || "Amount",
        t("type") || "Type",
        t("category") || "Category",
        t("context") || "Context",
        t("group") || "Group",
        t("paid_by") || "Paid By",
    ];

    // 3. Process Rows
    const rows = transactions.map((tx) => {
        const category = categoryMap.get(tx.category_id);
        const context = tx.context_id ? contextMap.get(tx.context_id) : undefined;
        const group = tx.group_id ? groupMap.get(tx.group_id) : undefined;
        const paidBy = tx.paid_by_member_id ? memberMap.get(tx.paid_by_member_id) : undefined;

        // Resolve Paid By Name
        let paidByName = "";
        if (paidBy) {
            paidByName = paidBy.guest_name || (paidBy.user_id ? "Member" : "Unknown");
        }

        return [
            sanitizeCsvCell(tx.date),
            sanitizeCsvCell(tx.description || ""),
            sanitizeCsvCell(tx.amount.toFixed(2)),
            sanitizeCsvCell(tx.type),
            sanitizeCsvCell(category?.name || ""),
            sanitizeCsvCell(context?.name || ""),
            sanitizeCsvCell(group?.name || ""),
            sanitizeCsvCell(paidByName),
        ].join(",");
    });

    // 4. Combine and Download
    const csvContent = [headers.map(sanitizeCsvCell).join(","), ...rows].join("\r\n");
    triggerDownload(
        // Prepend a UTF-8 BOM so Excel reads accents/symbols correctly.
        new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" }),
        `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
}

/**
 * Exports the raw transaction records to JSON. Unlike the CSV (which is a
 * human-readable, lossy view), this is a lossless, portable dump — ids and
 * every field are preserved, so the data can be re-imported or migrated.
 * Sync bookkeeping fields are stripped (they are meaningless outside this
 * device's local store).
 */
export function exportTransactionsToJSON(transactions: Transaction[]) {
    const records = transactions.map((tx) => {
        // Drop local-only sync bookkeeping; keep the portable domain fields.
        const { pendingSync: _pendingSync, sync_token: _syncToken, ...portable } = tx;
        return portable;
    });

    const payload = {
        app: "GoNuts",
        type: "transactions-export",
        version: 1,
        exported_at: new Date().toISOString(),
        count: records.length,
        transactions: records,
    };

    triggerDownload(
        new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
        `gonuts_transactions_${format(new Date(), "yyyy-MM-dd")}.json`
    );
}

/** Shared blob-download helper. Revokes the object URL to avoid a memory leak. */
function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
