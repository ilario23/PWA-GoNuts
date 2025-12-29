import {
  getTransactionInputSchema,
  getTransactionUpdateSchema,
  getCategoryInputSchema,
  getContextInputSchema,
  getRecurringTransactionInputSchema,
  getGroupInputSchema,
  getGroupMemberInputSchema,
  getCategoryBudgetInputSchema,
  validate,
  safeValidate,
  ValidationError,
} from "../validation";

// Mock translation function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = ((key: string) => key) as any;

describe("Validation Schemas", () => {
  const validUUID = "123e4567-e89b-12d3-a456-426614174000";

  describe("TransactionInputSchema", () => {
    const validTransaction = {
      user_id: validUUID,
      category_id: validUUID,
      type: "expense" as const,
      amount: 100.5,
      date: "2024-01-15",
      year_month: "2024-01",
      description: "Test transaction",
    };

    it("should accept valid transaction data", () => {
      const result = safeValidate(
        getTransactionInputSchema(t),
        validTransaction
      );
      expect(result.success).toBe(true);
    });

    it("should reject negative amount", () => {
      const result = safeValidate(getTransactionInputSchema(t), {
        ...validTransaction,
        amount: -50,
      });
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errors[0].message).toContain("validation.amount_positive");
      }
    });

    it("should reject zero amount", () => {
      const result = safeValidate(getTransactionInputSchema(t), {
        ...validTransaction,
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid date format", () => {
      const result = safeValidate(getTransactionInputSchema(t), {
        ...validTransaction,
        date: "15-01-2024",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty description", () => {
      const result = safeValidate(getTransactionInputSchema(t), {
        ...validTransaction,
        description: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid type", () => {
      const result = safeValidate(getTransactionInputSchema(t), {
        ...validTransaction,
        type: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("should accept optional group_id", () => {
      const result = safeValidate(getTransactionInputSchema(t), {
        ...validTransaction,
        group_id: validUUID,
      });
      expect(result.success).toBe(true);
    });

    it("should accept null group_id", () => {
      const result = safeValidate(getTransactionInputSchema(t), {
        ...validTransaction,
        group_id: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("TransactionUpdateSchema", () => {
    it("should accept partial updates", () => {
      const result = safeValidate(getTransactionUpdateSchema(t), {
        amount: 200,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid partial updates", () => {
      const result = safeValidate(getTransactionUpdateSchema(t), {
        amount: -100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("CategoryInputSchema", () => {
    const validCategory = {
      user_id: validUUID,
      name: "Food",
      icon: "utensils",
      color: "#FF5733",
      type: "expense" as const,
      active: 1,
    };

    it("should accept valid category data", () => {
      const result = safeValidate(getCategoryInputSchema(t), validCategory);
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const result = safeValidate(getCategoryInputSchema(t), {
        ...validCategory,
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject too long name", () => {
      const result = safeValidate(getCategoryInputSchema(t), {
        ...validCategory,
        name: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("should accept parent_id for subcategories", () => {
      const result = safeValidate(getCategoryInputSchema(t), {
        ...validCategory,
        parent_id: validUUID,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("ContextInputSchema", () => {
    const validContext = {
      user_id: validUUID,
      name: "Work",
      active: 1,
    };

    it("should accept valid context data", () => {
      const result = safeValidate(getContextInputSchema(t), validContext);
      expect(result.success).toBe(true);
    });

    it("should accept optional description", () => {
      const result = safeValidate(getContextInputSchema(t), {
        ...validContext,
        description: "Work related expenses",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const result = safeValidate(getContextInputSchema(t), {
        ...validContext,
        name: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("RecurringTransactionInputSchema", () => {
    const validRecurring = {
      user_id: validUUID,
      category_id: validUUID,
      type: "expense" as const,
      amount: 50,
      description: "Monthly subscription",
      frequency: "monthly" as const,
      start_date: "2024-01-01",
      active: 1,
    };

    it("should accept valid recurring transaction data", () => {
      const result = safeValidate(
        getRecurringTransactionInputSchema(t),
        validRecurring
      );
      expect(result.success).toBe(true);
    });

    it("should reject invalid frequency", () => {
      const result = safeValidate(getRecurringTransactionInputSchema(t), {
        ...validRecurring,
        frequency: "biweekly",
      });
      expect(result.success).toBe(false);
    });

    it("should accept end_date", () => {
      const result = safeValidate(getRecurringTransactionInputSchema(t), {
        ...validRecurring,
        end_date: "2024-12-31",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("GroupInputSchema", () => {
    const validGroup = {
      name: "Family Budget",
      created_by: validUUID,
    };

    it("should accept valid group data", () => {
      const result = safeValidate(getGroupInputSchema(t), validGroup);
      expect(result.success).toBe(true);
    });

    it("should accept optional description", () => {
      const result = safeValidate(getGroupInputSchema(t), {
        ...validGroup,
        description: "Shared family expenses",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const result = safeValidate(getGroupInputSchema(t), {
        ...validGroup,
        name: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("GroupMemberInputSchema", () => {
    const validMember = {
      group_id: validUUID,
      user_id: validUUID,
      share: 50,
    };

    it("should accept valid member data", () => {
      const result = safeValidate(getGroupMemberInputSchema(t), validMember);
      expect(result.success).toBe(true);
    });

    it("should reject share over 100", () => {
      const result = safeValidate(getGroupMemberInputSchema(t), {
        ...validMember,
        share: 150,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative share", () => {
      const result = safeValidate(getGroupMemberInputSchema(t), {
        ...validMember,
        share: -10,
      });
      expect(result.success).toBe(false);
    });

    it("should accept 0 share", () => {
      const result = safeValidate(getGroupMemberInputSchema(t), {
        ...validMember,
        share: 0,
      });
      expect(result.success).toBe(true);
    });

    it("should accept 100 share", () => {
      const result = safeValidate(getGroupMemberInputSchema(t), {
        ...validMember,
        share: 100,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CategoryBudgetInputSchema", () => {
    const validBudget = {
      user_id: validUUID,
      category_id: validUUID,
      amount: 500,
      period: "monthly" as const,
    };

    it("should accept valid budget data", () => {
      const result = safeValidate(
        getCategoryBudgetInputSchema(t),
        validBudget
      );
      expect(result.success).toBe(true);
    });

    it("should reject zero amount", () => {
      const result = safeValidate(getCategoryBudgetInputSchema(t), {
        ...validBudget,
        amount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should accept yearly period", () => {
      const result = safeValidate(getCategoryBudgetInputSchema(t), {
        ...validBudget,
        period: "yearly",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid period", () => {
      const result = safeValidate(getCategoryBudgetInputSchema(t), {
        ...validBudget,
        period: "weekly",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("validate helper", () => {
    it("should return data on success", () => {
      const data = { name: "Test", created_by: validUUID };
      const result = validate(getGroupInputSchema(t), data);
      expect(result.name).toBe("Test");
    });

    it("should throw ValidationError on failure", () => {
      expect(() =>
        validate(getGroupInputSchema(t), { name: "" })
      ).toThrow(ValidationError);
    });

    it("should include field path in error message", () => {
      try {
        validate(getGroupInputSchema(t), {
          name: "",
          created_by: "invalid-uuid",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain("name");
      }
    });
  });

  describe("safeValidate helper", () => {
    it("should return success object on valid data", () => {
      const data = { name: "Test", created_by: validUUID };
      const result = safeValidate(getGroupInputSchema(t), data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Test");
      }
    });

    it("should return errors object on invalid data", () => {
      const result = safeValidate(getGroupInputSchema(t), { name: "" });
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
