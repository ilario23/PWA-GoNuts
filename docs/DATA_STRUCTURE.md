# Data Structures & Schema Reference

This document is the **definitive source** for the application's data model. It explains how data is structured in the Local Database (Dexie/IndexedDB) and the Remote Database (Supabase), and how they map to each other.

## Core Concepts

### 1. The "Mirror" Model
The Local Database is designed to be an exact mirror of the Remote Database, with a few necessary adaptations for the IndexedDB environment.
*   **UUIDs**: We generate UUIDs on the client-side (`uuidv4()`) for all new entities. This allows us to create valid records while offline.
*   **Soft Deletes**: We never actually delete records from the DB. We set a `deleted_at` timestamp. This allows deletions to propagate during sync.

### 2. Synchronization Fields
Every major table includes these internal fields to manage sync state:

| Field | Type (Local) | Type (Remote) | Purpose |
| :--- | :--- | :--- | :--- |
| `pendingSync` | `number` (0/1) | *N/A* | **Local Only**. `1` means this record has local changes not yet pushed to the server. `0` means it's synced. |
| `sync_token` | `number` | `number` (BigInt) | **Version Control**. Server-assigned counter. Used to download only *new* changes (Deltas) since the last sync. |
| `updated_at` | `string` (ISO) | `string` (ISO) | Timestamp of last modification. Used for "Last-Write-Wins" conflict resolution. |
| `deleted_at` | `string` (ISO) | `string` (ISO) | If present, the record is considered deleted. |

> **Why `number` for Boolean?**
> IndexedDB indexes work better with numbers. We use `1` for true and `0` for false for fields like `pendingSync` and `active`.

---

## Schema Reference

### 1. Transactions (`transactions`)
The core entity representing a financial event.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | UUID (Primary Key). |
| `user_id` | `string` | Owner of the transaction. |
| `group_id` | `string?` | **Nullable**. If present, this is a shared expense. |
| `paid_by_member_id` | `string?` | **Nullable**. Points to `group_members.id` who actually paid. |
| `category_id` | `string` | Foreign Key to `categories`. |
| `context_id` | `string?` | **Nullable**. Foreign Key to `contexts`. |
| `type` | `string` | `'income' \| 'expense' \| 'investment'`. |
| `amount` | `number` | The absolute value of the transaction. |
| `date` | `string` | `YYYY-MM-DD`. |
| `year_month` | `string` | **Local Only**. `YYYY-MM`. Computed index for fast monthly queries. |
| `description` | `string` | User description. |

### 2. Categories (`categories`)
Hierarchical categorization of transactions.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | UUID. |
| `name` | `string` | Display name. |
| `parent_id` | `string?` | **Nullable**. If present, points to parent category. |
| `icon` | `string` | Name of the Lucide-React icon (e.g., `"Home"`, `"Car"`). |
| `color` | `string` | Hex color code. |
| `type` | `string` | Scope of category (`income`/`expense` etc). |
| `active` | `number` | `1` = Active, `0` = Hidden/Archived. |

### 3. Recurring Transactions (`recurring_transactions`)
Templates used to auto-generate actual transactions.

| Field | Type | Description |
| :--- | :--- | :--- |
| `frequency` | `string` | `'daily' \| 'weekly' \| 'monthly' \| 'yearly'`. |
| `start_date` | `string` | Date of first occurrence. |
| `last_generated` | `string?` | Date when the system last created a transaction from this template. |
| `active` | `number` | `1` = Active, `0` = Paused. |

### 4. Groups (`groups`) & Members (`group_members`)
Collaborative budgeting features.

**Groups**:
*   `created_by`: User ID of the admin.
*   `name`: Display name.

**Group Members**:
*   `group_id`: Link to Group.
*   `user_id`: Link to User (Points to `profiles.id` or `auth.users.id`).
*   `is_guest`: `boolean`/`number`.
*   `guest_name`: Name for users not in the system.
*   `share`: `number` (0-100). Split percentage.

### 5. Profiles (`profiles`)
Caches user identity information for display purposes.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | UUID (Primary Key, matches Auth User ID). |
| `full_name` | `string?` | Display name. |
| `avatar_url` | `string?` | Link to profile picture. |
| `email` | `string?` | User email (often used as fallback). |

### 6. User Settings (`user_settings`)
One-to-one mapping with `users`. Contains preferences.

| Field | Type | Description |
| :--- | :--- | :--- |
| `currency` | `string` | e.g., "EUR", "USD". |
| `theme` | `string` | `"light" \| "dark" \| "system"`. |
| `accentColor` | `string` | Hex code for UI theming. |
| `last_sync_token` | `number` | **Crucial**. The watermark of the last successful Pull. |

---

## Type Mappings (Local vs Remote)

When moving data between `db.ts` (Dexie) and `supabase.ts` (API), certain transformations happen in `src/lib/sync.ts`.

| Feature | Local (Dexie) | Remote (Supabase) | Why? |
| :--- | :--- | :--- | :--- |
| **Booleans** | `number` (0/1) | `boolean` | IndexedDB querying is more robust with numbers. |
| **Dates** | `string` (ISO) | `string` (ISO/Timestamptz) | Uniform string handling prevents Timezone bugs. |
| **Computed** | `year_month` | *Does not exist* | Optimization for "Show transactions for Oct 2024". |

## Indexes
See `src/lib/db.ts` constructor for the exact index configuration.
*   **Transactions**: `[id, user_id, category_id, context_id, type, date, year_month, pendingSync, deleted_at]`
*   **Groups**: `[id, created_by, pendingSync]`
*   **Profiles**: `[id, email]`

*Note: Any field you want to filter/sort by efficiently in a `useLiveQuery` MUST be in this index list.*
