---
name: GoNuts
description: Warm ink-on-paper expense tracking with a coral spark — fast to log, honest to read.
colors:
  ink: "#1A1714"
  paper: "#FAF6EF"
  paper-2: "#F2EDE3"
  card: "#FFFFFF"
  coral: "#E66A3C"
  good: "#2F9E5A"
  bad: "#D14545"
  muted-ink: "#8A8278"
  border: "#D4CCC2"
  chart-blue: "#2F7DF0"
  chart-purple: "#8A47E0"
  chart-amber: "#F59E0B"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.2rem + 1.5vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(1rem, 0.95rem + 0.25vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.6
  numeric:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontWeight: 700
    fontFeature: "tnum"
  label:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  sm: "14px"
  md: "18px"
  lg: "22px"
  pill: "28px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
  fab:
    backgroundColor: "{colors.coral}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: "64px"
    width: "64px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
---

# Design System: GoNuts

## 1. Overview

**Creative North Star: "The Warm Ledger"**

GoNuts is a personal-finance app that reads like a well-kept paper ledger rather than a banking dashboard. The surface is warm off-white paper, the text is near-black ink, and a single coral spark marks the one thing that always matters: adding money in or out. Numbers are set in a monospace face so columns line up and a glance tells the truth. The personality is warm and friendly with room for a playful edge — likeable, low-anxiety, never corporate or finger-wagging — but it never trades clarity or speed for decoration.

This system rejects the generic blue-gradient SaaS dashboard, the cold navy-and-gold fintech look, and the generic-AI pastel-tile / cream-default aesthetic. The cream here is deliberate and paired with a committed ink and a real accent; warmth is carried by the palette, the rounded forms, and Bricolage Grotesque, not by a tinted near-white standing in for an idea.

**Key Characteristics:**
- Warm ink-on-paper base, one coral accent, semantic green/red for money direction.
- Generous 22px card radii; soft, low shadows; nothing harsh.
- Monospace tabular numerals for every currency value.
- Mobile-first: a floating dark pill nav with a coral add-FAB is the signature.

## 2. Colors

A warm neutral base (paper + ink) with one identity accent (coral) and a strict semantic pair for money (green in, red out).

### Primary
- **Coral Spark** (`#E66A3C`, `hsl(19 77% 56%)`): The brand accent and focus ring. Reserved for the primary "add" affordance (FAB), active navigation, and today's marker. Its rarity is what makes it read as *the* action.

### Secondary
- **Ledger Green** (`#2F9E5A`): Income and positive balances. Always paired with a `+` sign or label, never carrying meaning alone.
- **Ledger Red** (`#D14545`): Expenses, destructive actions, over-budget. Always paired with a `−` sign or word.

### Tertiary
- **Chart Blue** (`#2F7DF0`), **Chart Purple** (`#8A47E0`), **Chart Amber** (`#F59E0B`): Data-visualization roles only (investment series, multi-category breakdowns). Not for chrome or text.

### Neutral
- **Ink** (`#1A1714`, `hsl(25 13% 10%)`): Body text, primary buttons, headings.
- **Paper** (`#FAF6EF`): App background.
- **Paper-2** (`#F2EDE3`): Inputs, muted surfaces, hover states.
- **Card White** (`#FFFFFF`): Raised cards on paper.
- **Muted Ink** (`#8A8278`): Secondary text and labels — use at full strength, not faded further.
- **Warm Border** (`#D4CCC2`): Hairline borders and dividers.

### Named Rules
**The One Coral Rule.** Coral is the action color. It belongs to the add-transaction FAB, the active nav tab, and today's bar — and almost nothing else. If a second coral element appears on a screen, one of them is wrong.

**The Money-Never-Color-Alone Rule.** Green and red always travel with a sign, word, or icon. A color-blind user must read direction without seeing hue.

## 3. Typography

**Display Font:** Bricolage Grotesque (with system-ui fallback)
**Body Font:** Bricolage Grotesque (same family, lighter weights)
**Numeric Font:** JetBrains Mono (the `.num` class)

**Character:** Bricolage Grotesque is a warm, slightly quirky grotesque — friendly without being childish, which carries the "playful edge" without extra typefaces. JetBrains Mono handles every currency amount so figures stay tabular and scannable.

### Hierarchy
- **Display / Hero** (extrabold, `clamp(2.5rem,8vw,3.5rem)`, line-height 1, mono): The dashboard "spent so far" figure. The single biggest element on the screen.
- **Headline / h1** (bold, `clamp(1.5rem,…,2rem)`, 1.2): Page titles.
- **Title / h2** (bold, `1.125rem`): Section headers ("Where it went", "Recent").
- **Body** (regular, `clamp(1rem,…,1.125rem)`, 1.6): Default text. Cap prose at 65–75ch.
- **Label** (bold, `0.6875rem`, `0.08em`, UPPERCASE): Small eyebrows and stat captions. Short only (≤4 words).

### Named Rules
**The Tabular-Number Rule.** Every currency value uses the `.num` class (JetBrains Mono, `tnum`). Amounts in a body sans-serif are a bug.

## 4. Elevation

A soft, low-elevation system: surfaces are flat-to-gently-lifted on paper, never harsh. Depth comes from a faint hairline border plus a soft diffuse shadow, not from dark drop shadows. The bottom nav and FAB are the only strongly-lifted elements, because they float above scrolling content.

### Shadow Vocabulary
- **Card rest** (`0 1px 0 rgba(26,23,20,0.04), 0 6px 16px -8px rgba(26,23,20,0.12)`): Default card lift on paper.
- **Floating nav** (`0 8px 32px -4px rgba(26,23,20,0.36), 0 2px 8px -2px rgba(26,23,20,0.24)`): The bottom pill nav.
- **FAB** (`0 4px 16px -2px rgba(230,106,60,0.50)`): Coral glow under the add button.

### Named Rules
**The Soft-Shadow Rule.** Shadows are warm-tinted (ink, not pure black) and diffuse. A hard, dark, tight shadow reads as a 2014 app; lift with blur and spread, never with opacity.

## 5. Components

### Buttons
- **Shape:** Gently rounded (22px / `--radius`).
- **Primary:** Ink background, paper text (`#1A1714` on `#FAF6EF`), 12×20px padding. High contrast, calm.
- **Hover / Focus:** Subtle brightness shift; focus shows the coral ring (`--ring`).
- **Ghost:** Transparent, ink text, paper-2 hover — used for icon buttons in headers.

### Chips
- **Style:** Pill (28px). Filter chips: selected = ink fill + paper text; unselected = paper-2 fill + ink text.
- **State:** Type filters (All / Expense / Income / Investment) and the dialog Category/Date/Context tiles follow this.

### Cards / Containers
- **Corner Style:** 22px (`--radius-lg`).
- **Background:** Card white on paper; paper-2 for muted/nested regions.
- **Shadow Strategy:** Card-rest shadow (see Elevation).
- **Border:** Optional warm hairline (`#D4CCC2` at ~50%).
- **Internal Padding:** 16px default.

### Inputs / Fields
- **Style:** Paper-2 fill, 18px radius, no heavy stroke.
- **Focus:** Coral ring.
- **Error:** Ledger Red text + message inline near the field (not only a toast).

### Navigation
- **Mobile:** A floating dark pill (`hsl(25 15% 22%)`) fixed near the bottom safe-area, 5 slots: Dashboard, Transactions, coral add-FAB (center, raised), Statistics, More. Active = coral icon + label + top tick.
- **Desktop:** Collapsible left sidebar with full text labels; bottom nav hidden.
- **Active/inactive:** Active is coral; inactive labels must stay ≥4.5:1 against the dark bar (current `white/55` at 10px does not — fix toward `white/75`+).

### Signature Component — The Add-FAB
A 64px coral rounded-square, raised above the nav pill, owning the new-transaction sheet directly. It is the emotional center of the app: logging money must always be one thumb-tap away.

## 6. Do's and Don'ts

### Do:
- **Do** reserve hue for *meaning*: money direction (income/expense/investment), state (over-budget, success, error), data-viz categories, and user-chosen category colors. Everything else stays on the warm neutral system.
- **Do** carry warmth through the ink/paper/coral palette, the 22px radii, and Bricolage Grotesque — not through a tinted near-white standing in for design.
- **Do** keep coral for the one primary action per screen (The One Coral Rule).
- **Do** set every currency value in `.num` (JetBrains Mono, tabular).
- **Do** pair money colors with a sign/word/icon (The Money-Never-Color-Alone Rule).
- **Do** drive color from the `--gonuts-*`, `--color-expense/income/investment`, and `--chart-*` tokens so accent-color and dark mode propagate.
- **Do** protect the entry path: never add a tap, a hidden field, or a clipped control to logging a transaction.

### Don't:
- **Don't** color utility/navigation surfaces for decoration (e.g. a different pastel per More-hub tile). If color carries no meaning there, use the neutral system; the icon and label already differentiate.
- **Don't** ship the generic blue-gradient SaaS dashboard, the cold navy-and-gold fintech look, or the generic-AI pastel-tile / cream-default aesthetic.
- **Don't** hardcode Tailwind palette colors (`text-violet-600`, `bg-blue-100`, `#D08A1E`). Use tokens; one-off colors break theming and dilute the brand.
- **Don't** use a colored `border-left`/`border-right` greater than 1px as an accent stripe on rows or cards. Use a leading color dot, a full tint, or nothing.
- **Don't** clip a control off-screen behind a hidden scrollbar (the add-sheet Context chip). Let it wrap or show a peek/fade.
- **Don't** use em dashes in UI copy. Use commas, colons, or parentheses.
- **Don't** rely on muted gray for body text on paper if it dips below 4.5:1; bump toward ink.
