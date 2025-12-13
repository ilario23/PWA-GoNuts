# Local Data Encryption

This document describes the client-side encryption system used to protect sensitive financial data stored in IndexedDB.

## Overview

The application implements **field-level encryption** for sensitive data stored locally. Data is encrypted before being stored in IndexedDB and decrypted when read for display. Server-side data (Supabase) remains unencrypted.

### Security Model

| Component | Algorithm | Parameters |
|-----------|-----------|------------|
| Key Derivation | PBKDF2-SHA256 | 100,000 iterations |
| Encryption | AES-256-GCM | 12-byte random IV |
| Salt | Random | 16 bytes per user |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Login                               │
├─────────────────────────────────────────────────────────────────┤
│  1. User enters email + password                                 │
│  2. getSaltForUser(email) → retrieve/generate salt               │
│  3. cryptoService.initialize(password, salt)                     │
│     └── PBKDF2 derives AES-256 key (~200-400ms)                 │
│  4. Key stored in memory only (never persisted)                  │
│  5. supabase.auth.signInWithPassword()                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Data Flow - PULL                             │
├─────────────────────────────────────────────────────────────────┤
│  Supabase ──(clear)──► SyncManager ──(encrypt)──► IndexedDB     │
│                                                                  │
│  prepareItemForLocal():                                          │
│    1. Normalize data types                                       │
│    2. encryptFields(item, ENCRYPTED_FIELDS[table])               │
│    3. db.table.put(encryptedItem)                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Data Flow - PUSH                             │
├─────────────────────────────────────────────────────────────────┤
│  IndexedDB ──(decrypt)──► SyncManager ──(clear)──► Supabase     │
│                                                                  │
│  pushBatchWithRetry():                                           │
│    1. decryptItemForPush(item, tableName)                        │
│    2. prepareItemForPush() & send to Supabase                   │
│    3. Re-encrypt server response before local update             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     Data Flow - READ                             │
├─────────────────────────────────────────────────────────────────┤
│  IndexedDB ──(encrypted)──► Hook ──(decrypt)──► UI Component    │
│                                                                  │
│  useLiveQuery():                                                 │
│    1. db.table.toArray()                                         │
│    2. decryptArray(results, ENCRYPTED_FIELDS[table])            │
│    3. Return decrypted data to component                         │
└─────────────────────────────────────────────────────────────────┘
```

## Encrypted Fields

The following fields are encrypted in local storage:

| Table | Encrypted Fields |
|-------|------------------|
| `transactions` | `description`, `amount` |
| `recurring_transactions` | `description`, `amount` |
| `categories` | `name` |
| `contexts` | `name`, `description` |
| `profiles` | `email`, `full_name` |
| `import_rules` | `match_string` |
| `category_budgets` | `amount` |
| `user_settings` | `monthly_budget` |

## File Structure

```
src/lib/
├── crypto.ts              # Core crypto functions & CryptoService
├── crypto-storage.ts      # Salt management in localStorage
└── crypto-middleware.ts   # Field encryption/decryption helpers

src/hooks/
├── useTransactions.ts     # Decrypt on read
├── useCategories.ts       # Decrypt on read
├── useRecurringTransactions.ts
├── useContexts.ts
├── useProfiles.ts
└── useSettings.ts
```

## API Reference

### CryptoService (Singleton)

```typescript
import { cryptoService } from '@/lib/crypto';

// Initialize with user password (call at login)
await cryptoService.initialize(password, salt);

// Check if ready
if (cryptoService.ready) { ... }

// Encrypt/decrypt single values
const encrypted = await cryptoService.encryptValue(plaintext);
const decrypted = await cryptoService.decryptValue(encrypted);

// Clear key (call at logout)
cryptoService.clearKey();
```

### Encryption Helpers

```typescript
import { 
  encryptFields, 
  decryptFields, 
  decryptArray,
  ENCRYPTED_FIELDS 
} from '@/lib/crypto-middleware';

// Encrypt specific fields in an object
const encrypted = await encryptFields(transaction, ['description', 'amount']);

// Decrypt specific fields
const decrypted = await decryptFields(encrypted, ['description', 'amount']);

// Decrypt array of objects
const decryptedArray = await decryptArray(transactions, ENCRYPTED_FIELDS.transactions);
```

### Salt Management

```typescript
import { getSaltForUser, storeSaltForUser } from '@/lib/crypto-storage';

// Get existing salt or generate new one
const salt = getSaltForUser(email);

// Store salt for new user
storeSaltForUser(email, salt);
```

## Encrypted Data Format

Encrypted values are stored as Base64 strings with format:

```
<IV_base64>:<ciphertext_base64>
```

Example:
```
mN2Kx8PqRt5Lw3Yv:aGVsbG8gd29ybGQhIQ==
```

## Security Considerations

### Strengths

1. **Key never stored**: Derived from password, kept in memory only
2. **Per-user salt**: Prevents rainbow table attacks
3. **GCM mode**: Provides authentication (tamper detection)
4. **High iteration count**: 100K PBKDF2 iterations

### Limitations

1. **No key recovery**: If user forgets password, local data is lost
2. **Memory-only key**: Requires re-login after page refresh
3. **No server encryption**: Data on Supabase is unencrypted
4. **Browser dependency**: Relies on Web Crypto API

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Device theft | Data encrypted at rest |
| Browser cache analysis | Sensitive fields encrypted |
| IndexedDB dump | Ciphertext without key is useless |
| Password guessing | PBKDF2 with 100K iterations |
| Replay attacks | GCM authentication tag |

## Graceful Degradation

If encryption is not initialized (e.g., before login):

- `encryptValue()` returns original value unchanged
- `decryptValue()` returns original value unchanged
- Console warnings are logged

This ensures the app remains functional during the login flow.

## Testing

```bash
# Run crypto-related tests
npm test -- src/lib/__tests__/crypto.test.ts
npm test -- src/lib/__tests__/crypto-middleware.test.ts

# Run all tests
npm test
```

Note: Some tests are skipped in Node.js/Jest due to Web Crypto API limitations. These tests run correctly in browser environments.

## Browser DevTools Verification

To verify encryption is working:

1. Login to the application
2. Create a transaction
3. Open DevTools → Application → IndexedDB → `expense-tracker`
4. Navigate to `transactions` table
5. Check that `description` and `amount` fields contain encrypted values (Base64 with `:` separator)

## Future Enhancements

- [ ] Offline PIN unlock (cache key securely)
- [ ] Password change (re-encrypt local data)
- [ ] Biometric unlock on supported devices
- [ ] Server-side encryption option
