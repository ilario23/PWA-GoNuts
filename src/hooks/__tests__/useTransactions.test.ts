/**
 * Integration tests for useTransactions against the real Dexie database
 * (fake-indexeddb). Covers CRUD with validation, query filtering and
 * settlement-payment recording.
 */
import { renderHook, act } from "@testing-library/react";
import { useTransactions } from "../useTransactions";
import { db, Transaction } from "../../lib/db";
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
    v4: jest.fn(() => `tx-uuid-${++counter}`),
  };
});

const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const CATEGORY_ID = "223e4567-e89b-12d3-a456-426614174000";
const GROUP_ID = "323e4567-e89b-12d3-a456-426614174000";

function seedTx(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    user_id: USER_ID,
    group_id: null,
    category_id: CATEGORY_ID,
    type: "expense",
    amount: 10,
    date: "2024-03-15",
    year_month: "2024-03",
    description: "seed",
    pendingSync: 0,
    deleted_at: null,
    ...overrides,
  } as Transaction;
}

async function queryTransactions(
  limit?: number,
  yearMonth?: string,
  groupId?: string | null
) {
  const { result } = renderHook(() =>
    useTransactions(limit, yearMonth, groupId)
  );
  // useLiveQuery is mocked to execute the query fn, so `transactions`
  // is the pending promise of the Dexie query.
  return await (result.current.transactions as unknown as Promise<
    Transaction[]
  >);
}

describe("useTransactions", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await db.transactions.clear();
    await db.settlement_payments.clear();
  });

  afterAll(async () => {
    await db.transactions.clear();
    await db.settlement_payments.clear();
  });

  describe("queries", () => {
    beforeEach(async () => {
      await db.transactions.bulkAdd([
        seedTx({ id: "t-mar-1", date: "2024-03-10", year_month: "2024-03" }),
        seedTx({ id: "t-mar-2", date: "2024-03-20", year_month: "2024-03" }),
        seedTx({
          id: "t-mar-deleted",
          date: "2024-03-25",
          year_month: "2024-03",
          deleted_at: "2024-03-26T00:00:00Z",
        }),
        seedTx({ id: "t-apr", date: "2024-04-05", year_month: "2024-04" }),
        seedTx({ id: "t-2023", date: "2023-12-31", year_month: "2023-12" }),
        seedTx({
          id: "t-group",
          date: "2024-03-12",
          year_month: "2024-03",
          group_id: GROUP_ID,
        }),
      ]);
    });

    it("filters by year-month and excludes soft-deleted rows", async () => {
      const rows = await queryTransactions(undefined, "2024-03");
      expect(rows.map((r) => r.id).sort()).toEqual([
        "t-group",
        "t-mar-1",
        "t-mar-2",
      ]);
    });

    it("filters by whole year when given a 4-char year", async () => {
      const rows = await queryTransactions(undefined, "2024");
      expect(rows.map((r) => r.id).sort()).toEqual([
        "t-apr",
        "t-group",
        "t-mar-1",
        "t-mar-2",
      ]);
    });

    it("filters by group id", async () => {
      const rows = await queryTransactions(undefined, undefined, GROUP_ID);
      expect(rows.map((r) => r.id)).toEqual(["t-group"]);
    });

    it("combines year-month and group filters", async () => {
      const rows = await queryTransactions(undefined, "2024-03", GROUP_ID);
      expect(rows.map((r) => r.id)).toEqual(["t-group"]);
    });

    it("returns only personal transactions when groupId is null", async () => {
      const rows = await queryTransactions(undefined, undefined, null);
      expect(rows.map((r) => r.id)).not.toContain("t-group");
      expect(rows.map((r) => r.id)).not.toContain("t-mar-deleted");
      expect(rows).toHaveLength(4);
    });

    it("sorts by date descending and applies the limit", async () => {
      const rows = await queryTransactions(2);
      expect(rows.map((r) => r.id)).toEqual(["t-apr", "t-mar-2"]);
    });
  });

  describe("mutations", () => {
    it("adds a valid transaction with pendingSync flag", async () => {
      const { result } = renderHook(() => useTransactions());

      await act(async () => {
        await result.current.addTransaction({
          user_id: USER_ID,
          category_id: CATEGORY_ID,
          type: "expense",
          amount: 42.5,
          date: "2024-03-01",
          year_month: "2024-03",
          description: "Groceries",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      });

      const rows = await db.transactions.toArray();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        amount: 42.5,
        description: "Groceries",
        pendingSync: 1,
        deleted_at: null,
      });
      expect(syncManager.schedulePush).toHaveBeenCalled();
    });

    it.each([
      ["zero amount", { amount: 0 }],
      ["negative amount", { amount: -5 }],
      ["bad date format", { date: "01/03/2024" }],
      ["empty description", { description: "" }],
      ["invalid type", { type: "transfer" }],
    ])("rejects invalid input: %s", async (_label, override) => {
      const { result } = renderHook(() => useTransactions());

      const base = {
        user_id: USER_ID,
        category_id: CATEGORY_ID,
        type: "expense",
        amount: 10,
        date: "2024-03-01",
        year_month: "2024-03",
        description: "ok",
      };

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.current.addTransaction({ ...base, ...override } as any)
      ).rejects.toThrow();
      expect(await db.transactions.count()).toBe(0);
      expect(syncManager.schedulePush).not.toHaveBeenCalled();
    });

    it("updates a transaction with partial validated data", async () => {
      await db.transactions.add(seedTx({ id: "t-1" }));
      const { result } = renderHook(() => useTransactions());

      await act(async () => {
        await result.current.updateTransaction("t-1", { amount: 99 });
      });

      const row = await db.transactions.get("t-1");
      expect(row).toMatchObject({ amount: 99, pendingSync: 1 });
    });

    it("soft-deletes and restores a transaction", async () => {
      await db.transactions.add(seedTx({ id: "t-1" }));
      const { result } = renderHook(() => useTransactions());

      await act(async () => {
        await result.current.deleteTransaction("t-1");
      });
      expect((await db.transactions.get("t-1"))?.deleted_at).toEqual(
        expect.any(String)
      );

      await act(async () => {
        await result.current.restoreTransaction("t-1");
      });
      const restored = await db.transactions.get("t-1");
      expect(restored?.deleted_at).toBeNull();
      expect(restored?.pendingSync).toBe(1);
    });
  });

  describe("settlement payments", () => {
    it("records a pair settlement with defaults", async () => {
      const { result } = renderHook(() => useTransactions());

      let id = "";
      await act(async () => {
        id = await result.current.recordPairSettlement({
          userId: USER_ID,
          groupId: GROUP_ID,
          fromMemberId: "member-1",
          toMemberId: "member-2",
          amount: 25,
          note: "  thanks  ",
        });
      });

      const payment = await db.settlement_payments.get(id);
      expect(payment).toMatchObject({
        group_id: GROUP_ID,
        from_member_id: "member-1",
        to_member_id: "member-2",
        amount: 25,
        note: "thanks",
        created_by: USER_ID,
        pendingSync: 1,
        deleted_at: null,
      });
      expect(payment?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("rejects a settlement where payer and receiver are the same", async () => {
      const { result } = renderHook(() => useTransactions());

      await expect(
        result.current.recordPairSettlement({
          userId: USER_ID,
          groupId: GROUP_ID,
          fromMemberId: "member-1",
          toMemberId: "member-1",
          amount: 10,
        })
      ).rejects.toThrow("Settlement payer and receiver cannot be the same.");
      expect(await db.settlement_payments.count()).toBe(0);
    });

    it.each([0, -10, NaN, Infinity])(
      "rejects non-positive or non-finite settlement amount %p",
      async (amount) => {
        const { result } = renderHook(() => useTransactions());

        await expect(
          result.current.recordPairSettlement({
            userId: USER_ID,
            groupId: GROUP_ID,
            fromMemberId: "member-1",
            toMemberId: "member-2",
            amount,
          })
        ).rejects.toThrow("Settlement amount must be greater than zero.");
      }
    );

    it("records a group settlement, skipping zero-amount legs", async () => {
      const { result } = renderHook(() => useTransactions());

      let ids: string[] = [];
      await act(async () => {
        ids = await result.current.recordGroupSettlement({
          userId: USER_ID,
          groupId: GROUP_ID,
          note: "monthly close",
          settlements: [
            { fromMemberId: "m-1", toMemberId: "m-2", amount: 30 },
            { fromMemberId: "m-3", toMemberId: "m-2", amount: 0 },
            { fromMemberId: "m-4", toMemberId: "m-2", amount: 12 },
          ],
        });
      });

      expect(ids).toHaveLength(2);
      expect(await db.settlement_payments.count()).toBe(2);
    });

    it("returns an empty array for an empty settlement plan", async () => {
      const { result } = renderHook(() => useTransactions());

      const ids = await result.current.recordGroupSettlement({
        userId: USER_ID,
        groupId: GROUP_ID,
        note: "",
        settlements: [],
      });

      expect(ids).toEqual([]);
      expect(await db.settlement_payments.count()).toBe(0);
    });

    it("undoes a settlement payment via soft delete", async () => {
      const { result } = renderHook(() => useTransactions());

      let id = "";
      await act(async () => {
        id = await result.current.recordPairSettlement({
          userId: USER_ID,
          groupId: GROUP_ID,
          fromMemberId: "member-1",
          toMemberId: "member-2",
          amount: 25,
        });
        await result.current.undoSettlementPayment(id);
      });

      const payment = await db.settlement_payments.get(id);
      expect(payment?.deleted_at).toEqual(expect.any(String));
      expect(payment?.pendingSync).toBe(1);
    });
  });
});
