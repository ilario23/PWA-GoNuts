# Deployment Guide

This guide covers how to deploy the GoNuts PWA to production.

## Prerequisites
*   Supabase Project (for Backend Database & Auth)
*   Vercel Account (recommended for Frontend)

## Environment Variables

These variables must be set in your CI/CD provider (Vercel) and locally in `.env`.

| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your project URL (Found in Supabase -> Settings -> API) |
| `VITE_SUPABASE_ANON_KEY` | Your public 'anon' API key |

## Building for Production

```bash
# 1. Clean install dependencies
npm ci

# 2. Type check & Build
npm run build

# 3. Preview locally (simulates production build)
npm run preview
```

## Deployment Strategy (Vercel)

We recommend Vercel for the best Developer Experience with Vite apps.

1.  **Import Project**: Connect your GitHub repo to Vercel.
2.  **Settings**:
    *   Framework Preset: `Vite`
    *   Root Directory: `./` (default)
    *   Build Command: `npm run build`
    *   Output Directory: `dist`
3.  **Environment Variables**: Paste the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4.  **Deploy**: Click "Deploy".

## Database Setup (Supabase)

The database schema is managed via Supabase Migrations, but for a fresh production setup:

1.  **Auth**: Enable Email/Password provider in Supabase Authentication settings.
2.  **Tables**: The app expects tables (`transactions`, `groups`, `categories`, etc.) to exist.
    *   *Development*: Use `supabase start` to run local migrations.
    *   *Production*: Use `supabase db push` to push your local migration files to the remote Supabase project.

```bash
# Link your local environment to the remote project
supabase link --project-ref <your-project-id>

# Push local schema/migrations to the remote database
supabase db push
```

## Verification Checklist

- [ ] **Auth**: Can you sign in? (Check "Supabase -> Authentication -> Users").
- [ ] **RLS**: configured via migrations (users see only their data).
- [ ] **PWA**: Does the "Install App" prompt appear on mobile?
- [ ] **Offline**: Does the app load if you disconnect network (Service Worker active)?
