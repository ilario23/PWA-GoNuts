/**
 * Centralized constants for the application.
 * Avoids magic numbers/strings scattered throughout the codebase.
 */

// =============================================================================
// TIMING CONSTANTS (in milliseconds)
// =============================================================================

export const TIMING = {
  /** Delay before auto-generate runs after app load */
  AUTO_GENERATE_DELAY: 1000,

  /** Sync interval (5 minutes) */
  SYNC_INTERVAL: 5 * 60 * 1000,

  /** PWA update check interval (1 hour) */
  PWA_UPDATE_CHECK_INTERVAL: 60 * 60 * 1000,

  /** Realtime reconnection delay */
  REALTIME_RECONNECT_DELAY: 1000,

  /** UI feedback timeout for copy buttons */
  COPY_FEEDBACK_TIMEOUT: 2000,

  /** Toast durations */
  TOAST_DURATION: {
    SHORT: 3000,
    DEFAULT: 4000,
    LONG: 6000,
  },

  /** Debounce delays */
  DEBOUNCE: {
    SEARCH: 300,
    INPUT: 500,
  },
} as const;

// =============================================================================
// SYNC CONFIGURATION
// =============================================================================

export const SYNC_CONFIG = {
  /** Base delay for exponential backoff */
  BASE_RETRY_DELAY: 1000,

  /** Maximum delay between retries */
  MAX_RETRY_DELAY: 30000,

  /** Maximum retry attempts before giving up */
  MAX_RETRY_ATTEMPTS: 5,

  /** Number of items to process per batch */
  BATCH_SIZE: 50,

  /** Number of failures before quarantining an item */
  QUARANTINE_THRESHOLD: 5,
} as const;

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

export const TRANSACTION_TYPES = ["income", "expense", "investment"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

// =============================================================================
// FREQUENCY TYPES
// =============================================================================

export const FREQUENCY_TYPES = [
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;
export type FrequencyType = (typeof FREQUENCY_TYPES)[number];

// =============================================================================
// BUDGET PERIODS
// =============================================================================

export const BUDGET_PERIODS = ["monthly", "yearly"] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

// =============================================================================
// UI DEFAULTS
// =============================================================================

export const UI_DEFAULTS = {
  /** Default color for new categories */
  CATEGORY_COLOR: "#6366f1",

  /** Default icon for new categories */
  CATEGORY_ICON: "CircleDollarSign",

  /** Default accent color */
  ACCENT_COLOR: "slate",

  /** Default theme */
  THEME: "system",

  /** Default language */
  LANGUAGE: "en",

  /** Default start of week */
  START_OF_WEEK: "monday",

  /** Default view */
  DEFAULT_VIEW: "month",

  /** Pagination */
  PAGE_SIZE: 20,

  /** Max items before suggesting virtualization */
  VIRTUALIZATION_THRESHOLD: 100,
} as const;

// =============================================================================
// VALIDATION LIMITS
// =============================================================================

export const VALIDATION = {
  /** Maximum length for names */
  MAX_NAME_LENGTH: 100,

  /** Maximum length for descriptions */
  MAX_DESCRIPTION_LENGTH: 500,

  /** Minimum transaction amount */
  MIN_AMOUNT: 0,

  /** Maximum transaction amount (10 million) */
  MAX_AMOUNT: 10_000_000,

  /** Minimum budget amount */
  MIN_BUDGET: 0,

  /** Maximum budget amount (100 million) */
  MAX_BUDGET: 100_000_000,

  /** Share percentage range */
  MIN_SHARE: 0,
  MAX_SHARE: 100,
} as const;

// =============================================================================
// REALTIME CONFIG
// =============================================================================

export const REALTIME_CONFIG = {
  /** Tables to subscribe to for realtime updates */
  TABLES: [
    "groups",
    "group_members",
    "transactions",
    "categories",
    "contexts",
    "recurring_transactions",
    "category_budgets",
  ] as const,

  /** Initial retry delay for connection failures */
  INITIAL_RETRY_DELAY: 1000,

  /** Maximum retry attempts */
  MAX_RETRY_ATTEMPTS: 5,
} as const;

// =============================================================================
// DATE FORMATS
// =============================================================================

export const DATE_FORMATS = {
  /** ISO date format (YYYY-MM-DD) */
  ISO_DATE: "yyyy-MM-dd",

  /** Year-month format */
  YEAR_MONTH: "yyyy-MM",

  /** Display date format */
  DISPLAY_DATE: "MMM d, yyyy",

  /** Display date with weekday */
  DISPLAY_DATE_FULL: "EEEE, MMM d, yyyy",

  /** Display month and year */
  DISPLAY_MONTH_YEAR: "MMMM yyyy",
} as const;

// =============================================================================
// STORAGE KEYS
// =============================================================================

export const STORAGE_KEYS = {
  /** IndexedDB database name */
  DB_NAME: "ExpenseTrackerDB",

  /** Theme preference */
  THEME: "theme",

  /** Language preference */
  LANGUAGE: "language",
} as const;

// =============================================================================
// CALCULATION CONSTANTS
// =============================================================================

export const CALCULATIONS = {
  /** Milliseconds in a day */
  MS_PER_DAY: 1000 * 60 * 60 * 24,

  /** Milliseconds in a minute */
  MS_PER_MINUTE: 60 * 1000,

  /** Percentage decimal precision */
  PERCENTAGE_PRECISION: 2,

  /** Currency decimal precision */
  CURRENCY_PRECISION: 2,
} as const;
