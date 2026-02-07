# Development & Release Strategy

## 1. Environment Management

We use **Supabase** for the backend (Auth + DB).

### A. Local Development (Recommended)
Developing against a local Supabase instance is faster and safer than using a remote "dev" project.

**Setup:**
1.  Install Supabase CLI: `brew install supabase/tap/supabase` (or compatible).
2.  Start local backend: `supabase start`
    *   This spins up local Postgres, Auth, and Storage.
    *   Outputs `API URL` and `anon key`.
3.  Configure `.env.local`:
    ```bash
    VITE_SUPABASE_URL=http://127.0.0.1:54321
    VITE_SUPABASE_ANON_KEY=<your-local-anon-key>
    ```

### B. Database Migrations
**NEVER** modify the production database directly.
1.  **Change**: Edit schema locally (can use Supabase Studio at `http://localhost:54323`).
2.  **Diff**: Generate a migration file:
    ```bash
    supabase db diff -f name_of_change
    # Creates supabase/migrations/<timestamp>_name_of_change.sql
    ```
3.  **Apply**: `supabase db reset` (locally) to verify.
4.  **Push**: `supabase db push` (to production) via CI/CD or manual CLI.

## 2. Testing Strategy

### A. Unit Tests (Vitest)
Used for pure logic (`src/lib/*.ts`) and utility functions.
*   **Run**: `npm test`
*   **Scope**: Currency formatting, Date calculations, Recurring transaction logic.

### B. End-to-End (E2E) Tests (Playwright)
Crucial for this **Offline-First** app. We need to verify that data persists to IndexedDB and syncs correctly.
*   **Run**: `npx playwright test`
*   **Scope**: Critical User Journeys (Login, Add Transaction, Offline Persistence).

## 3. Release Process (CI/CD)

We use GitHub Actions to automate quality checks.

**On Pull Request:**
1.  **Lint**: `npm run lint` (ESLint).
2.  **Type Check**: `npm run typecheck` (tsc).
3.  **Test**: `npm test` (Unit/Integration).

**On Merge to Main:**
1.  **Build**: Verifies production build succeeds.
2.  **Deploy**: Vercel automatically deploys the new version.

## 4. Seeds & Data
*   `supabase/seed.sql`: Contains initial data (default categories, test users) for the **Local** Supabase instance.
*   Running `supabase db reset` automatically applies this seed.
