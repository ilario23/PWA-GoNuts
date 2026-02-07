# Testing Strategy

## Overview
We use **Vitest** (compatible with Jest API) for unit tests and **Playwright** (recommended) for E2E.

## Testing Philosophy
Since our logic is strictly separated:
1.  **UI Components**: Dumb. Render props.
2.  **Hooks (`src/hooks`)**: Smart. Connect to DB.
3.  **Lib (`src/lib`)**: Pure logic (Sync, DB, Utils).

**We prioritize testing (2) and (3).**

## 1. Unit & Integration Tests (`src/lib`, `src/hooks`)
Run with: `npm test`

These tests run in a Node.js-like environment (JSDOM).
*   **Mocks Needed**: `dexie` (indexedDB), `supabase-js`.
*   **Goal**: Verify that `addTransaction` writes to DB with `pendingSync: 1`.

## 2. Component Tests
Run with: `npm test`

*   **Tools**: `@testing-library/react`.
*   **Goal**: Verify that clicking "Save" calls the `onSave` prop. (Don't test the saving logic itself here).

## 3. End-to-End (E2E) Tests
Run with: `npx playwright test` (if configured)

*   **Goal**: Full User Flows.
    1.  Load App (Offline).
    2.  Add Transaction.
    3.  Verify it appears in Dashboard.
    4.  Reload Page (verify persistence).

## Continuous Integration
Tests are run automatically on GitHub Actions.
