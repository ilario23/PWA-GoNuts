# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-06-16

Privacy, account control, and accessibility improvements, plus security hardening behind the scenes.

### Added
- **Delete your account**: Permanently erase your account and all of its data from the server, right from Settings (type your email to confirm). Supports GDPR-style data erasure.
- **Review sync conflicts**: When your edit replaces one made on another device, the dropped version is now saved and reviewable in Settings — dismiss them once you've checked.
- **Export transactions as JSON**: Alongside CSV, you can now download the selected period as JSON for lossless re-import.

### Changed
- **Simpler data export**: Removed a duplicate "export everything" control; Full backup is now the single all-data export.
- **Even lighter**: The profile photo editor downloads only when you open it.

### Fixed
- **Profile privacy**: Your email and profile are now visible only to people who share a group with you — previously any signed-in user could read them.
- **Accessibility**: Charts now expose a text description to screen readers.

### Security
- Tightened database access rules and added server-side validation of amounts and text length.
- CSV exports are now protected against spreadsheet formula injection.

---

_🇮🇹 Italiano_

Miglioramenti a privacy, controllo dell'account e accessibilità, con rafforzamenti di sicurezza dietro le quinte.

### Aggiunto
- **Elimina il tuo account**: Cancella definitivamente il tuo account e tutti i suoi dati dal server, direttamente dalle Impostazioni (digita la tua email per confermare). Supporta la cancellazione dei dati in stile GDPR.
- **Rivedi i conflitti di sincronizzazione**: Quando una tua modifica sostituisce quella fatta su un altro dispositivo, la versione scartata viene ora salvata e consultabile nelle Impostazioni — ignorala dopo averla controllata.
- **Esporta i movimenti in JSON**: Oltre al CSV, ora puoi scaricare il periodo selezionato in JSON per una reimportazione senza perdite.

### Modificato
- **Esportazione dati semplificata**: Rimosso un controllo "esporta tutto" duplicato; il Backup completo è ora l'unica esportazione di tutti i dati.
- **Ancora più leggera**: L'editor della foto profilo si scarica solo quando lo apri.

### Corretto
- **Privacy del profilo**: La tua email e il tuo profilo sono ora visibili solo a chi condivide un gruppo con te — prima qualsiasi utente registrato poteva leggerli.
- **Accessibilità**: I grafici ora espongono una descrizione testuale per gli screen reader.

### Sicurezza
- Irrigidite le regole di accesso al database e aggiunta la validazione lato server di importi e lunghezza del testo.
- Le esportazioni CSV sono ora protette dall'iniezione di formule nei fogli di calcolo.

---

## [2.1.2] - 2026-06-13

### Changed
- **Bottom navigation redesign**: The bottom bar is now a liquid-glass pill with five equal tabs, matching the iOS-style frosted material.
- **Add tab**: Add transaction is now a standard center tab — same size and weight as the other tabs, no raised button.

---

_🇮🇹 Italiano_

### Modificato
- **Nuova barra di navigazione**: La barra in basso è ora una pillola in vetro liquido con cinque tab uguali, nello stile frosted di iOS.
- **Tab Aggiungi**: Il pulsante Aggiungi è ora un tab centrale standard, uguale agli altri — senza pulsante sopraelevato.

---

## [2.1.1] - 2026-06-13

### Added
- **Auto-hiding navigation**: The bottom navigation bar hides as you scroll down, giving more room to browse your transactions.

### Fixed
- **iOS calculator**: Calculator buttons no longer dismiss the keyboard mid-entry.
- **iOS sheets**: Fixed a gap that appeared at the bottom of sheets when the on-screen keyboard was open on iPhone.

---

_🇮🇹 Italiano_

### Aggiunto
- **Navigazione a scomparsa**: La barra di navigazione in basso si nasconde scorrendo verso il basso, dando più spazio per sfogliare i movimenti.

### Corretto
- **Calcolatrice iOS**: I pulsanti della calcolatrice non chiudono più la tastiera durante l'inserimento.
- **Pannelli iOS**: Corretto uno spazio vuoto in fondo ai pannelli quando la tastiera virtuale era aperta su iPhone.

---

## [2.1.0] - 2026-06-10

Security hardening, reliability improvements, and better tools for managing your data.

### Added
- **Full backup & restore**: Export a complete backup of all your data as a JSON file from Settings, and restore it on any device. Great for migrating or as a safety net before clearing data.
- **Sync error visibility**: When a record fails to sync, you'll now see a clear error indicator with details on what went wrong and a one-tap retry. Quarantined records are flagged separately.

### Changed
- **Faster startup**: The app launches faster — language files load in the background instead of blocking startup.
- **Lighter install**: The app installs about 1 MB lighter — heavy features download only when you actually use them.
- **Profile photo cleanup**: Uploading a new profile photo automatically removes the old one.

### Fixed
- **Sync on multiple devices**: Edited the same entry on two devices? The most recent change now wins automatically, with a heads-up notification.
- **Accessibility**: Icon buttons throughout the app are now properly labeled for VoiceOver and screen readers.
- **iOS pinch-to-zoom**: The restriction that blocked pinch-to-zoom on iOS has been removed.

---

_🇮🇹 Italiano_

Miglioramenti alla sicurezza, maggiore affidabilità e nuovi strumenti per gestire i tuoi dati.

### Aggiunto
- **Backup e ripristino completo**: Esporta un backup completo di tutti i tuoi dati come file JSON dalle Impostazioni, e ripristinalo su qualsiasi dispositivo. Ideale per migrare o come rete di sicurezza prima di cancellare i dati.
- **Visibilità errori di sincronizzazione**: Quando un record non riesce a sincronizzarsi, vedrai un indicatore di errore chiaro con i dettagli del problema e un tocco per riprovare. I record in quarantena sono segnalati separatamente.

### Modificato
- **Avvio più veloce**: L'app si avvia più velocemente — i file delle lingue si caricano in background invece di bloccare l'avvio.
- **Installazione più leggera**: L'app si installa circa 1 MB più leggera — le funzioni pesanti si scaricano solo quando le usi davvero.
- **Pulizia foto profilo**: Caricare una nuova foto profilo rimuove automaticamente quella vecchia.

### Corretto
- **Sincronizzazione su più dispositivi**: Hai modificato la stessa voce su due dispositivi? La modifica più recente vince automaticamente, con una notifica per tenerti informato.
- **Accessibilità**: I pulsanti con icona nell'app sono ora correttamente etichettati per VoiceOver e screen reader.
- **Zoom con pizzico su iOS**: La restrizione che bloccava il pinch-to-zoom su iOS è stata rimossa.

---

## [2.0.1] - 2026-06-03

Refinements to the ledger design language and profile page.

### Changed
- **Profile page redesign**: Redesigned as a "ledger title page" with live account stats (Member since, Entries logged, Categories) in tabular mono figures, separated by ruled hairlines. Simplified to a clean view ⇄ edit toggle replacing the old three-state accordion. Account section is now a single pressable ledger row.
- **CategorySelector refinements**: Enhanced layout vocabulary and improved keyboard navigation for the category picker.
- **Avatar and profile handling**: Improved avatar loading and profile state management with live queries for real-time updates.

### Added
- New translations for profile section (en/it): `member_since`, `entries_logged`, `sign_out`, `sign_out_desc`, `account`.

### Fixed
- Profile accent ring now uses `--ring` token (user theme) instead of static coral, ensuring consistency with FAB and active nav colors.

## [2.0.0] - 2026-06-03

A major visual release: GoNuts gets a complete v2 redesign across every screen.

### Added
- **v2 visual redesign**: Warm ink-on-paper palette and Bricolage Grotesque typography for a calmer, more expressive feel throughout the app.
- **Bottom tab navigation**: New bottom tab bar plus a dedicated **More** hub page that gathers contexts, recurring transactions, settings, and the rest in one place.
- **Daily rhythm visualization**: Statistics now shows how spending flows across the days of the month.
- **In-dialog calculator**: A calculator built into the add-transaction dialog for quick math without leaving the flow.
- **Group balance page**: Group balances and settlement plans moved from a cramped drawer into a full, scrollable page.
- **Design & product docs**: Added `DESIGN.md` and `PRODUCT.md` to capture the v2 design language and product direction.

### Changed
- **Redesigned pages**: Dashboard, Transactions, Statistics, Groups, Group Detail, Contexts, Recurring, and Settings all reworked to match the v2 look and feel.
- **Ledger-style lists**: Transaction and category lists reworked into consistent "ledger sheet" layouts with ruled lines.
- **Detail drawers**: Transaction, category, context, and recurring detail drawers unified around a shared `DetailDrawerLayout` and `DetailDrawerActions`, replacing the old swipe-based interactions.

### Fixed
- **Accessibility**: Improvements across dialogs, category and date pickers, and navigation, with updated IT/EN translations.

## [1.0.12] - 2026-05-06

### Changed
- **Add transaction dialog**: Clearer labels, visible helper text, and better defaults for group payer selection.

### Fixed
- **Add transaction regressions**: Category selection stays stable and now resets only when the selected group changes.

## [1.0.11] - 2026-05-06

### Added
- **Settlement payments**: Persistent settlement records per group with local storage and Supabase sync; one-time migration from legacy settlement markers in user settings.
- **Settlement history**: Past transfers shown in the group balance flow; optional undo for eligible recent settlements.

### Changed
- **Group balances**: Balance drawer and settlement plan derive totals from recorded settlement payments so owed amounts stay consistent across devices.

### Fixed
- **Group balance drawer**: Scrolling and layout when the sheet has a lot of content (balances, settlement plan, history) so nothing stays trapped off-screen on smaller viewports.

## [1.0.10] - 2026-05-03

### Added
- **Recurring sync**: Deterministic occurrence IDs and a `recurrence_key` so auto-generated transactions line up across devices and stay idempotent during sync.

### Changed
- **Sync pipeline**: `recurring_transactions` is pushed before `transactions` so generated rows respect foreign keys; clearer handling of rows with and without recurrence metadata.
- **Transaction UI**: Category selector and transaction dialog structure and formatting aligned for readability.

### Fixed
- **Duplicate recurring rows**: Server-side idempotent upsert on `recurrence_key` plus client sync fixes to stop duplicate occurrences when syncing with Supabase.
- **Filters on small screens**: Transaction filter sheet and desktop filter popover scroll inside the available height instead of overflowing the viewport.

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
