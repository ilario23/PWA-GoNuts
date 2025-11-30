# Personal Expense Tracker PWA

A modern, offline-first Progressive Web App for managing personal finances. Track your income, expenses, and investments with a beautiful, responsive interface that works seamlessly online and offline.

![Version](https://img.shields.io/badge/version-0.5.3-blue.svg)
![React](https://img.shields.io/badge/React-19.2-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)

## ✨ Key Features

- 🔄 **Offline-First** - Full functionality without internet connection
- ⚡ **Cache-First Auth** - Instant app startup with cached credentials
- 💰 **Financial Management** - Track income, expenses, and investments
- 📊 **Analytics** - Detailed charts and statistics
- 💵 **Monthly Budget** - Set limits with progress tracking and notifications
- 👥 **Group Expenses** - Share expenses with others
- 🔁 **Recurring Transactions** - Auto-generated on app load
- 🔄 **Smart Sync** - Background sync with debouncing and race condition prevention
- 🎨 **Modern UI** - Responsive design with dark/light themes
- 🌍 **Multi-language** - English and Italian support
- 📱 **PWA** - Installable on mobile and desktop
- 💾 **Export/Import** - Backup your data as JSON

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

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Data**: Dexie (IndexedDB), Supabase (PostgreSQL + Auth)
- **PWA**: vite-plugin-pwa, Workbox
- **i18n**: i18next, react-i18next

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
