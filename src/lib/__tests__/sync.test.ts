/**
 * Unit tests for the SyncManager last-write-wins conflict resolution — the
 * highest-risk logic in the app (silent cross-member data loss lives here).
 * We exercise the decision matrix of `shouldUpdateLocal` directly against
 * fake-indexeddb and assert that dropped remote edits are captured.
 */
import { SyncManager } from "../sync";
import { db } from "../db";

// Keep the conflict toast + i18n inert and deterministic.
jest.mock("sonner", () => ({ toast: { warning: jest.fn(), success: jest.fn() } }));
jest.mock("@/i18n", () => ({ __esModule: true, default: { t: (_k: string, o?: { defaultValue?: string }) => o?.defaultValue ?? "" } }));

type Decision = { shouldUpdate: boolean; reason: string };
type Internal = {
  shouldUpdateLocal: (table: string, remote: unknown) => Promise<Decision>;
};

const newManager = () => new SyncManager() as unknown as Internal;

// Minimal transaction row — only the fields shouldUpdateLocal reads matter.
const localTxn = (over: Record<string, unknown>) =>
  ({ id: "tx1", user_id: "u1", category_id: "c1", type: "expense", amount: 1, date: "2026-06-01", year_month: "2026-06", description: "x", ...over }) as unknown as Parameters<typeof db.transactions.put>[0];

beforeEach(async () => {
  await db.transactions.clear();
  await db.sync_conflicts.clear();
});

describe("SyncManager.shouldUpdateLocal (last-write-wins)", () => {
  it("accepts a brand-new remote row", async () => {
    const sm = newManager();
    const res = await sm.shouldUpdateLocal("transactions", { id: "tx1", sync_token: 1 });
    expect(res).toEqual({ shouldUpdate: true, reason: "new" });
  });

  it("accepts a remote row with a higher sync_token", async () => {
    await db.transactions.put(localTxn({ pendingSync: 0, sync_token: 1 }));
    const sm = newManager();
    const res = await sm.shouldUpdateLocal("transactions", { id: "tx1", sync_token: 2 });
    expect(res).toEqual({ shouldUpdate: true, reason: "remote_newer" });
  });

  it("ignores a remote row at the same token (already synced)", async () => {
    await db.transactions.put(localTxn({ pendingSync: 0, sync_token: 5 }));
    const sm = newManager();
    const res = await sm.shouldUpdateLocal("transactions", { id: "tx1", sync_token: 5 });
    expect(res).toEqual({ shouldUpdate: false, reason: "already_synced" });
  });

  it("uses updated_at as a deterministic tiebreak when tokens are equal", async () => {
    await db.transactions.put(localTxn({ pendingSync: 0, sync_token: 5, updated_at: "2026-06-01T00:00:00Z" }));
    const sm = newManager();
    const res = await sm.shouldUpdateLocal("transactions", { id: "tx1", sync_token: 5, updated_at: "2026-06-02T00:00:00Z" });
    expect(res).toEqual({ shouldUpdate: true, reason: "remote_newer" });
  });

  it("keeps the local row when it has pending edits", async () => {
    await db.transactions.put(localTxn({ pendingSync: 1, sync_token: 1 }));
    const sm = newManager();
    const res = await sm.shouldUpdateLocal("transactions", { id: "tx1", sync_token: 2 });
    expect(res).toEqual({ shouldUpdate: false, reason: "pending" });
  });

  it("captures the dropped remote edit when local pending overwrites a newer remote", async () => {
    await db.transactions.put(localTxn({ pendingSync: 1, sync_token: 1, updated_at: "2026-06-05T00:00:00Z" }));
    const sm = newManager();
    await sm.shouldUpdateLocal("transactions", { id: "tx1", sync_token: 9, updated_at: "2026-06-06T00:00:00Z", amount: 999 });

    const conflict = await db.sync_conflicts.get("transactions:tx1");
    expect(conflict).toBeDefined();
    expect(conflict?.table).toBe("transactions");
    expect(conflict?.resolvedAt).toBeNull();
    expect(JSON.parse(conflict!.remoteData).amount).toBe(999);
  });

  it("does NOT record a conflict when the local pending row is already newest", async () => {
    await db.transactions.put(localTxn({ pendingSync: 1, sync_token: 5 }));
    const sm = newManager();
    await sm.shouldUpdateLocal("transactions", { id: "tx1", sync_token: 3 });
    expect(await db.sync_conflicts.count()).toBe(0);
  });
});
