/**
 * @fileoverview Unit tests for crypto middleware.
 *
 * Tests field-level encryption and decryption helpers.
 */

import {
    encryptFields,
    decryptFields,
    decryptArray,
    ENCRYPTED_FIELDS,
} from "../crypto-middleware";

// Create a mutable flag for controlling ready state in tests
let mockReady = false;

// Mock the crypto module
jest.mock("../crypto", () => ({
    cryptoService: {
        get ready() {
            return mockReady;
        },
        encryptValue: jest.fn((value: string) => Promise.resolve(`encrypted:${value}`)),
        decryptValue: jest.fn((value: string) => {
            if (value.startsWith("encrypted:")) {
                return Promise.resolve(value.replace("encrypted:", ""));
            }
            return Promise.resolve(value);
        }),
    },
}));

describe("crypto-middleware", () => {
    describe("ENCRYPTED_FIELDS configuration", () => {
        it("defines encrypted fields for transactions", () => {
            expect(ENCRYPTED_FIELDS.transactions).toContain("description");
            expect(ENCRYPTED_FIELDS.transactions).toContain("amount");
        });

        it("defines encrypted fields for recurring_transactions", () => {
            expect(ENCRYPTED_FIELDS.recurring_transactions).toContain("description");
            expect(ENCRYPTED_FIELDS.recurring_transactions).toContain("amount");
        });

        it("defines encrypted fields for categories", () => {
            expect(ENCRYPTED_FIELDS.categories).toContain("name");
        });

        it("defines encrypted fields for profiles", () => {
            expect(ENCRYPTED_FIELDS.profiles).toContain("email");
            expect(ENCRYPTED_FIELDS.profiles).toContain("full_name");
        });
    });

    describe("encryptFields", () => {
        beforeEach(() => {
            mockReady = true;
            jest.clearAllMocks();
        });

        it("returns original object when crypto service is not ready", async () => {
            mockReady = false;

            const obj = { id: "123", description: "Test" };
            const result = await encryptFields(obj, ["description"]);

            expect(result).toEqual(obj);
        });

        it("encrypts specified string fields", async () => {
            const obj = { id: "123", description: "Test", amount: 100 };
            const result = await encryptFields(obj, ["description"]);

            expect(result.id).toBe("123");
            expect(result.description).toBe("encrypted:Test");
            expect(result.amount).toBe(100);
        });

        it("encrypts number fields by JSON.stringify", async () => {
            const obj = { id: "123", amount: 42.5 };
            const result = await encryptFields(obj, ["amount"]);

            expect(result.id).toBe("123");
            expect(result.amount).toBe("encrypted:42.5");
        });

        it("skips null and undefined fields", async () => {
            const obj = { id: "123", description: null, amount: undefined };
            const result = await encryptFields(obj, ["description", "amount"]);

            expect(result.description).toBeNull();
            expect(result.amount).toBeUndefined();
        });

        it("does not modify original object", async () => {
            const obj = { id: "123", description: "Test" };
            const originalDescription = obj.description;
            await encryptFields(obj, ["description"]);

            expect(obj.description).toBe(originalDescription);
        });
    });

    describe("decryptFields", () => {
        beforeEach(() => {
            mockReady = true;
            jest.clearAllMocks();
        });

        it("returns original object when crypto service is not ready", async () => {
            mockReady = false;

            const obj = { id: "123", description: "encrypted:Test" };
            const result = await decryptFields(obj, ["description"]);

            expect(result).toEqual(obj);
        });

        it("decrypts specified string fields", async () => {
            const obj = { id: "123", description: "encrypted:Test" };
            const result = await decryptFields(obj, ["description"]);

            expect(result.id).toBe("123");
            expect(result.description).toBe("Test");
        });

        it("parses JSON for number values", async () => {
            const obj = { id: "123", amount: "encrypted:42.5" };
            const result = await decryptFields(obj, ["amount"]);

            expect(result.id).toBe("123");
            expect(result.amount).toBe(42.5);
        });

        it("skips non-string encrypted values", async () => {
            const obj = { id: "123", amount: 100 };
            const result = await decryptFields(obj, ["amount"]);

            expect(result.amount).toBe(100);
        });
    });

    describe("decryptArray", () => {
        beforeEach(() => {
            mockReady = true;
            jest.clearAllMocks();
        });

        it("returns original array when crypto service is not ready", async () => {
            mockReady = false;

            const items = [{ id: "1", description: "encrypted:A" }];
            const result = await decryptArray(items, ["description"]);

            expect(result).toEqual(items);
        });

        it("returns original array when no fields specified", async () => {
            const items = [{ id: "1", description: "encrypted:A" }];
            const result = await decryptArray(items, []);

            expect(result).toEqual(items);
        });

        it("decrypts all items in array", async () => {
            const items = [
                { id: "1", description: "encrypted:A" },
                { id: "2", description: "encrypted:B" },
            ];
            const result = await decryptArray(items, ["description"]);

            expect(result[0].description).toBe("A");
            expect(result[1].description).toBe("B");
        });
    });
});

