import {
  RECURRING_OCCURRENCE_NAMESPACE,
  recurringOccurrenceKey,
  recurringOccurrenceTransactionId,
} from "../recurringOccurrence";

describe("recurringOccurrence", () => {
  it("produces stable key and transaction id for same template + date", () => {
    const rt = "11111111-1111-1111-1111-111111111111";
    const date = "2025-03-15";
    expect(recurringOccurrenceKey(rt, date)).toBe(
      "11111111-1111-1111-1111-111111111111|2025-03-15"
    );
    const a = recurringOccurrenceTransactionId(rt, date);
    const b = recurringOccurrenceTransactionId(rt, date);
    expect(a).toBe(b);
    // Must match real `uuid` v5 (production); Jest uses __mocks__/uuid.ts with same algorithm
    expect(a).toBe("a9eddadc-804e-5574-a111-c1958e49fc65");
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("differs for different dates", () => {
    const rt = "22222222-2222-2222-2222-222222222222";
    expect(recurringOccurrenceTransactionId(rt, "2025-03-15")).not.toBe(
      recurringOccurrenceTransactionId(rt, "2025-03-16")
    );
  });

  it("namespace is fixed for cross-device convergence", () => {
    expect(RECURRING_OCCURRENCE_NAMESPACE).toBe(
      "3e3b807a-2c6d-4b9e-9c1d-8f4a2b7e6d91"
    );
  });
});
