
import { Transaction, Category, Context, Group, GroupMember } from "./db";
import { format } from "date-fns";

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
            // Note: For real users, we might not have their name here easily if it's not in GroupMember
            // But for guests we have guest_name. 
            // If it's a user, we might want to leave it empty or checking if it's "me".
            // For simplicity, let's use what we have.
        }

        return [
            tx.date,
            `"${(tx.description || "").replace(/"/g, '""')}"`, // Escape quotes
            tx.amount.toFixed(2),
            tx.type,
            `"${(category?.name || "").replace(/"/g, '""')}"`,
            `"${(context?.name || "").replace(/"/g, '""')}"`,
            `"${(group?.name || "").replace(/"/g, '""')}"`,
            `"${(paidByName || "").replace(/"/g, '""')}"`,
        ].join(",");
    });

    // 4. Combine and Download
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // Create filename: transactions_YYYY-MM-DD.csv
    const dateStr = format(new Date(), "yyyy-MM-dd");
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_${dateStr}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
