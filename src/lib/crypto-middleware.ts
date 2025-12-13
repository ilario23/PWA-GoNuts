/**
 * @fileoverview Dexie middleware for transparent field-level encryption.
 *
 * Automatically encrypts specified fields on write and decrypts on read.
 * Works transparently with existing Dexie operations.
 *
 * @module lib/crypto-middleware
 */

import { Dexie } from "dexie";
import { cryptoService } from "./crypto";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for encrypted fields per table.
 */
export interface EncryptedFieldsConfig {
    [tableName: string]: string[];
}

// ============================================================================
// ENCRYPTED FIELDS CONFIGURATION
// ============================================================================

/**
 * Fields to encrypt per table.
 * Only string/number fields that are NOT indexed should be listed.
 */
export const ENCRYPTED_FIELDS: EncryptedFieldsConfig = {
    transactions: ["description", "amount"],
    recurring_transactions: ["description", "amount"],
    categories: ["name"],
    contexts: ["name", "description"],
    profiles: ["email", "full_name"],
    import_rules: ["match_string"],
    category_budgets: ["amount"],
    user_settings: ["monthly_budget"],
};

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Encrypt specified fields in an object.
 * Only encrypts if crypto service is initialized.
 *
 * @param obj - Object to encrypt fields in
 * @param fields - Array of field names to encrypt
 * @returns Object with encrypted fields
 */
export async function encryptFields<T extends Record<string, unknown>>(
    obj: T,
    fields: string[]
): Promise<T> {
    if (!cryptoService.ready) {
        return obj;
    }

    const result = { ...obj } as Record<string, unknown>;

    for (const field of fields) {
        if (field in result && result[field] != null) {
            const value = result[field];
            // Convert to string for encryption
            const stringValue =
                typeof value === "string" ? value : JSON.stringify(value);
            result[field] = await cryptoService.encryptValue(stringValue);
        }
    }

    return result as T;
}

/**
 * Decrypt specified fields in an object.
 * Only decrypts if crypto service is initialized.
 *
 * @param obj - Object to decrypt fields in
 * @param fields - Array of field names to decrypt
 * @returns Object with decrypted fields
 */
export async function decryptFields<T extends Record<string, unknown>>(
    obj: T,
    fields: string[]
): Promise<T> {
    if (!cryptoService.ready) {
        return obj;
    }

    const result = { ...obj } as Record<string, unknown>;

    for (const field of fields) {
        if (field in result && result[field] != null) {
            const encryptedValue = result[field];
            if (typeof encryptedValue === "string") {
                const decrypted = await cryptoService.decryptValue(encryptedValue);
                // Try to parse as JSON (for numbers and objects)
                try {
                    result[field] = JSON.parse(decrypted);
                } catch {
                    // If parsing fails, use as string
                    result[field] = decrypted;
                }
            }
        }
    }

    return result as T;
}

/**
 * Decrypt an array of objects.
 */
export async function decryptArray<T extends Record<string, unknown>>(
    items: T[],
    fields: string[]
): Promise<T[]> {
    if (!cryptoService.ready || fields.length === 0) {
        return items;
    }

    return Promise.all(items.map((item) => decryptFields(item, fields)));
}

// ============================================================================
// WRAPPER FUNCTIONS FOR ENCRYPTED OPERATIONS
// ============================================================================

/**
 * Helper to wrap a Dexie put/add operation with encryption.
 * Use this instead of direct table.put() for encrypted tables.
 *
 * @param table - Dexie table
 * @param item - Item to store
 * @param tableName - Name of the table for field lookup
 */
export async function encryptedPut<T extends Record<string, unknown>>(
    table: Dexie.Table<T>,
    item: T,
    tableName: string
): Promise<void> {
    const fields = ENCRYPTED_FIELDS[tableName] || [];
    const encrypted = await encryptFields(item, fields);
    await table.put(encrypted);
}

/**
 * Helper to wrap a Dexie bulkPut operation with encryption.
 *
 * @param table - Dexie table
 * @param items - Items to store
 * @param tableName - Name of the table for field lookup
 */
export async function encryptedBulkPut<T extends Record<string, unknown>>(
    table: Dexie.Table<T>,
    items: T[],
    tableName: string
): Promise<void> {
    const fields = ENCRYPTED_FIELDS[tableName] || [];
    if (fields.length === 0) {
        await table.bulkPut(items);
        return;
    }

    const encrypted = await Promise.all(
        items.map((item) => encryptFields(item, fields))
    );
    await table.bulkPut(encrypted);
}

/**
 * Helper to wrap a Dexie get operation with decryption.
 *
 * @param table - Dexie table
 * @param key - Primary key to look up
 * @param tableName - Name of the table for field lookup
 */
export async function decryptedGet<T extends Record<string, unknown>>(
    table: Dexie.Table<T>,
    key: string,
    tableName: string
): Promise<T | undefined> {
    const item = await table.get(key);
    if (!item) return undefined;

    const fields = ENCRYPTED_FIELDS[tableName] || [];
    return decryptFields(item, fields);
}

/**
 * Helper to wrap a Dexie toArray operation with decryption.
 *
 * @param collection - Dexie collection or table
 * @param tableName - Name of the table for field lookup
 */
export async function decryptedToArray<T extends Record<string, unknown>>(
    collection: Dexie.Collection<T, string> | Dexie.Table<T>,
    tableName: string
): Promise<T[]> {
    const items = await collection.toArray();
    const fields = ENCRYPTED_FIELDS[tableName] || [];
    return decryptArray(items, fields);
}
