import { db } from "../db";

describe("db", () => {
  it("should export db instance", () => {
    expect(db).toBeDefined();
    expect(db.name).toBe("ExpenseTrackerDB");
  });

  it("should have all required tables", () => {
    expect(db.transactions).toBeDefined();
    expect(db.categories).toBeDefined();
    expect(db.contexts).toBeDefined();
    expect(db.recurring_transactions).toBeDefined();
    expect(db.user_settings).toBeDefined();
    expect(db.groups).toBeDefined();
    expect(db.group_members).toBeDefined();
    expect(db.category_budgets).toBeDefined();
  });

  it("should have correct version", () => {
    expect(db.verno).toBe(3);
  });
});
