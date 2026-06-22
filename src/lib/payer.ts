import type { Transaction, Group } from "@/lib/db";
import type { GroupWithMembers } from "@/hooks/useGroups";

/** Stable, friendly palette for payer avatars (shared with context chips). */
const PAYER_COLORS = [
  "#E66A3C",
  "#2F9E5A",
  "#4F82D9",
  "#9B5CF6",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

function hashColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  return PAYER_COLORS[Math.abs(h) % PAYER_COLORS.length];
}

export interface PayerInfo {
  /** Full display name of whoever paid (e.g. "Marco", "You"). */
  name: string;
  /** Uppercase first letter, for compact mobile avatars. */
  initial: string;
  /** Deterministic avatar colour derived from the member id/name. */
  color: string;
  /** True when the current user is the payer. */
  isMe: boolean;
}

function hasMembers(
  group: Group | GroupWithMembers | undefined,
): group is GroupWithMembers {
  return !!group && "members" in group;
}

/**
 * Resolve who actually paid a group transaction.
 *
 * Prefers the explicit `paid_by_member_id`; falls back to the transaction
 * owner (`user_id`). Returns `null` for non-group transactions or when the
 * group's member list isn't loaded yet.
 */
export function resolvePayer(
  transaction: Pick<Transaction, "group_id" | "paid_by_member_id" | "user_id">,
  group: Group | GroupWithMembers | undefined,
  currentUserId?: string | null,
  unknownLabel = "?",
): PayerInfo | null {
  if (!transaction.group_id || !hasMembers(group)) return null;

  const member = transaction.paid_by_member_id
    ? group.members.find((m) => m.id === transaction.paid_by_member_id)
    : group.members.find((m) => m.user_id === transaction.user_id);

  const name = member?.displayName || unknownLabel;
  const seed = member?.id || member?.user_id || name;
  const initial = (name.trim()[0] || "?").toUpperCase();
  const isMe = !!currentUserId && member?.user_id === currentUserId;

  return { name, initial, color: hashColor(seed), isMe };
}
