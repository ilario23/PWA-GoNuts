# Personal Expense Tracker PWA

A modern, offline-first Progressive Web App for managing personal finances. Track your income, expenses, and investments with a beautiful, responsive interface that works seamlessly online and offline.

![Version](https://img.shields.io/badge/version-0.6.1-blue.svg)
![React](https://img.shields.io/badge/React-19.2-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)

## ✨ Key Features

### 💰 Financial Management
- **Income/Expense/Investment Tracking** - Complete transaction management
- **Hierarchical Categories** - Multi-level category organization
- **Category Budgets** - Set monthly limits per category
- **Monthly Budget** - Global budget with progress tracking
- **Recurring Transactions** - Auto-generate periodic transactions
- **Context Tagging** - Organize expenses by context (Work, Vacation, etc.)

### 👥 Collaboration
- **Group Expenses** - Share expenses with multiple users
- **Split Tracking** - Track who paid and split amounts
- **User Profiles** - Display names and avatars instead of UUIDs
- **Member Management** - Add/remove group members with validation

### 🔄 Sync & Offline
- **Minimalist Sync Strategy** - Push-only sync, manual refresh
- **Offline-First** - Full functionality without internet
- **Cache-First Auth** - Instant startup with cached credentials
- **Pending Changes Indicator** - Visual feedback for unsynced data
- **Conflict Resolution** - Last-Write-Wins (LWW) with a conflict-review drawer for dropped remote edits

### 📊 Analytics & UI
- **Detailed Statistics** - Monthly and yearly trends
- **Interactive Charts** - Recharts with gradients and animations
- **Collapsible Sidebar** - Modern desktop navigation (shadcn/ui)
- **Responsive Design** - Mobile-first with flip cards and carousels
- **Dark/Light Themes** - Customizable accent colors
- **iOS Safe Area** - Perfect PWA support for iPhone (notch/Dynamic Island)

### 🌍 Other Features
- **Multi-language** - English and Italian (i18next)
- **PWA Installable** - Works offline on mobile and desktop
- **Export/Import** - Transactions as CSV or JSON, plus full JSON backup & restore
- **Account Deletion** - Erase your account and all server data (GDPR data erasure)

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
pnpm dev
```

## 📚 Documentation

Complete documentation is available in the [`docs/`](./docs) folder:

- **[README](./docs/README.md)** - Detailed project overview and features
- **[Architecture Guide](./docs/ARCHITECTURE.md)** - Technical architecture and design
- **[API Reference](./docs/API_REFERENCE.md)** - Hooks, interfaces, and utilities
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - How to deploy to production
- **[Contributing Guide](./docs/CONTRIBUTING.md)** - Guidelines for contributors
- **[User Guide](./docs/USER_GUIDE.md)** - End-user documentation

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS 4, shadcn/ui
- **Data**: Dexie.js (IndexedDB), Supabase (PostgreSQL + Auth + RLS)
- **Charts**: Recharts with custom gradients and animations
- **PWA**: vite-plugin-pwa, Workbox 7
- **i18n**: i18next, react-i18next
- **Animations**: Framer Motion, tw-animate-css
- **Routing**: React Router DOM 7
- **State**: Dexie React Hooks, Custom hooks

## 📜 Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report

## 🧪 Testing

The project includes a comprehensive Jest test suite. See [Testing Guide](./docs/TESTING.md) for details.

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage
```

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](./docs/CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License.

---

**Made with ❤️ for better personal finance management**
