/**
 * @fileoverview Cryptographic utilities for local data encryption.
 *
 * Provides secure encryption/decryption using Web Crypto API with:
 * - PBKDF2 key derivation (100,000 iterations, SHA-256)
 * - AES-256-GCM authenticated encryption
 *
 * @module lib/crypto
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** PBKDF2 iteration count - balance between security and performance */
const PBKDF2_ITERATIONS = 100_000;

/** Salt length in bytes for PBKDF2 */
const SALT_LENGTH = 16;

/** IV length in bytes for AES-GCM */
const IV_LENGTH = 12;

/** AES key length in bits */
const AES_KEY_LENGTH = 256;


// ============================================================================
// KEY DERIVATION
// ============================================================================

/**
 * Generate a cryptographically secure random salt.
 * @returns Random salt as Uint8Array
 */
export function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Derive an AES-256-GCM key from a password using PBKDF2.
 *
 * @param password - User's password
 * @param salt - Salt for key derivation (should be stored per-user)
 * @returns Promise resolving to a CryptoKey for AES-GCM operations
 *
 * @example
 * const salt = generateSalt();
 * const key = await deriveKey("userPassword123", salt);
 */
export async function deriveKey(
    password: string,
    salt: Uint8Array
): Promise<CryptoKey> {
    // Import password as raw key material
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    // Derive AES-GCM key using PBKDF2
    // Note: Convert Uint8Array to ArrayBuffer to satisfy TypeScript's BufferSource type
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256",
        },
        passwordKey,
        {
            name: "AES-GCM",
            length: AES_KEY_LENGTH,
        },
        false, // Not extractable for security
        ["encrypt", "decrypt"]
    );
}

// ============================================================================
// ENCRYPTION / DECRYPTION
// ============================================================================

/**
 * Encrypt a string using AES-256-GCM.
 *
 * @param plaintext - Data to encrypt
 * @param key - CryptoKey derived from password
 * @returns Promise resolving to Base64 encoded encrypted data (iv:ciphertext)
 *
 * @example
 * const encrypted = await encrypt("sensitive data", key);
 * // Returns: "base64iv:base64ciphertext"
 */
export async function encrypt(
    plaintext: string,
    key: CryptoKey
): Promise<string> {
    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encrypt with AES-GCM (includes authentication tag)
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(plaintext)
    );

    // Encode as Base64 and combine with separator
    const ivBase64 = arrayBufferToBase64(iv);
    const dataBase64 = arrayBufferToBase64(ciphertext);

    return `${ivBase64}:${dataBase64}`;
}

/**
 * Decrypt AES-256-GCM encrypted data.
 *
 * @param encryptedString - Base64 encoded encrypted data (iv:ciphertext)
 * @param key - CryptoKey derived from password
 * @returns Promise resolving to decrypted plaintext
 * @throws Error if decryption fails (wrong key or tampered data)
 *
 * @example
 * const decrypted = await decrypt(encryptedString, key);
 */
export async function decrypt(
    encryptedString: string,
    key: CryptoKey
): Promise<string> {
    // Split IV and ciphertext
    const [ivBase64, dataBase64] = encryptedString.split(":");
    if (!ivBase64 || !dataBase64) {
        throw new Error("Invalid encrypted data format");
    }

    const iv = base64ToArrayBuffer(ivBase64);
    const ciphertext = base64ToArrayBuffer(dataBase64);

    // Decrypt with AES-GCM (verifies authentication tag)
    const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        ciphertext
    );

    return new TextDecoder().decode(plaintext);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert ArrayBuffer to Base64 string.
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes =
        buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// ============================================================================
// CRYPTO SERVICE SINGLETON
// ============================================================================

/**
 * Singleton service for managing encryption state.
 * Holds the derived key in memory for the session.
 */
class CryptoService {
    private key: CryptoKey | null = null;
    private isInitialized = false;

    /**
     * Check if crypto service is ready for encryption/decryption.
     */
    get ready(): boolean {
        return this.isInitialized && this.key !== null;
    }

    /**
     * Initialize the crypto service with a derived key.
     * Call this after successful login.
     *
     * @param password - User's password
     * @param salt - User's salt (from storage)
     */
    async initialize(password: string, salt: Uint8Array): Promise<void> {
        this.key = await deriveKey(password, salt);
        this.isInitialized = true;
        console.log("[CryptoService] Initialized with derived key");
    }

    /**
     * Set the key directly (for testing or when key is already derived).
     */
    setKey(key: CryptoKey): void {
        this.key = key;
        this.isInitialized = true;
    }

    /**
     * Clear the encryption key from memory.
     * Call this on logout.
     */
    clearKey(): void {
        this.key = null;
        this.isInitialized = false;
        console.log("[CryptoService] Key cleared from memory");
    }

    /**
     * Encrypt a value if the service is initialized.
     * Returns the original value if not initialized (fallback for unencrypted mode).
     */
    async encryptValue(value: string): Promise<string> {
        if (!this.key) {
            console.warn("[CryptoService] Not initialized, storing unencrypted");
            return value;
        }
        return encrypt(value, this.key);
    }

    /**
     * Decrypt a value if the service is initialized.
     * Returns the original value if not initialized or if value is not encrypted.
     */
    async decryptValue(value: string): Promise<string> {
        if (!this.key) {
            console.warn("[CryptoService] Not initialized, returning as-is");
            return value;
        }

        // Check if value looks encrypted (contains : separator and is base64-ish)
        if (!value.includes(":") || value.length < 20) {
            // Probably not encrypted, return as-is
            return value;
        }

        try {
            return await decrypt(value, this.key);
        } catch (error) {
            // If decryption fails, value might not be encrypted
            console.warn("[CryptoService] Decryption failed, returning as-is", error);
            return value;
        }
    }

    /**
     * Get the current key (for middleware use).
     * Throws if not initialized.
     */
    getKey(): CryptoKey {
        if (!this.key) {
            throw new Error("CryptoService not initialized");
        }
        return this.key;
    }
}

/** Global crypto service instance */
export const cryptoService = new CryptoService();
