import { generateInsights } from "../insightUtils";
import type { StatisticsWorkerResponse } from "../../types/worker";

type Payload = StatisticsWorkerResponse["payload"];

function makeStats(overrides: {
  byCategory?: Array<{ name: string; value: number; color?: string }>;
  expense?: number;
  income?: number;
}): Payload {
  return {
    monthlyStats: {
      byCategory: overrides.byCategory ?? [],
      expense: overrides.expense ?? 0,
      income: overrides.income ?? 0,
    },
  } as unknown as Payload;
}

function makeComparison(previous = 0, change = 0) {
  return { expense: { previous, change } };
}

describe("generateInsights", () => {
  it("returns no insights for empty stats", () => {
    expect(generateInsights(makeStats({}), makeComparison())).toEqual([]);
  });

  it("flags the dominant category when it exceeds 15% of spend", () => {
    const insights = generateInsights(
      makeStats({
        byCategory: [
          { name: "Rent", value: 50, color: "#f00" },
          { name: "Food", value: 10 },
        ],
        expense: 100,
      }),
      makeComparison()
    );

    const top = insights.find((i) => i.id === "top-category");
    expect(top).toBeDefined();
    expect(top?.messageParams).toEqual({ category: "Rent", percentage: 50 });
    expect(top?.color).toBe("#f00");
  });

  it("does not flag a top category at or below the 15% threshold", () => {
    const insights = generateInsights(
      makeStats({
        byCategory: [{ name: "Food", value: 15 }],
        expense: 100,
      }),
      makeComparison()
    );

    expect(insights.find((i) => i.id === "top-category")).toBeUndefined();
  });

  it("warns about a spending spike above 15% month over month", () => {
    const insights = generateInsights(
      makeStats({ expense: 120 }),
      makeComparison(100, 20)
    );

    const spike = insights.find((i) => i.id === "high-spending");
    expect(spike).toBeDefined();
    expect(spike?.type).toBe("warning");
    expect(spike?.messageParams).toEqual({ percent: 20 });
  });

  it("celebrates a spending drop greater than 10% with meaningful spend", () => {
    const insights = generateInsights(
      makeStats({ expense: 80 }),
      makeComparison(100, -20)
    );

    const drop = insights.find((i) => i.id === "low-spending");
    expect(drop).toBeDefined();
    expect(drop?.type).toBe("positive");
    expect(drop?.messageParams).toEqual({ percent: 20 });
  });

  it("suppresses the spending-drop insight when spend is trivially low", () => {
    const insights = generateInsights(
      makeStats({ expense: 40 }),
      makeComparison(100, -20)
    );

    expect(insights.find((i) => i.id === "low-spending")).toBeUndefined();
  });

  it("ignores month-over-month trends when there is no previous data", () => {
    const insights = generateInsights(
      makeStats({ expense: 500 }),
      makeComparison(0, 100)
    );

    expect(insights.find((i) => i.id === "high-spending")).toBeUndefined();
  });

  it("rewards a savings rate above 20%", () => {
    const insights = generateInsights(
      makeStats({ income: 1000, expense: 700 }),
      makeComparison()
    );

    const saver = insights.find((i) => i.id === "good-saver");
    expect(saver).toBeDefined();
    expect(saver?.messageParams).toEqual({ percent: 30 });
  });

  it("warns when spending exceeds income", () => {
    const insights = generateInsights(
      makeStats({ income: 1000, expense: 1200 }),
      makeComparison()
    );

    const over = insights.find((i) => i.id === "negative-balance");
    expect(over).toBeDefined();
    expect(over?.type).toBe("warning");
  });

  it("detects balanced spending across 5+ significant categories", () => {
    const byCategory = ["A", "B", "C", "D", "E"].map((name) => ({
      name,
      value: 20,
    }));
    const insights = generateInsights(
      makeStats({ byCategory, expense: 100 }),
      makeComparison()
    );

    expect(insights.find((i) => i.id === "balanced-spending")).toBeDefined();
  });

  it("sorts insights by priority descending", () => {
    const insights = generateInsights(
      makeStats({
        byCategory: [{ name: "Rent", value: 600 }],
        income: 1000,
        expense: 1200,
      }),
      makeComparison(1000, 20)
    );

    const priorities = insights.map((i) => i.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => b - a));
    // Overspending (95) must outrank the spike (90) and top category (80).
    expect(insights[0].id).toBe("negative-balance");
  });
});
