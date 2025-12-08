# Deployment Guide

This guide covers how to deploy the Antigravity PWA to production.

## Prerequisites
*   Supabase Project (for Backend)
*   Vercel/Netlify Account (for Frontend)

## Environment Variables

| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your project URL (Found in Supabase -> Settings -> API) |
| `VITE_SUPABASE_ANON_KEY` | Your public API key |

## Building for Production

```bash
# 1. Clean install
npm ci

# 2. Type check & Build
npm run build

# 3. Preview locally
npm run preview
```

## Deployment Strategy (Vercel)

We recommend Vercel for the best Developer Experience with Vite.

1.  **Import Project**: Connect your GitHub repo to Vercel.
2.  **Settings**:
    *   Framework Preset: `Vite`
    *   Root Directory: `./`
3.  **Environment Variables**: Paste the values from above.
4.  **Deploy**: Click "Deploy".

## Database Setup (Supabase)

You must run the provided SQL definitions to set up tables and policies.

1.  Go to Supabase -> SQL Editor.
2.  Run the contents of `supabase_schema.sql` (located in project root).
    *   This sets up the tables (`transactions`, `groups`, etc.).
    *   This sets up **RLS Policies** (security).
    *   This sets up **Triggers** for `sync_token`.

## Verification Checklist

- [ ] **Auth**: Can you sign in? (Check "Supabase -> Authentication -> Providers").
- [ ] **RLS**: Can you see *only* your own data?
- [ ] **PWA**: Does the "Install App" prompt appear?
- [ ] **Offline**: Does the app load if you disconnect network?
