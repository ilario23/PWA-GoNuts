# Personal Expense Tracker PWA

A modern, offline-first Progressive Web App for managing personal finances. Track your income, expenses, and investments with a beautiful, responsive interface that works seamlessly online and offline.

![Version](https://img.shields.io/badge/version-0.7.0-blue.svg)
![React](https://img.shields.io/badge/React-19.2-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Key Features

### 🔄 Hybrid Offline-First Architecture

- **Full offline functionality** - All features work without internet connection
- **Local-first data storage** using IndexedDB (Dexie)
- **Hybrid Sync Strategy**:
  - **Push/Pull Sync**: Automatic background sync when connection is restored
  - **Realtime Sync**: Instant cross-device updates via Supabase Realtime
- **Delta synchronization** for efficient data updates
- **Conflict-free sync** using sync tokens (last-write-wins)

### 💰 Financial Management

- **Transaction tracking** - Record income, expenses, and investments
- **Hierarchical categories** - Organize with unlimited nested subcategories (collapsible tree view)
- **Contexts** - Tag transactions with custom contexts (e.g., "Work", "Personal")
- **Recurring transactions** - Automate regular income/expenses with auto-generation
- **Monthly budget** - Set spending limits and track progress
- **Category budgets** - Set individual spending limits per category
- **Budget notifications** - Warnings at 80% and alerts when exceeded
- **Group expenses** - Share expenses with others and track who paid
- **Multi-currency support** - Configure your preferred currency

### 📊 Analytics & Insights

- **Dashboard overview** - Quick summary with budget progress bar
- **Statistics page** - Detailed charts and visualizations
- **Category breakdown** - See spending patterns by category
- **Context analytics** - Track spending by context
- **Trend analysis** - Track financial trends over time
- **Burn rate** - Daily spending velocity and projections
- **Monthly/yearly views** - Filter data by time period

### 💾 Data Management

- **Export to JSON** - Download all your data as backup
- **Import from JSON** - Restore data from backup file
- **Clear local cache** - Troubleshoot sync issues

### 🎨 Modern UI/UX

- **Responsive design** - Works perfectly on mobile, tablet, and desktop
- **Dark/light/system themes** - Choose your preferred appearance
- **Customizable accent colors** - Personalize the interface
- **Smooth animations** - Polished user experience
- **Accessible** - Built with accessibility in mind

### 🌍 Internationalization

- **Multi-language support** - Currently supports English and Italian
- **Easy to extend** - Add new languages with JSON translation files
- **Automatic language detection** - Uses browser preferences

### 📱 PWA Capabilities

- **Installable** - Add to home screen on mobile and desktop
- **Works offline** - Full functionality without internet
- **Fast loading** - Optimized caching strategies
- **Native-like experience** - Standalone display mode
- **Update notifications** - User-controlled app updates with prompt

## 🛠️ Tech Stack

### Frontend

- **[React 19](https://react.dev/)** - UI framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Vite](https://vitejs.dev/)** - Build tool and dev server
- **[React Router](https://reactrouter.com/)** - Client-side routing
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first styling
- **[shadcn/ui](https://ui.shadcn.com/)** - UI component library
- **[Lucide React](https://lucide.dev/)** - Icon library
- **[Recharts](https://recharts.org/)** - Chart library

### Data & State

- **[Dexie](https://dexie.org/)** - IndexedDB wrapper for local storage
- **[Supabase](https://supabase.com/)** - Backend as a Service (PostgreSQL + Auth)
- **[i18next](https://www.i18next.com/)** - Internationalization framework

### PWA

- **[vite-plugin-pwa](https://vite-pwa-org.netlify.app/)** - PWA plugin for Vite
- **[Workbox](https://developer.chrome.com/docs/workbox/)** - Service worker library

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account (for backend)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd pwa-antigravity
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**

   Run the SQL schema in your Supabase project:

   ```bash
   # Copy the contents of supabase_schema.sql and run it in your Supabase SQL editor
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to `http://localhost:5173`

## 📁 Project Structure

```
pwa-antigravity/
├── public/                 # Static assets (PWA icons, manifest)
├── src/
│   ├── assets/            # Images and other assets
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── AppShell.tsx  # Main layout wrapper
│   │   ├── CategorySelector.tsx
│   │   ├── PWAUpdateNotification.tsx
│   │   ├── SyncStatus.tsx
│   │   ├── TransactionList.tsx
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useTransactions.ts
│   │   ├── useCategories.ts
│   │   ├── useCategoryBudgets.ts
│   │   ├── usePWAUpdate.ts
│   │   ├── useRealtimeSync.ts
│   │   ├── useStatistics.ts
│   │   └── ...
│   ├── lib/              # Utility libraries
│   │   ├── db.ts         # Dexie database setup
│   │   ├── supabase.ts   # Supabase client
│   │   ├── sync.ts       # Sync manager
│   │   ├── icons.ts      # Icon mapping
│   │   └── utils.ts
│   ├── locales/          # i18n translation files
│   │   ├── en/
│   │   └── it/
│   ├── pages/            # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Transactions.tsx
│   │   ├── Categories.tsx
│   │   ├── Statistics.tsx
│   │   └── ...
│   ├── App.tsx           # Main app component
│   ├── i18n.ts           # i18n configuration
│   └── main.tsx          # App entry point
├── supabase_schema.sql   # Database schema
├── vite.config.ts        # Vite configuration
└── package.json
```

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📚 Documentation

- **[Architecture Guide](ARCHITECTURE.md)** - Detailed technical architecture
- **[API Reference](API_REFERENCE.md)** - Hooks, interfaces, and utilities
- **[Deployment Guide](DEPLOYMENT.md)** - How to deploy to production
- **[Contributing Guide](CONTRIBUTING.md)** - Guidelines for contributors
- **[User Guide](USER_GUIDE.md)** - End-user documentation

## 🔒 Security & Privacy

- **Row Level Security (RLS)** - Supabase policies ensure users can only access their own data
- **Local-first** - Your data is stored locally first, synced to cloud when available
- **Secure authentication** - Powered by Supabase Auth
- **No tracking** - Your financial data stays private

## 🤝 Contributing

Contributions are welcome! Please read the [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/) components
- Icons from [Lucide](https://lucide.dev/)
- Backend powered by [Supabase](https://supabase.com/)
- Inspired by modern personal finance apps

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Made with ❤️ for better personal finance management**
