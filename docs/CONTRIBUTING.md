# Contributing Guide

Thank you for your interest in contributing to the Personal Expense Tracker PWA! This guide will help you get started with development and understand our contribution process.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)

## Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect differing viewpoints and experiences

### Unacceptable Behavior

- Harassment or discriminatory language
- Trolling or insulting comments
- Publishing others' private information
- Other unprofessional conduct

## Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **Git** for version control
- A **Supabase account** for backend testing
- A code editor (VS Code recommended)

### Initial Setup

1. **Fork the repository**

   Click the "Fork" button on GitHub to create your own copy.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/pwa-antigravity.git
   cd pwa-antigravity
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/pwa-antigravity.git
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Set up environment variables**

   Create a `.env` file:

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

6. **Set up Supabase database**

   Run the SQL in [supabase_schema.sql](file:///Users/ilariopc/Code/react/pwa-antigravity/supabase_schema.sql) in your Supabase project.

7. **Start development server**
   ```bash
   npm run dev
   ```

### VS Code Setup (Recommended)

Install recommended extensions:

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Tailwind CSS IntelliSense** - Tailwind autocomplete
- **TypeScript Vue Plugin (Volar)** - Better TypeScript support

## Development Workflow

### Branch Naming

Use descriptive branch names:

- `feature/add-budget-tracking`
- `fix/sync-error-handling`
- `docs/update-readme`
- `refactor/optimize-statistics`

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:

```
feat(transactions): add bulk delete functionality

fix(sync): handle network errors gracefully

docs(readme): update installation instructions

refactor(hooks): simplify useStatistics calculations
```

### Keeping Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream main into your local main
git checkout main
git merge upstream/main

# Push updates to your fork
git push origin main
```

## Code Style

### TypeScript

- **Use TypeScript** for all new files
- **Define interfaces** for all data structures
- **Avoid `any`** - use proper types
- **Use const** for variables that don't change

**Good**:

```typescript
interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense" | "investment";
}

const addTransaction = async (transaction: Transaction): Promise<void> => {
  // ...
};
```

**Bad**:

```typescript
const addTransaction = async (transaction: any) => {
  // ...
};
```

### React Components

- **Use functional components** with hooks
- **Use TypeScript** for props
- **Destructure props** in function parameters
- **Use early returns** for conditional rendering

**Good**:

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled = false }: ButtonProps) {
  if (disabled) return null;

  return <button onClick={onClick}>{label}</button>;
}
```

### Naming Conventions

- **Components**: PascalCase (`TransactionList.tsx`)
- **Hooks**: camelCase with `use` prefix (`useTransactions.ts`)
- **Utilities**: camelCase (`formatCurrency.ts`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TRANSACTIONS`)
- **Interfaces**: PascalCase (`Transaction`, `Category`)

### File Organization

- **One component per file**
- **Co-locate related files** (component + styles + tests)
- **Use index files** for clean imports
- **Keep files under 300 lines** (split if larger)

### Tailwind CSS

- **Use Tailwind classes** instead of custom CSS
- **Use shadcn/ui components** when available
- **Follow responsive design** (mobile-first)
- **Use CSS variables** for theme colors

**Good**:

```tsx
<div className="flex flex-col gap-4 md:flex-row md:gap-6">
  <Card className="flex-1">{/* ... */}</Card>
</div>
```

### ESLint

Run ESLint before committing:

```bash
npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint -- --fix
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   └── *.tsx           # Custom components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   ├── db.ts           # Dexie database
│   ├── sync.ts         # Sync manager
│   └── utils.ts        # Utilities
├── locales/            # i18n translations
│   ├── en/
│   └── it/
├── pages/              # Page components
└── App.tsx             # Main app component
```

### Adding New Files

- **Components**: `src/components/MyComponent.tsx`
- **Hooks**: `src/hooks/useMyHook.ts`
- **Pages**: `src/pages/MyPage.tsx`
- **Utilities**: `src/lib/myUtil.ts`

### Key Hooks to Know

When contributing, familiarize yourself with these core hooks:

- `useAuth` - Authentication state
- `useTransactions` - Transaction CRUD
- `useCategories` - Category management with hierarchy
- `useCategoryBudgets` - Per-category budget tracking
- `useSettings` - User preferences
- `useSync` - Manual sync trigger
- `useRealtimeSync` - WebSocket subscriptions
- `usePWAUpdate` - PWA update detection

## Common Tasks

### Adding a New Page

1. **Create page component** in `src/pages/MyPage.tsx`:

   ```typescript
   export function MyPage() {
     return <div>My Page</div>;
   }
   ```

2. **Add route** in `src/App.tsx`:

   ```typescript
   <Route path="/my-page" element={<MyPage />} />
   ```

3. **Add navigation link** in `MobileNav.tsx` and `DesktopNav.tsx`

4. **Add translations** in locale files

### Adding a New Language

1. **Create translation file** in `src/locales/[lang]/translation.json`:

   ```json
   {
     "dashboard": {
       "title": "Dashboard"
     }
   }
   ```

2. **Import in i18n.ts**:

   ```typescript
   import frTranslation from "./locales/fr/translation.json";

   i18n.init({
     resources: {
       en: { translation: enTranslation },
       it: { translation: itTranslation },
       fr: { translation: frTranslation },
     },
   });
   ```

3. **Add language option** in Settings page

### Adding a New Icon

1. **Import from Lucide** in `src/lib/icons.ts`:

   ```typescript
   import { MyIcon } from "lucide-react";
   ```

2. **Add to AVAILABLE_ICONS**:
   ```typescript
   export const AVAILABLE_ICONS: IconItem[] = [
     // ...
     { name: "MyIcon", icon: MyIcon },
   ];
   ```

### Adding a New Theme Color

1. **Define colors** in `src/lib/theme-colors.ts`:

   ```typescript
   export const THEME_COLORS: Record<string, ThemeColors> = {
     // ...
     purple: {
       name: "purple",
       label: "Purple",
       light: {
         primary: "270 80% 50%",
         primaryForeground: "0 0% 100%",
         ring: "270 80% 50%",
       },
       dark: {
         primary: "270 70% 60%",
         primaryForeground: "0 0% 100%",
         ring: "270 70% 60%",
       },
     },
   };
   ```

2. **Add to Settings** color selector

### Adding a Database Field

1. **Update interface** in `src/lib/db.ts`:

   ```typescript
   export interface Transaction {
     // ...
     newField: string;
   }
   ```

2. **Update Dexie schema** (if indexed):

   ```typescript
   this.version(2).stores({
     transactions: "id, user_id, ..., newField",
   });
   ```

3. **Update Supabase schema**:

   ```sql
   ALTER TABLE transactions ADD COLUMN new_field TEXT;
   ```

4. **Update hooks** to handle new field

5. **Update UI** to display/edit new field

### Adding a shadcn/ui Component

```bash
npx shadcn@latest add [component-name]
```

Example:

```bash
npx shadcn@latest add dropdown-menu
```

This adds the component to `src/components/ui/`.

## Testing

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] **Offline functionality**: Disable network and verify app works
- [ ] **Sync**: Make changes offline, go online, verify sync
- [ ] **Mobile responsive**: Test on mobile viewport
- [ ] **Dark mode**: Verify UI works in dark mode
- [ ] **Different browsers**: Test in Chrome, Firefox, Safari
- [ ] **PWA install**: Verify app can be installed
- [ ] **Authentication**: Sign in/out works correctly

### Testing Database Changes

1. **Test migrations**: Ensure schema changes don't break existing data
2. **Test RLS policies**: Verify users can only access their data
3. **Test sync**: Ensure new fields sync correctly

### Testing UI Changes

1. **Test responsiveness**: Mobile, tablet, desktop
2. **Test themes**: Light and dark mode
3. **Test accessibility**: Keyboard navigation, screen readers
4. **Test different languages**: Switch between available languages

## Submitting Changes

### Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**

   - Write clean, documented code
   - Follow code style guidelines
   - Add translations if needed

3. **Test thoroughly**

   - Run `npm run lint`
   - Test manually (see checklist above)

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add my feature"
   ```

5. **Push to your fork**

   ```bash
   git push origin feature/my-feature
   ```

6. **Create Pull Request**
   - Go to GitHub and create a PR
   - Fill out the PR template
   - Link related issues

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tested offline functionality
- [ ] Tested sync
- [ ] Tested on mobile
- [ ] Tested dark mode
- [ ] Ran ESLint

## Screenshots (if applicable)

Add screenshots for UI changes

## Related Issues

Closes #123
```

### Review Process

1. **Automated checks** must pass (ESLint, build)
2. **Code review** by maintainer(s)
3. **Requested changes** should be addressed
4. **Approval** required before merge

### After Merge

1. **Delete your branch** (optional)

   ```bash
   git branch -d feature/my-feature
   git push origin --delete feature/my-feature
   ```

2. **Update your fork**
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

## Questions?

- **Documentation**: Check [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md), [API_REFERENCE.md](API_REFERENCE.md)
- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions

---

Thank you for contributing! 🎉
