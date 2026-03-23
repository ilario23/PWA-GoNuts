import { Transaction } from "./db";

export const SETTLEMENT_PREFIX = "[GROUP_SETTLEMENT]";

export function buildSettlementDescription(note: string): string {
  const cleanNote = note.trim();
  return cleanNote ? `${SETTLEMENT_PREFIX} ${cleanNote}` : SETTLEMENT_PREFIX;
}

export function isSettlementTransaction(
  transaction: Pick<Transaction, "description" | "group_id" | "type">
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
