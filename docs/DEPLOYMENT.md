# Deployment Guide

This guide covers how to deploy the Personal Expense Tracker PWA to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Supabase Configuration](#supabase-configuration)
- [Build Process](#build-process)
- [Deployment Platforms](#deployment-platforms)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- **Node.js 18+** installed
- **npm** or **pnpm** package manager
- A **Supabase account** (free tier available)
- A **deployment platform account** (Vercel, Netlify, etc.)
- **Git** for version control

## Environment Setup

### 1. Environment Variables

Create a `.env` file in the project root with the following variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> [!IMPORTANT]
> Never commit the `.env` file to version control. It's already in `.gitignore`.

### 2. Getting Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** (for `VITE_SUPABASE_URL`)
4. Copy the **anon/public** key (for `VITE_SUPABASE_ANON_KEY`)

## Supabase Configuration

### 1. Database Schema Setup

Run the SQL schema to create all necessary tables and policies:

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of [supabase_schema.sql](file:///Users/ilariopc/Code/react/pwa-antigravity/supabase_schema.sql)
4. Paste into the SQL editor and click **Run**

This will create:

- `categories` table
- `contexts` table
- `transactions` table
- `recurring_transactions` table
- `user_settings` table
- Row Level Security (RLS) policies
- Sync token triggers

### 2. Authentication Setup

Configure authentication providers in Supabase:

1. Navigate to **Authentication** → **Providers**
2. Enable **Email** provider (enabled by default)
3. (Optional) Enable additional providers:
   - Google OAuth
   - GitHub OAuth
   - Others as needed

#### Email Configuration

For production, configure a custom SMTP server:

1. Go to **Authentication** → **Email Templates**
2. Configure SMTP settings in **Settings** → **Auth** → **SMTP Settings**
3. Customize email templates for:
   - Confirmation emails
   - Password reset
   - Magic links

### 3. Row Level Security (RLS)

The schema includes RLS policies that ensure users can only access their own data. Verify policies are enabled:

```sql
-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`.

### 4. Database Indexes

The schema includes necessary indexes. For large datasets, consider adding:

```sql
-- Additional performance indexes (optional)
CREATE INDEX idx_transactions_user_date
ON transactions(user_id, date DESC);

CREATE INDEX idx_categories_user_type
ON categories(user_id, type)
WHERE deleted_at IS NULL;
```

## Build Process

### 1. Install Dependencies

```bash
npm install
```

### 2. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### 3. Preview Build Locally

Test the production build locally:

```bash
npm run preview
```

Navigate to the URL shown (usually `http://localhost:4173`).

### 4. Build Output

The build process generates:

- Optimized JavaScript bundles (code splitting)
- Minified CSS
- PWA manifest and service worker
- Static assets (icons, images)

## Deployment Platforms

### Vercel (Recommended)

Vercel provides excellent support for Vite applications and automatic deployments.

#### Deploy via Vercel CLI

1. **Install Vercel CLI**

   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**

   ```bash
   vercel login
   ```

3. **Deploy**

   ```bash
   vercel
   ```

4. **Set Environment Variables**

   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

#### Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **New Project**
3. Import your Git repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables in **Settings** → **Environment Variables**
6. Click **Deploy**

#### Automatic Deployments

Connect your Git repository for automatic deployments:

- **Production**: Deploys on push to `main` branch
- **Preview**: Deploys on pull requests

---

### Netlify

#### Deploy via Netlify CLI

1. **Install Netlify CLI**

   ```bash
   npm install -g netlify-cli
   ```

2. **Login**

   ```bash
   netlify login
   ```

3. **Initialize**

   ```bash
   netlify init
   ```

4. **Deploy**
   ```bash
   netlify deploy --prod
   ```

#### Deploy via Netlify Dashboard

1. Go to [netlify.com](https://netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Connect your Git repository
4. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Add environment variables in **Site settings** → **Environment variables**
6. Click **Deploy site**

#### netlify.toml Configuration

Create a `netlify.toml` file for advanced configuration:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Content-Type = "application/manifest+json"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"
```

---

### Self-Hosted (Docker)

#### Dockerfile

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /manifest.webmanifest {
        add_header Content-Type application/manifest+json;
    }

    location /sw.js {
        add_header Cache-Control "no-cache";
    }
}
```

#### Build and Run

```bash
# Build image
docker build -t expense-tracker .

# Run container
docker run -p 80:80 expense-tracker
```

---

### Static Hosting (GitHub Pages, etc.)

For static hosting, ensure proper routing:

1. Build the project: `npm run build`
2. The `dist/` folder contains all static files
3. Configure your hosting to serve `index.html` for all routes

> [!WARNING]
> GitHub Pages doesn't support client-side routing by default. Consider using hash routing or a 404.html redirect workaround.

## Post-Deployment

### 1. Verify PWA Installation

1. Open your deployed app in Chrome
2. Check for the install prompt
3. Install the PWA
4. Verify it works offline

### 2. Test Offline Functionality

1. Open DevTools → **Application** → **Service Workers**
2. Check "Offline" mode
3. Verify the app still works
4. Test CRUD operations
5. Go back online and verify sync

### 3. Test Authentication

1. Sign up with a new account
2. Verify email confirmation (if enabled)
3. Sign in and out
4. Test password reset

### 4. Performance Testing

Use Lighthouse to audit your deployment:

1. Open DevTools → **Lighthouse**
2. Run audit for:
   - Performance
   - Accessibility
   - Best Practices
   - SEO
   - PWA

Target scores:

- **Performance**: 90+
- **Accessibility**: 90+
- **Best Practices**: 90+
- **PWA**: 100

### 5. Mobile Testing

Test on actual mobile devices:

- iOS Safari
- Android Chrome
- Install as PWA on both platforms

### 6. Security Headers

Verify security headers are set (especially for self-hosted):

```
Content-Security-Policy
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

## Troubleshooting

### Build Fails

**Issue**: Build fails with TypeScript errors

**Solution**:

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

### Environment Variables Not Working

**Issue**: App can't connect to Supabase

**Solution**:

1. Verify environment variables are set in deployment platform
2. Ensure variables are prefixed with `VITE_`
3. Redeploy after adding variables
4. Check browser console for errors

---

### Service Worker Not Updating

**Issue**: Changes don't appear after deployment

**Solution**:

1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear service worker in DevTools → Application → Service Workers
3. The app uses `registerType: 'prompt'` - users will see an update notification
4. Click "Reload" in the update toast to apply changes

---

### PWA Not Installable

**Issue**: Install prompt doesn't appear

**Solution**:

1. Verify HTTPS is enabled (required for PWA)
2. Check manifest.json is served correctly
3. Verify service worker is registered
4. Check Lighthouse PWA audit for issues

---

### Database Connection Errors

**Issue**: "Failed to fetch" or connection errors

**Solution**:

1. Verify Supabase URL and anon key are correct
2. Check Supabase project is not paused (free tier)
3. Verify RLS policies allow access
4. Check browser console for CORS errors

---

### Sync Not Working

**Issue**: Changes don't sync to Supabase

**Solution**:

1. Check network tab for failed requests
2. Verify user is authenticated
3. Check RLS policies allow inserts/updates
4. Verify sync_token triggers are created

---

## Production Checklist

Before going live, verify:

- [ ] Environment variables configured
- [ ] Supabase database schema created
- [ ] RLS policies enabled and tested
- [ ] Authentication configured
- [ ] Email templates customized (if using email auth)
- [ ] HTTPS enabled
- [ ] Custom domain configured (optional)
- [ ] PWA manifest customized (name, icons, colors)
- [ ] Service worker registered and working
- [ ] Offline functionality tested
- [ ] Mobile devices tested (iOS and Android)
- [ ] Lighthouse audit passed (90+ scores)
- [ ] Error tracking configured (optional: Sentry, etc.)
- [ ] Analytics configured (optional: Google Analytics, etc.)
- [ ] Backup strategy for Supabase data

---

## Monitoring and Maintenance

### Supabase Dashboard

Monitor your database:

- **Database** → **Tables**: View data
- **Database** → **Logs**: Check query logs
- **Auth** → **Users**: Manage users
- **Storage**: Monitor usage (free tier limits)

### Application Monitoring

Consider adding:

- **Error tracking**: Sentry, Rollbar
- **Analytics**: Google Analytics, Plausible
- **Performance monitoring**: Vercel Analytics, Cloudflare Web Analytics

### Regular Maintenance

- Monitor Supabase storage usage
- Review and optimize database indexes
- Update dependencies regularly
- Review and update RLS policies as needed
- Backup database periodically

---

## Scaling Considerations

For high-traffic applications:

1. **Supabase**: Upgrade to Pro plan for better performance
2. **CDN**: Use Cloudflare or similar for static assets
3. **Database**: Add read replicas (Supabase Pro)
4. **Caching**: Implement Redis for frequently accessed data
5. **Rate Limiting**: Add rate limiting to prevent abuse

---

For more information, see the [Architecture Guide](ARCHITECTURE.md) and [Contributing Guide](CONTRIBUTING.md).
