# Testing Strategy

We use **Vitest** (via `scripts: test` -> `jest` in package.json? *clarification: project uses Jest*) for unit and integration testing.

> **Note**: The project is transitioning to modern tooling. Currently using `jest` and `react-testing-library`.

## Testing Philosophy

Since our logic is heavily moved into **Hooks** (`useTransactions`, `useSync`), we prioritize **Hook Testing**.

### 1. Testing Hooks
We use `@testing-library/react-hooks` (or `renderHook` from RTL) to test business logic independent of UI.

**Key Mocks**:
*   `dexie`: Must be mocked to avoid actual IndexedDB calls in Node environment. Use `fake-indexeddb` or manual mocks.
*   `supabase`: Must be mocked to prevent network calls.

**Example Pattern**:
```typescript
jest.mock('../../lib/db'); // Mock the DB

it('adds a transaction', async () => {
  const { result } = renderHook(() => useTransactions());
  
  await act(async () => {
    await result.current.addTransaction({ amount: 100, ... });
  });

  expect(db.transactions.add).toHaveBeenCalledWith(
    expect.objectContaining({ amount: 100, pendingSync: 1 })
  );
});
```

### 2. Testing Utilities
Pure functions in `src/lib/*.ts` (like `processRecurringTransactions` or validation logic) are unit tested.

### 3. Component Tests
We test high-level pages to ensure they render without crashing, but we avoid testing complex logic inside components (logic should be in hooks).

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Continuous Integration
Tests are run on every Pull Request via GitHub Actions. Deployment to production is blocked if tests fail.
