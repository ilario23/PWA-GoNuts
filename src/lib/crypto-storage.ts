/**
 * @fileoverview Salt storage management for encryption.
 *
 * Stores and retrieves per-user salt values used for key derivation.
 * Salt is stored in localStorage indexed by email hash for privacy.
 *
 * @module lib/crypto-storage
 */

import { generateSalt } from "./crypto";

// ============================================================================
// CONSTANTS
// ============================================================================

const SALT_STORAGE_KEY = "expense_tracker_crypto_salts";

// ============================================================================
// SALT STORAGE
// ============================================================================

/**
 * Simple hash function for email (not cryptographic, just for indexing).
 */
function hashEmail(email: string): string {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
        const char = email.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Get all stored salts from localStorage.
 */
function getAllSalts(): Record<string, string> {
    try {
        const stored = localStorage.getItem(SALT_STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

/**
 * Save all salts to localStorage.
 */
function saveSalts(salts: Record<string, string>): void {
    localStorage.setItem(SALT_STORAGE_KEY, JSON.stringify(salts));
}

/**
 * Get or create salt for a user.
 * If no salt exists, generates a new one and stores it.
 *
 * @param email - User's email address
 * @returns Salt as Uint8Array
 */
export function getSaltForUser(email: string): Uint8Array {
    const emailHash = hashEmail(email.toLowerCase());
    const salts = getAllSalts();

    if (salts[emailHash]) {
        // Decode existing salt from base64
        return base64ToUint8Array(salts[emailHash]);
    }

    // Generate new salt for first-time users
    const newSalt = generateSalt();
    salts[emailHash] = uint8ArrayToBase64(newSalt);
    saveSalts(salts);
    console.log("[CryptoStorage] Generated new salt for user");

    return newSalt;
}

/**
 * Store salt for a user (used during signup).
 *
 * @param email - User's email address
 * @param salt - Salt to store
 */
export function storeSaltForUser(email: string, salt: Uint8Array): void {
    const emailHash = hashEmail(email.toLowerCase());
    const salts = getAllSalts();
    salts[emailHash] = uint8ArrayToBase64(salt);
    saveSalts(salts);
}

/**
 * Clear salt for a user (use when clearing all local data).
 *
 * @param email - User's email address
 */
export function clearSaltForUser(email: string): void {
    const emailHash = hashEmail(email.toLowerCase());
    const salts = getAllSalts();
    delete salts[emailHash];
    saveSalts(salts);
}

/**
 * Check if a salt exists for a user.
 */
export function hasSaltForUser(email: string): boolean {
    const emailHash = hashEmail(email.toLowerCase());
    const salts = getAllSalts();
    return emailHash in salts;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
