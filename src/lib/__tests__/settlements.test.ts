import {
  SETTLEMENT_PREFIX,
  buildSettlementDescription,
  isSettlementTransaction,
  extractSettlementNote,
  generateSettlementShareText,
} from "../settlements";

describe("buildSettlementDescription", () => {
  it("prefixes a note with the settlement marker", () => {
    expect(buildSettlementDescription("March rent")).toBe(
      `${SETTLEMENT_PREFIX} March rent`
    );
  });

  it("trims surrounding whitespace from the note", () => {
    expect(buildSettlementDescription("  March rent  ")).toBe(
      `${SETTLEMENT_PREFIX} March rent`
    );
  });

  it("returns the bare prefix when the note is empty or whitespace", () => {
    expect(buildSettlementDescription("")).toBe(SETTLEMENT_PREFIX);
    expect(buildSettlementDescription("   ")).toBe(SETTLEMENT_PREFIX);
  });
});

describe("isSettlementTransaction", () => {
  const base = {
    description: `${SETTLEMENT_PREFIX} note`,
    group_id: "group-1",
    type: "expense" as const,
  };

  it("detects a group expense with the settlement prefix", () => {
    expect(isSettlementTransaction(base)).toBe(true);
  });

  it("detects the bare prefix with no note", () => {
    expect(
      isSettlementTransaction({ ...base, description: SETTLEMENT_PREFIX })
    ).toBe(true);
  });

  it("rejects transactions without a group", () => {
    expect(isSettlementTransaction({ ...base, group_id: null })).toBe(false);
  });

  it("rejects non-expense transactions", () => {
    expect(isSettlementTransaction({ ...base, type: "income" })).toBe(false);
  });

  it("rejects descriptions where the prefix is not at the start", () => {
    expect(
      isSettlementTransaction({
        ...base,
        description: `paid back ${SETTLEMENT_PREFIX}`,
      })
    ).toBe(false);
  });

  it("rejects a missing description", () => {
    expect(
      isSettlementTransaction({ ...base, description: undefined })
    ).toBe(false);
  });
});

describe("extractSettlementNote", () => {
  it("strips the prefix and trims the remaining note", () => {
    expect(extractSettlementNote(`${SETTLEMENT_PREFIX} March rent`)).toBe(
      "March rent"
    );
  });

  it("returns empty string when there is no note", () => {
    expect(extractSettlementNote(SETTLEMENT_PREFIX)).toBe("");
  });
});

describe("generateSettlementShareText", () => {
  const t = (key: string) => key;

  it("renders the plan with names, amounts and 'you' substitution", () => {
    const text = generateSettlementShareText({
      groupName: "Trip",
      totalExpenses: 123.456,
      settlements: [
        { from: "user-1", to: "user-2", amount: 30 },
        { from: "user-3", to: "user-2", amount: 12.5 },
      ],
      balances: {
        "user-1": { displayName: "Alice" },
        "user-2": { displayName: "Bob" },
        "user-3": { displayName: "Carol" },
      },
      currentUserId: "user-2",
      t,
    });

    const lines = text.split("\n");
    expect(lines[0]).toBe("settlement_plan - Trip");
    expect(lines[1]).toBe("total_expenses: €123.46");
    expect(lines).toContain("1. Alice → €30.00 → you");
    expect(lines).toContain("2. Carol → €12.50 → you");
    expect(lines[lines.length - 1]).toBe("generated_by app_title");
  });

  it("falls back to 'Unknown' for users missing from balances", () => {
    const text = generateSettlementShareText({
      groupName: "Trip",
      totalExpenses: 10,
      settlements: [{ from: "ghost", to: "user-2", amount: 10 }],
      balances: { "user-2": { displayName: "Bob" } },
      currentUserId: "user-9",
      t,
    });

    expect(text).toContain("1. Unknown → €10.00 → Bob");
  });
});
