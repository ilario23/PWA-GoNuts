# AGENTS.md

Offline-first personal expense PWA (React 19 + Vite + TypeScript). Local data lives in Dexie/IndexedDB; Supabase is sync/backup only.

## Commands

Use **pnpm** (`packageManager: pnpm@11.6.0`, Node `>=22.13`). Not npm/yarn.

| Task | Command |
| --- | --- |
| Install | `pnpm install` |
| Dev server | `pnpm dev` (Vite, http://localhost:5173) |
| Lint | `pnpm lint` |
| Unit tests | `pnpm test` |
| One test file | `pnpm test -- src/lib/__tests__/sync.test.ts` |
| One test name | `pnpm test -- -t "test name"` |
| Coverage (70% global thresholds) | `pnpm test:coverage` |
| Typecheck | `pnpm exec tsc -b` (no dedicated script) |
| Production build | `pnpm build` (= `tsc -b && vite build`) |
| E2E | `pnpm test:e2e` (Playwright; auto-starts dev server) |

CI (`.github/workflows/ci.yml`) order is **lint → test → build**. `build` is the typecheck gate. E2E is a separate opt-in job (`vars.RUN_E2E == 'true'`).

## Architecture rules (easy to get wrong)

- **UI never talks to Supabase for feature data** (transactions, categories, groups, …). Reads/writes go through Dexie via `useLiveQuery` / `src/hooks/*`. Sync is handled by `SyncManager` in `src/lib/sync.ts`.
- Writes mark rows `pendingSync: 1`; sync pushes them and clears the flag. Do not add `supabase.from(...)` calls in components/hooks for feature data.
- Path alias: `@/*` → `src/*`.
- Adding a **synced** field/table requires touching several places: `src/lib/db.ts` (schema), `TABLES` + `LocalTableMap` + `prepareItemForPush`/`prepareItemForLocal` in `src/lib/sync.ts`, then Supabase column/table. Local-only tables (`import_rules`, `sync_errors`, `sync_conflicts`) must **not** be added to `TABLES`.
- `supabase_schema.sql` and `supabase/migrations/` are DB truth — ask before changing them.
- Deeper architecture write-up: `docs/AI_CONTEXT.md` (treat code as truth if docs lag; some docs still say React 18).

## UI / i18n

- Prefer shadcn/Radix components in `src/components/ui` over one-off markup.
- User-facing strings go through `t()`; `eslint-plugin-i18next/no-literal-string` is on for markup. Add keys to **both** `src/locales/en/translation.json` and `src/locales/it/translation.json` (locales lazy-load).
- TS is strict (`noUnusedLocals`, `noUnusedParameters`). No Prettier config — ESLint only.

## Testing quirks

- Jest + `ts-jest` + jsdom; tests live in `__tests__/` or `*.test.ts(x)` under `src/`. Prefer testing `src/lib` and `src/hooks` over UI.
- `src/setupTests.ts` already mocks Supabase, `matchMedia`, polyfills `structuredClone`, and loads `fake-indexeddb`. `uuid` and `?worker` imports are mocked via `moduleNameMapper`.
- Playwright specs are in `e2e/`; config loads **`.env.local`** (not `.env`). Needs `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Env for the app: copy `.env.example` → `.env` with those same two `VITE_*` vars. Build works without secrets (client falls back to empty).

## Gotchas

- `pnpm build` strips `console`/`debugger` from the bundle — don't rely on prod logs.
- PWA/Workbox config lives in `vite.config.ts`; Supabase hosts are `NetworkOnly` (offline data is Dexie, never Cache Storage).
- Local agent rule folders (`.agent/`, `.claude/`, `.cursor/`, …) are gitignored; `docs/` is the shared doc surface.
