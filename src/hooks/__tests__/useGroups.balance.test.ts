/**
 * Tests for the group balance engine: the settlement algorithm
 * (calculateSettlement) and getGroupBalance edge cases — guests,
 * settlement payments, history and display-name resolution.
 */
import { renderHook, act } from "@testing-library/react";
import { useGroups, calculateSettlement } from "../useGroups";
import { db } from "../../lib/db";
import { useAuth } from "../useAuth";

jest.mock("../useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../lib/sync", () => ({
  syncManager: {
    sync: jest.fn(),
    schedulePush: jest.fn(),
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
  }),
}));

jest.mock("../../lib/db", () => ({
  db: {
    groups: {
      toArray: jest.fn().mockResolvedValue([]),
      add: jest.fn(),
      update: jest.fn(),
    },
    group_members: {
      toArray: jest.fn().mockResolvedValue([]),
      add: jest.fn(),
      update: jest.fn(),
      filter: jest.fn(),
    },
    categories: {
      filter: jest.fn(),
      update: jest.fn(),
    },
    transactions: {
      filter: jest.fn(),
      update: jest.fn(),
    },
    recurring_transactions: {
      filter: jest.fn(),
      update: jest.fn(),
    },
    profiles: {
      toArray: jest.fn().mockResolvedValue([]),
    },
    settlement_payments: {
      filter: jest.fn(() => ({
        toArray: jest.fn().mockResolvedValue([]),
      })),
      add: jest.fn(),
    },
    user_settings: {
      get: jest
        .fn()
        .mockResolvedValue({ legacy_settlement_migrated_at: "2024-01-01" }),
      update: jest.fn(),
    },
  },
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

jest.mock("uuid", () => ({
  v4: jest.fn(() => "mock-uuid"),
}));

// ---------------------------------------------------------------------------
// calculateSettlement (pure algorithm)
// ---------------------------------------------------------------------------

function entry(userId: string, balance: number) {
  return { userId, share: 0, shouldPay: 0, hasPaid: 0, balance };
}

describe("calculateSettlement", () => {
  it("returns no settlements when everyone is settled", () => {
    expect(
      calculateSettlement({
        a: entry("a", 0),
        b: entry("b", 0),
      })
    ).toEqual([]);
  });

  it("ignores balances within the float epsilon", () => {
    expect(
      calculateSettlement({
        a: entry("a", -0.005),
        b: entry("b", 0.005),
      })
    ).toEqual([]);
  });

  it("settles a simple two-party debt", () => {
    expect(
      calculateSettlement({
        a: entry("a", -25),
        b: entry("b", 25),
      })
    ).toEqual([{ from: "a", to: "b", amount: 25 }]);
  });

  it("splits one debtor across multiple creditors", () => {
    const settlements = calculateSettlement({
      d: entry("d", -50),
      c1: entry("c1", 30),
      c2: entry("c2", 20),
    });

    expect(settlements).toEqual([
      { from: "d", to: "c1", amount: 30 },
      { from: "d", to: "c2", amount: 20 },
    ]);
  });

  it("matches largest debtor with largest creditor first", () => {
    const settlements = calculateSettlement({
      d1: entry("d1", -10),
      d2: entry("d2", -40),
      c1: entry("c1", 35),
      c2: entry("c2", 15),
    });

    expect(settlements[0]).toEqual({ from: "d2", to: "c1", amount: 35 });
  });

  it("conserves money: total paid equals total owed", () => {
    const balances = {
      a: entry("a", -33.33),
      b: entry("b", -16.67),
      c: entry("c", 20),
      d: entry("d", 30),
    };
    const settlements = calculateSettlement(balances);

    const totalPaid = settlements.reduce((s, x) => s + x.amount, 0);
    expect(totalPaid).toBeCloseTo(50, 2);

    // No participant pays and receives in the same plan, and no self-payments.
    for (const s of settlements) {
      expect(s.from).not.toBe(s.to);
      expect(s.amount).toBeGreaterThan(0);
    }
    const payers = new Set(settlements.map((s) => s.from));
    const receivers = new Set(settlements.map((s) => s.to));
    for (const p of payers) expect(receivers.has(p)).toBe(false);
  });

  it("needs at most n-1 transactions for n participants", () => {
    const balances = {
      a: entry("a", -10),
      b: entry("b", -20),
      c: entry("c", -30),
      d: entry("d", 25),
      e: entry("e", 35),
    };
    expect(calculateSettlement(balances).length).toBeLessThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// getGroupBalance edge cases
// ---------------------------------------------------------------------------

describe("getGroupBalance", () => {
  const mockUser = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    email: "test@example.com",
  };

  const registeredMember = {
    id: "member-1",
    group_id: "group-1",
    user_id: mockUser.id,
    share: 50,
    removed_at: null,
    is_guest: false,
  };

  const guestMember = {
    id: "member-2",
    group_id: "group-1",
    user_id: null,
    guest_name: "Nonna",
    share: 50,
    removed_at: null,
    is_guest: true,
  };

  function mockFilterResult(rows: unknown[]) {
    return { toArray: jest.fn().mockResolvedValue(rows) };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
    (db.groups.toArray as jest.Mock).mockResolvedValue([]);
    (db.group_members.toArray as jest.Mock).mockResolvedValue([]);
    (db.profiles.toArray as jest.Mock).mockResolvedValue([]);
    (db.user_settings.get as jest.Mock).mockResolvedValue({
      legacy_settlement_migrated_at: "2024-01-01",
    });
  });

  it("keys guests by member id, registered users by user id", async () => {
    (db.group_members.filter as jest.Mock).mockReturnValue(
      mockFilterResult([registeredMember, guestMember])
    );
    (db.transactions.filter as jest.Mock).mockReturnValue(
      mockFilterResult([
        {
          id: "tx-1",
          group_id: "group-1",
          type: "expense",
          amount: 100,
          paid_by_member_id: "member-1",
          deleted_at: null,
        },
      ])
    );
    (db.settlement_payments.filter as jest.Mock).mockReturnValue(
      mockFilterResult([])
    );

    const { result } = renderHook(() => useGroups());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let balance: any;
    await act(async () => {
      balance = await result.current.getGroupBalance("group-1");
    });

    expect(balance.totalExpenses).toBe(100);
    // Registered member keyed by user_id.
    expect(balance.balances[mockUser.id]).toMatchObject({
      memberId: "member-1",
      isGuest: false,
      balance: 50, // paid 100, owes 50
    });
    // Guest keyed by member id, named after guest_name.
    expect(balance.balances["member-2"]).toMatchObject({
      memberId: "member-2",
      isGuest: true,
      displayName: "Nonna",
      balance: -50,
    });
  });

  it("applies settlement payments to balances (settled group nets to zero)", async () => {
    (db.group_members.filter as jest.Mock).mockReturnValue(
      mockFilterResult([registeredMember, guestMember])
    );
    (db.transactions.filter as jest.Mock).mockReturnValue(
      mockFilterResult([
        {
          id: "tx-1",
          group_id: "group-1",
          type: "expense",
          amount: 100,
          paid_by_member_id: "member-1",
          deleted_at: null,
        },
      ])
    );
    (db.settlement_payments.filter as jest.Mock).mockReturnValue(
      mockFilterResult([
        {
          id: "sp-1",
          group_id: "group-1",
          from_member_id: "member-2",
          to_member_id: "member-1",
          amount: 50,
          date: "2024-02-01",
          note: "all square",
          created_by: mockUser.id,
          deleted_at: null,
          created_at: "2024-02-01T10:00:00Z",
        },
      ])
    );

    const { result } = renderHook(() => useGroups());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let balance: any;
    await act(async () => {
      balance = await result.current.getGroupBalance("group-1");
    });

    // payer: 100 paid - 50 share - 50 received = 0
    expect(balance.balances[mockUser.id].balance).toBeCloseTo(0);
    expect(balance.balances[mockUser.id].settlementReceived).toBe(50);
    // guest: 0 paid - 50 share + 50 sent = 0
    expect(balance.balances["member-2"].balance).toBeCloseTo(0);
    expect(balance.balances["member-2"].settlementSent).toBe(50);
  });

  it("builds settlement history sorted newest-first with undo rights", async () => {
    (db.group_members.filter as jest.Mock).mockReturnValue(
      mockFilterResult([registeredMember, guestMember])
    );
    (db.transactions.filter as jest.Mock).mockReturnValue(mockFilterResult([]));
    (db.settlement_payments.filter as jest.Mock).mockReturnValue(
      mockFilterResult([
        {
          id: "sp-old",
          group_id: "group-1",
          from_member_id: "member-2",
          to_member_id: "member-1",
          amount: 10,
          date: "2024-01-01",
          note: null,
          created_by: "someone-else",
          deleted_at: null,
          created_at: "2024-01-01T10:00:00Z",
        },
        {
          id: "sp-new",
          group_id: "group-1",
          from_member_id: "member-1",
          to_member_id: "member-2",
          amount: 20,
          date: "2024-03-01",
          note: "dinner",
          created_by: "someone-else",
          deleted_at: null,
          created_at: "2024-03-01T10:00:00Z",
        },
      ])
    );

    const { result } = renderHook(() => useGroups());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let balance: any;
    await act(async () => {
      balance = await result.current.getGroupBalance("group-1");
    });

    expect(balance.settlementHistory.map((h: { id: string }) => h.id)).toEqual([
      "sp-new",
      "sp-old",
    ]);
    expect(balance.latestSettlement).toMatchObject({
      id: "sp-new",
      date: "2024-03-01",
      note: "dinner",
    });

    const newest = balance.settlementHistory[0];
    // Current user is the paying member of sp-new → can undo even though
    // someone else recorded it.
    expect(newest.canUndo).toBe(true);
    expect(newest.fromMemberId).toBe("member-1");
    expect(newest.toDisplayName).toBe("Nonna");

    // sp-old: neither creator nor payer → cannot undo.
    expect(balance.settlementHistory[1].canUndo).toBe(false);
  });

  it("resolves display names from profiles (full name beats email)", async () => {
    const otherMember = {
      id: "member-3",
      group_id: "group-1",
      user_id: "323e4567-e89b-12d3-a456-426614174000",
      share: 0,
      removed_at: null,
      is_guest: false,
    };
    (db.profiles.toArray as jest.Mock).mockResolvedValue([
      {
        id: otherMember.user_id,
        full_name: "Mario Rossi",
        email: "mario@example.com",
      },
    ]);
    (db.group_members.filter as jest.Mock).mockReturnValue(
      mockFilterResult([registeredMember, otherMember])
    );
    (db.transactions.filter as jest.Mock).mockReturnValue(mockFilterResult([]));
    (db.settlement_payments.filter as jest.Mock).mockReturnValue(
      mockFilterResult([])
    );

    const { result } = renderHook(() => useGroups());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let balance: any;
    await act(async () => {
      balance = await result.current.getGroupBalance("group-1");
    });

    expect(balance.balances[otherMember.user_id].displayName).toBe(
      "Mario Rossi"
    );
    // Current user has no profile → falls back to "You".
    expect(balance.balances[mockUser.id].displayName).toBe("You");
  });

  it("feeds balances into calculateSettlement to produce a valid plan", async () => {
    (db.group_members.filter as jest.Mock).mockReturnValue(
      mockFilterResult([registeredMember, guestMember])
    );
    (db.transactions.filter as jest.Mock).mockReturnValue(
      mockFilterResult([
        {
          id: "tx-1",
          group_id: "group-1",
          type: "expense",
          amount: 80,
          paid_by_member_id: "member-1",
          deleted_at: null,
        },
        {
          id: "tx-2",
          group_id: "group-1",
          type: "expense",
          amount: 20,
          paid_by_member_id: "member-2",
          deleted_at: null,
        },
      ])
    );
    (db.settlement_payments.filter as jest.Mock).mockReturnValue(
      mockFilterResult([])
    );

    const { result } = renderHook(() => useGroups());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let balance: any;
    await act(async () => {
      balance = await result.current.getGroupBalance("group-1");
    });

    const plan = calculateSettlement(balance.balances);
    // Guest owes €30 to the registered payer (50-50 split of €100).
    expect(plan).toEqual([
      { from: "member-2", to: mockUser.id, amount: 30 },
    ]);
  });
});
