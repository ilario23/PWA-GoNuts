/**
 * Integration tests for useContexts against the real Dexie database
 * (fake-indexeddb). Covers CRUD plus the delete-detaches-transactions flow.
 */
import { renderHook, act } from "@testing-library/react";
import { useContexts } from "../useContexts";
import { db } from "../../lib/db";
import { syncManager } from "../../lib/sync";

jest.mock("../../lib/sync", () => ({
  syncManager: {
    schedulePush: jest.fn(),
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
  }),
}));

jest.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn: () => unknown) => {
    try {
      return fn();
    } catch {
      return undefined;
    }
  },
}));

jest.mock("uuid", () => {
  let counter = 0;
  return {
    v4: jest.fn(() => `ctx-uuid-${++counter}`),
  };
});

const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const CATEGORY_ID = "223e4567-e89b-12d3-a456-426614174000";

describe("useContexts", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await db.contexts.clear();
    await db.transactions.clear();
  });

  afterAll(async () => {
    await db.contexts.clear();
    await db.transactions.clear();
  });

  it("adds a context with active=1 default and pendingSync flag", async () => {
    const { result } = renderHook(() => useContexts());

    await act(async () => {
      await result.current.addContext({
        user_id: USER_ID,
        name: "Vacation",
      });
    });

    const rows = await db.contexts.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: USER_ID,
      name: "Vacation",
      active: 1,
      pendingSync: 1,
      deleted_at: null,
    });
    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("rejects an empty context name", async () => {
    const { result } = renderHook(() => useContexts());

    await expect(
      result.current.addContext({ user_id: USER_ID, name: "" })
    ).rejects.toThrow();
    expect(await db.contexts.count()).toBe(0);
    expect(syncManager.schedulePush).not.toHaveBeenCalled();
  });

  it("rejects a name longer than 50 characters", async () => {
    const { result } = renderHook(() => useContexts());

    await expect(
      result.current.addContext({ user_id: USER_ID, name: "x".repeat(51) })
    ).rejects.toThrow();
    expect(await db.contexts.count()).toBe(0);
  });

  it("updates a context, converting boolean active to number", async () => {
    await db.contexts.add({
      id: "ctx-1",
      user_id: USER_ID,
      name: "Work",
      active: 1,
      pendingSync: 0,
      deleted_at: null,
    });

    const { result } = renderHook(() => useContexts());

    await act(async () => {
      await result.current.updateContext("ctx-1", {
        name: "Office",
        active: false,
      });
    });

    const row = await db.contexts.get("ctx-1");
    expect(row).toMatchObject({
      name: "Office",
      active: 0,
      pendingSync: 1,
    });
    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("soft-deletes a context and detaches it from its transactions", async () => {
    await db.contexts.add({
      id: "ctx-1",
      user_id: USER_ID,
      name: "Trip",
      active: 1,
      pendingSync: 0,
      deleted_at: null,
    });
    await db.transactions.bulkAdd([
      {
        id: "tx-1",
        user_id: USER_ID,
        category_id: CATEGORY_ID,
        context_id: "ctx-1",
        type: "expense",
        amount: 10,
        date: "2024-03-01",
        year_month: "2024-03",
        description: "Hotel",
        pendingSync: 0,
        deleted_at: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      {
        id: "tx-2",
        user_id: USER_ID,
        category_id: CATEGORY_ID,
        context_id: "ctx-other",
        type: "expense",
        amount: 20,
        date: "2024-03-02",
        year_month: "2024-03",
        description: "Dinner",
        pendingSync: 0,
        deleted_at: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    ]);

    const { result } = renderHook(() => useContexts());

    await act(async () => {
      await result.current.deleteContext("ctx-1");
    });

    const ctx = await db.contexts.get("ctx-1");
    expect(ctx?.deleted_at).toEqual(expect.any(String));
    expect(ctx?.pendingSync).toBe(1);

    // Attached transaction detached and marked for sync.
    const tx1 = await db.transactions.get("tx-1");
    expect(tx1?.context_id).toBeNull();
    expect(tx1?.pendingSync).toBe(1);

    // Unrelated transaction untouched.
    const tx2 = await db.transactions.get("tx-2");
    expect(tx2?.context_id).toBe("ctx-other");
    expect(tx2?.pendingSync).toBe(0);

    expect(syncManager.schedulePush).toHaveBeenCalled();
  });
});
