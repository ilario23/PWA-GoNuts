import { supabase } from "@/lib/supabase";

/**
 * Guest -> real user migration. The group creator generates a single-use link
 * for a guest member; whoever opens it (signed in) takes over that member row,
 * inheriting all of its expenses, shares and settlements.
 *
 * This is the one place that talks to Supabase RPCs directly: the operation is
 * server-authoritative (RLS blocks non-creators from editing members), and the
 * resulting member row reaches Dexie through the normal sync pull.
 */

const PENDING_KEY = "gonuts:pendingGuestInvite";

export type InviteStatus =
  | "valid"
  | "expired"
  | "claimed"
  | "revoked"
  | "unavailable"
  | "not_found";

export interface InvitePreview {
  status: InviteStatus;
  groupName: string | null;
  guestName: string | null;
}

/** Error codes raised by the claim/create RPCs (message of the PG exception). */
export type InviteErrorCode =
  | "not_authenticated"
  | "not_allowed"
  | "guest_unavailable"
  | "invite_not_found"
  | "invite_already_claimed"
  | "invite_revoked"
  | "invite_expired"
  | "already_member"
  | "unknown";

const KNOWN_CODES: InviteErrorCode[] = [
  "not_authenticated",
  "not_allowed",
  "guest_unavailable",
  "invite_not_found",
  "invite_already_claimed",
  "invite_revoked",
  "invite_expired",
  "already_member",
];

export class InviteError extends Error {
  code: InviteErrorCode;
  constructor(code: InviteErrorCode, message?: string) {
    super(message ?? code);
    this.name = "InviteError";
    this.code = code;
  }
}

export function toInviteError(message: string | undefined): InviteError {
  const code = KNOWN_CODES.find((c) => message?.includes(c)) ?? "unknown";
  return new InviteError(code, message);
}

export function buildInviteLink(token: string, origin?: string): string {
  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/join/${encodeURIComponent(token)}`;
}

export async function createGuestInvite(memberId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_guest_invite", {
    p_member_id: memberId,
  });
  if (error) throw toInviteError(error.message);
  return data as string;
}

export async function previewGuestInvite(
  token: string
): Promise<InvitePreview> {
  const { data, error } = await supabase.rpc("get_guest_invite", {
    p_token: token,
  });
  if (error) throw toInviteError(error.message);
  const row = (data ?? {}) as {
    status?: InviteStatus;
    group_name?: string | null;
    guest_name?: string | null;
  };
  return {
    status: row.status ?? "not_found",
    groupName: row.group_name ?? null,
    guestName: row.guest_name ?? null,
  };
}

/** Returns the id of the group the user has just joined. */
export async function claimGuestInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc("claim_guest_invite", {
    p_token: token,
  });
  if (error) throw toInviteError(error.message);
  return data as string;
}

// --- Survive the sign-in / sign-up detour --------------------------------
// A new user opening the link is not logged in yet; remember the token so we
// can resume after auth (incl. the email-confirmation round trip).

export function savePendingInvite(token: string): void {
  try {
    localStorage.setItem(PENDING_KEY, token);
  } catch {
    /* storage unavailable: user can re-open the link */
  }
}

export function getPendingInvite(): string | null {
  try {
    return localStorage.getItem(PENDING_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}
