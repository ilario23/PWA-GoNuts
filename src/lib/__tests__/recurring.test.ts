/**
 * Integration tests for the recurring-transaction generator.
 * Runs against the real Dexie database backed by fake-indexeddb.
 */
import { db, RecurringTransaction } from "../db";
import { processRecurringTransactions } from "../recurring";
import { recurringOccurrenceTransactionId } from "../recurringOccurrence";
import { syncManager } from "../sync";
import { format, subDays, subYears } from "date-fns";

jest.mock("../sync", () => ({
  syncManager: {
    schedulePush: jest.fn(),
  },
}));

const USER_ID = "123e4567-e89b-12d3-a456-426614174000";
const CATEGORY_ID = "223e4567-e89b-12d3-a456-426614174000";

const today = () => format(new Date(), "yyyy-MM-dd");
const daysAgo = (n: number) => format(subDays(new Date(), n), "yyyy-MM-dd");

function makeRecurring(
  overrides: Partial<RecurringTransaction> = {}
): RecurringTransaction {
  return {
    id: "rt-1",
    user_id: USER_ID,
    group_id: null,
    paid_by_member_id: null,
    category_id: CATEGORY_ID,
    context_id: undefined,
    type: "expense",
    amount: 10,
    frequency: "daily",
    start_date: today(),
    end_date: null,
    last_generated: null,
    description: "Gym membership",
    active: 1,
    deleted_at: null,
    pendingSync: 0,
    ...overrides,
  } as unknown as RecurringTransaction;
}

describe("processRecurringTransactions", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await db.transactions.clear();
    await db.recurring_transactions.clear();
  });

  afterAll(async () => {
    await db.transactions.clear();
    await db.recurring_transactions.clear();
  });

  it("generates a single occurrence when start_date is today", async () => {
    await db.recurring_transactions.add(makeRecurring({ frequency: "monthly" }));

    const result = await processRecurringTransactions();

    expect(result.generatedCount).toBe(1);
    expect(result.expenseTotal).toBe(10);

    const txs = await db.transactions.toArray();
    expect(txs).toHaveLength(1);
    const tx = txs[0];
    expect(tx.id).toBe(recurringOccurrenceTransactionId("rt-1", today()));
    expect(tx.date).toBe(today());
    expect(tx.year_month).toBe(today().substring(0, 7));
    expect(tx.recurrence_key).toBe(`rt-1|${today()}`);
    expect(tx.recurring_transaction_id).toBe("rt-1");
    expect(tx.description).toBe("Gym membership");
    expect(tx.pendingSync).toBe(1);

    const rt = await db.recurring_transactions.get("rt-1");
    expect(rt?.last_generated).toBe(today());
    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("catches up missed daily occurrences including today", async () => {
    await db.recurring_transactions.add(
      makeRecurring({ start_date: daysAgo(2) })
    );

    const result = await processRecurringTransactions();

    expect(result.generatedCount).toBe(3);
    expect(result.expenseTotal).toBe(30);

    const dates = (await db.transactions.toArray()).map((t) => t.date).sort();
    expect(dates).toEqual([daysAgo(2), daysAgo(1), today()].sort());
  });

  it("is idempotent across runs (no duplicate occurrences)", async () => {
    await db.recurring_transactions.add(
      makeRecurring({ start_date: daysAgo(2) })
    );

    await processRecurringTransactions();
    const second = await processRecurringTransactions();

    expect(second.generatedCount).toBe(0);
    expect(second.expenseTotal).toBe(0);
    expect(await db.transactions.count()).toBe(3);
  });

  it("generates weekly occurrences on 7-day steps", async () => {
    await db.recurring_transactions.add(
      makeRecurring({ frequency: "weekly", start_date: daysAgo(14) })
    );

    const result = await processRecurringTransactions();

    expect(result.generatedCount).toBe(3);
    const dates = (await db.transactions.toArray()).map((t) => t.date).sort();
    expect(dates).toEqual([daysAgo(14), daysAgo(7), today()].sort());
  });

  it("generates yearly occurrences", async () => {
    const lastYear = format(subYears(new Date(), 1), "yyyy-MM-dd");
    await db.recurring_transactions.add(
      makeRecurring({ frequency: "yearly", start_date: lastYear })
    );

    const result = await processRecurringTransactions();

    expect(result.generatedCount).toBe(2);
    const dates = (await db.transactions.toArray()).map((t) => t.date).sort();
    expect(dates).toEqual([lastYear, today()].sort());
  });

  it("stops generating after end_date", async () => {
    await db.recurring_transactions.add(
      makeRecurring({ start_date: daysAgo(5), end_date: daysAgo(3) })
    );

    await processRecurringTransactions();

    const dates = (await db.transactions.toArray()).map((t) => t.date).sort();
    // Occurrences are anchored at noon; the end_date (midnight) cuts off the
    // occurrence on the end date itself.
    expect(dates).toEqual([daysAgo(5), daysAgo(4)].sort());
  });

  it("skips inactive and soft-deleted templates", async () => {
    await db.recurring_transactions.bulkAdd([
      makeRecurring({ id: "rt-inactive", active: 0 }),
      makeRecurring({
        id: "rt-deleted",
        deleted_at: new Date().toISOString(),
      }),
    ]);

    const result = await processRecurringTransactions();

    expect(result.generatedCount).toBe(0);
    expect(await db.transactions.count()).toBe(0);
    expect(syncManager.schedulePush).not.toHaveBeenCalled();
  });

  it("does not duplicate an occurrence that already exists (multi-device convergence)", async () => {
    await db.recurring_transactions.add(makeRecurring({ frequency: "monthly" }));
    // Simulate the same occurrence already synced from another device.
    await db.transactions.add({
      id: recurringOccurrenceTransactionId("rt-1", today()),
      user_id: USER_ID,
      category_id: CATEGORY_ID,
      type: "expense",
      amount: 10,
      date: today(),
      year_month: today().substring(0, 7),
      description: "Gym membership",
      pendingSync: 0,
      deleted_at: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await processRecurringTransactions();

    expect(result.generatedCount).toBe(0);
    expect(await db.transactions.count()).toBe(1);
    // last_generated must still advance so the template doesn't re-check forever.
    const rt = await db.recurring_transactions.get("rt-1");
    expect(rt?.last_generated).toBe(today());
    expect(syncManager.schedulePush).toHaveBeenCalled();
  });

  it("resumes from last_generated instead of start_date", async () => {
    await db.recurring_transactions.add(
      makeRecurring({ start_date: daysAgo(10), last_generated: daysAgo(2) })
    );

    const result = await processRecurringTransactions();

    expect(result.generatedCount).toBe(2);
    const dates = (await db.transactions.toArray()).map((t) => t.date).sort();
    expect(dates).toEqual([daysAgo(1), today()].sort());
  });

  it("does nothing when the template is already up to date", async () => {
    await db.recurring_transactions.add(
      makeRecurring({ start_date: daysAgo(5), last_generated: today() })
    );

    const result = await processRecurringTransactions();

    expect(result.generatedCount).toBe(0);
    expect(await db.transactions.count()).toBe(0);
    expect(syncManager.schedulePush).not.toHaveBeenCalled();
  });

  it("excludes income occurrences from expenseTotal but counts them", async () => {
    await db.recurring_transactions.bulkAdd([
      makeRecurring({ id: "rt-exp", amount: 25 }),
      makeRecurring({ id: "rt-inc", type: "income", amount: 1000 }),
    ]);

    const result = await processRecurringTransactions();

    expect(result.generatedCount).toBe(2);
    expect(result.expenseTotal).toBe(25);
  });

  it("uses a frequency fallback description when none is set", async () => {
    await db.recurring_transactions.add(makeRecurring({ description: "" }));

    await processRecurringTransactions();

    const tx = (await db.transactions.toArray())[0];
    expect(tx.description).toBe("Recurring: daily");
  });
});
