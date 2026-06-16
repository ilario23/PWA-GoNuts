/**
 * Tests for useCategoryBudgets: spending enrichment, over-budget /
 * warning detection, and create-or-update persistence (real Dexie via
 * fake-indexeddb for mutations; queued useLiveQuery results for reads).
 */
import { renderHook, act } from "@testing-library/react";
import { useCategoryBudgets } from "../useCategoryBudgets";
import { db } from "../../lib/db";
import { syncManager } from "../../lib/sync";
import { useAuth } from "@/contexts/AuthProvider";

jest.mock("@/contexts/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

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

// The hook issues four live queries per render, in a fixed order:
// budgets, categories, monthly transactions, yearly transactions.
// We feed results from a queue instead of executing the Dexie queries.
jest.mock("dexie-react-hooks", () => {
  const state = { queue: [] as unknown[], idx: 0 };
  return {
    __liveQueryState: state,
    useLiveQuery: jest.fn(() => {
      if (state.queue.length === 0) return undefined;
      const value = state.queue[state.idx % state.queue.length];
      state.idx++;
      return value;
    }),
  };
});

jest.mock("uuid", () => {
  let counter = 0;
  return {
    v4: jest.fn(() => `budget-uuid-${++counter}`),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const liveQueryState = (require("dexie-react-hooks") as {
  __liveQueryState: { queue: unknown[]; idx: number };
}).__liveQueryState;

const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const CAT_FOOD = "223e4567-e89b-12d3-a456-426614174000";
const CAT_TRAVEL = "323e4567-e89b-12d3-a456-426614174000";

const foodCategory = {
  id: CAT_FOOD,
  user_id: USER_ID,
  name: "Food",
  color: "#0f0",
  icon: "Apple",
  deleted_at: null,
};

function budget(overrides: Record<string, unknown> = {}) {
  return {
    id: "b-1",
    user_id: USER_ID,
    category_id: CAT_FOOD,
    amount: 100,
    period: "monthly",
    deleted_at: null,
    ...overrides,
  };
}

function expense(amount: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `t-${Math.random()}`,
    user_id: USER_ID,
    category_id: CAT_FOOD,
    type: "expense",
    amount,
    deleted_at: null,
    ...overrides,
  };
}

function setLiveQueries(params: {
  budgets?: unknown[];
  categories?: unknown[];
  monthlyTx?: unknown[];
  yearlyTx?: unknown[];
}) {
  liveQueryState.queue = [
    params.budgets ?? [],
    params.categories ?? [],
    params.monthlyTx ?? [],
    params.yearlyTx ?? [],
  ];
  liveQueryState.idx = 0;
}

describe("useCategoryBudgets", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { id: USER_ID } });
    setLiveQueries({});
    await db.category_budgets.clear();
  });

  afterAll(async () => {
    await db.category_budgets.clear();
  });

  it("enriches a monthly budget with spent, percentage and category info", () => {
    setLiveQueries({
      budgets: [budget()],
      categories: [foodCategory],
      monthlyTx: [
        expense(30),
        expense(50),
        expense(999, { type: "income" }), // ignored
        expense(999, { deleted_at: "2024-01-01" }), // ignored
        expense(999, { category_id: CAT_TRAVEL }), // other category
      ],
    });

    const { result } = renderHook(() => useCategoryBudgets());

    expect(result.current.categoryBudgets).toHaveLength(1);
    expect(result.current.categoryBudgets[0]).toMatchObject({
      spent: 80,
      percentage: 80,
      remaining: 20,
      isOverBudget: false,
      categoryName: "Food",
      categoryColor: "#0f0",
      categoryIcon: "Apple",
    });
    // 80% of budget → warning, not over budget.
    expect(result.current.warningCategories).toHaveLength(1);
    expect(result.current.overBudgetCategories).toHaveLength(0);
  });

  it("flags over-budget categories", () => {
    setLiveQueries({
      budgets: [budget()],
      categories: [foodCategory],
      monthlyTx: [expense(120)],
    });

    const { result } = renderHook(() => useCategoryBudgets());

    expect(result.current.categoryBudgets[0]).toMatchObject({
      spent: 120,
      remaining: -20,
      isOverBudget: true,
    });
    expect(result.current.overBudgetCategories).toHaveLength(1);
    expect(result.current.warningCategories).toHaveLength(0);
  });

  it("tracks yearly budgets against yearly spending", () => {
    setLiveQueries({
      budgets: [budget({ period: "yearly", amount: 1200 })],
      categories: [foodCategory],
      monthlyTx: [expense(10)],
      yearlyTx: [expense(400), expense(200)],
    });

    const { result } = renderHook(() => useCategoryBudgets());

    expect(result.current.categoryBudgets[0]).toMatchObject({
      spent: 600,
      percentage: 50,
    });
  });

  it("finds a budget by category and period", () => {
    setLiveQueries({
      budgets: [
        budget({ id: "b-m", period: "monthly" }),
        budget({ id: "b-y", period: "yearly", amount: 1000 }),
      ],
      categories: [foodCategory],
    });

    const { result } = renderHook(() => useCategoryBudgets());

    expect(result.current.getBudgetForCategory(CAT_FOOD, "yearly")?.id).toBe(
      "b-y"
    );
    expect(result.current.getBudgetForCategory(CAT_FOOD)?.id).toBe("b-m");
    expect(result.current.getBudgetForCategory(CAT_TRAVEL)).toBeUndefined();
  });

  it("creates a new budget when none exists for the category", async () => {
    setLiveQueries({ budgets: [], categories: [] });
    const { result } = renderHook(() => useCategoryBudgets());

    await act(async () => {
      await result.current.setCategoryBudget(CAT_FOOD, 500, "monthly");
    });

    const rows = await db.category_budgets.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: USER_ID,
      category_id: CAT_FOOD,
      amount: 500,
      period: "monthly",
      pendingSync: 1,
    });
    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("updates the existing budget instead of duplicating it", async () => {
    await db.category_budgets.add({
      id: "b-1",
      user_id: USER_ID,
      category_id: CAT_FOOD,
      amount: 100,
      period: "monthly",
      pendingSync: 0,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    setLiveQueries({
      budgets: [budget({ id: "b-1", amount: 100 })],
      categories: [foodCategory],
    });

    const { result } = renderHook(() => useCategoryBudgets());

    await act(async () => {
      await result.current.setCategoryBudget(CAT_FOOD, 250, "monthly");
    });

    const rows = await db.category_budgets.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "b-1", amount: 250, pendingSync: 1 });
  });

  it("rejects a non-positive budget amount", async () => {
    setLiveQueries({ budgets: [], categories: [] });
    const { result } = renderHook(() => useCategoryBudgets());

    await expect(
      result.current.setCategoryBudget(CAT_FOOD, -50, "monthly")
    ).rejects.toThrow();
    expect(await db.category_budgets.count()).toBe(0);
  });

  it("soft-deletes a budget", async () => {
    await db.category_budgets.add({
      id: "b-1",
      user_id: USER_ID,
      category_id: CAT_FOOD,
      amount: 100,
      period: "monthly",
      pendingSync: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { result } = renderHook(() => useCategoryBudgets());

    await act(async () => {
      await result.current.removeCategoryBudget("b-1");
    });

    const row = await db.category_budgets.get("b-1");
    expect(row?.deleted_at).toEqual(expect.any(String));
    expect(row?.pendingSync).toBe(1);
    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("does nothing when the user is not authenticated", async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: null });
    setLiveQueries({ budgets: [], categories: [] });
    const { result } = renderHook(() => useCategoryBudgets());

    await act(async () => {
      await result.current.setCategoryBudget(CAT_FOOD, 500);
    });

    expect(await db.category_budgets.count()).toBe(0);
    expect(syncManager.schedulePush).not.toHaveBeenCalled();
  });
});
