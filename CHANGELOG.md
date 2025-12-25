# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2025-12-25

### Added
- **New Bank Import System**: Multi-step wizard optimization for mobile devices
- **Category Semantic Palette**: Option to regenerate category colors with modern, type-based color logic
- **Recursive Category Deletion**: Sequential conflict resolution (Transactions -> Subcategories)
- **Profiles System Integration**: Member avatars and names resolved via `public.profiles`
- **iOS Viewport Fixes**: Improved layout stability for iPhone PWA with Dynamic Island support

### Changed
- Refactored Group Member management UI (list-based, mobile-first)
- Improved Category Migration dialog with "Delete All" transactions option
- Updated translations for Import and Category features (IT/EN)

### Fixed
- NaN% display in Spending Overview for certain edge cases
- Category icon sizing in mobile tree views
- Divider duplication in mobile group cards

## [0.6.1] - 2025-11-30

### Added
- **User Profiles System**: `public.profiles` table with automatic user creation trigger
- Display names and avatars in group member lists instead of raw UUIDs
- `UserAvatar` component for consistent user display across the app
- `useProfiles(userIds)` and `useProfile(userId)` hooks for profile data
- `PendingChangesIndicator` component with badge showing unsynced changes
- Manual refresh buttons on Groups and GroupDetail pages
- `check_user_exists(uuid)` RPC function for member validation
- Collapsible sidebar on desktop (shadcn/ui Sidebar component)
- Keyboard shortcut <kbd>Cmd/Ctrl</kbd> + <kbd>B</kbd> to toggle sidebar
- iOS safe area support with `env(safe-area-inset-*)` CSS variables
- Full support for iPhone notch and Dynamic Island

### Changed
- Sync strategy optimized for mobile (hybrid manual/realtime)
- Sidebar state persists in cookie (desktop collapsed/expanded)
- Chart Y-axis legend spacing improved (Dashboard, Statistics)
- Settings default to epoch 0 timestamp for proper LWW conflict resolution
- Groups page refactored to use `managingGroupId` for reactive updates

### Fixed
- Monthly budget now syncs correctly from Supabase
- iOS content no longer overlaps with status bar
- Group member list updates reactively after adding new members
- Async `getStatus()` and `getPendingCount()` in SyncManager (race conditions fixed)
- Safe area padding correctly applied to all iOS devices

### Removed
- Supabase Realtime automatic background polling (switched to reactive UI triggers)

## [0.5.3] - 2025-11-28

### Added
- Cache-first authentication for instant app startup
- Debounced sync triggers (300ms for online, 1s for offline)
- `safeSync()` wrapper to prevent concurrent sync operations
- Session expiration countdown toast (5 seconds)
- Comprehensive test suite with Jest

### Changed
- Auth startup improved ~30x faster using cached credentials
- Reduced sync operations by 66% (removed duplicate triggers)
- Optimized startup sync with 2-second delay (non-blocking)

### Fixed
- Race condition between startup sync and online event sync
- Memory leak in session expiration timer
- Duplicate sync from `useAutoGenerate`

## [0.5.0] - 2025-11-22

### Added
- Group expenses with member management
- Split tracking (who paid, how much)
- Recurring transactions (daily, weekly, monthly, yearly)
- Context tagging for transactions
- Category budgets (monthly/yearly limits)
- Hierarchical category display (up to 5 levels)
- CategorySelector with breadcrumb navigation
- Interactive charts with Recharts

### Changed
- Dashboard redesigned with flip cards (mobile)
- Statistics page with monthly/yearly tabs
- Improved mobile layout for all pages

## [0.4.0] - 2025-11-15

### Added
- Multi-level category hierarchy
- Category filtering by type
- Soft delete for all entities
- Export/import functionality
- Monthly budget with progress tracking

### Changed
- Categories page with expandable tree view
- Better sync status indicators

## [0.3.0] - 2025-11-08

### Added
- Dark/light theme support
- Customizable accent colors
- Multi-language support (English, Italian)
- PWA manifest and service worker
- Offline functionality

### Changed
- UI redesign with shadcn/ui components
- Improved responsive layout

## [0.2.0] - 2025-11-01

### Added
- Statistics page with charts
- Transaction filtering
- Category management
- Supabase authentication

### Changed
- Migrated from localStorage to IndexedDB (Dexie)
- Implemented sync manager

## [0.1.0] - 2025-10-25

### Added
- Initial release
- Basic transaction tracking (income, expense, investment)
- Simple category system
- Local-only storage
- React 19 + TypeScript + Vite

---

**Legend**:
- 🎉 **Added**: New features
- ⚡ **Changed**: Changes in existing functionality
- 🐛 **Fixed**: Bug fixes
- 💥 **BREAKING**: Breaking changes
- 🗑️ **Removed**: Removed features/files
