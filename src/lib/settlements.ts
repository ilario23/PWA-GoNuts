import { Transaction } from "./db";

export const SETTLEMENT_PREFIX = "[GROUP_SETTLEMENT]";

export function buildSettlementDescription(note: string): string {
  const cleanNote = note.trim();
  return cleanNote ? `${SETTLEMENT_PREFIX} ${cleanNote}` : SETTLEMENT_PREFIX;
}

export function isSettlementTransaction(
  transaction: Pick<Transaction, "group_id" | "type"> & { description?: string }
): boolean {
  const description = transaction.description ?? "";
  return (
    !!transaction.group_id &&
    transaction.type === "expense" &&
    description.startsWith(SETTLEMENT_PREFIX)
  );
}

export function extractSettlementNote(description: string): string {
  const note = description.replace(SETTLEMENT_PREFIX, "").trim();
  return note;
}

export function generateSettlementShareText(params: {
  groupName: string;
  totalExpenses: number;
  settlements: Array<{ from: string; to: string; amount: number }>;
  balances: Record<string, { displayName?: string }>;
  currentUserId: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}): string {
  const { groupName, totalExpenses, settlements, balances, currentUserId, t } =
    params;
  const lines = [
    `${t("settlement_plan")} - ${groupName}`,
    `${t("total_expenses")}: €${totalExpenses.toFixed(2)}`,
    "",
    `${t("payments_needed")}:`,
  ];

  settlements.forEach((settlement, index) => {
    const fromName = balances[settlement.from]?.displayName || "Unknown";
    const toName = balances[settlement.to]?.displayName || "Unknown";
    const fromLabel = settlement.from === currentUserId ? t("you") : fromName;
    const toLabel = settlement.to === currentUserId ? t("you") : toName;
    lines.push(
      `${index + 1}. ${fromLabel} → €${settlement.amount.toFixed(
        2
      )} → ${toLabel}`
    );
  });

  lines.push("");
  lines.push(`${t("generated_by")} ${t("app_title")}`);
  return lines.join("\n");
}
