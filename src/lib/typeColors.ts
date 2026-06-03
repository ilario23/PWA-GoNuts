/**
 * Money-direction color tokens, applied as Tailwind arbitrary-value classes so
 * accent-color / dark-mode theming propagates from the design tokens in index.css.
 *
 * Per the GoNuts "Money-Never-Color-Alone" rule, always pair these with a sign,
 * word, or icon — never rely on hue alone to convey direction.
 */
export type TransactionType = 'expense' | 'income' | 'investment' | string;

/** Text color class for a transaction/category type. */
export function getTypeTextColor(type: TransactionType): string {
  switch (type) {
    case 'expense':
      return 'text-[hsl(var(--gonuts-bad))]';
    case 'income':
      return 'text-[hsl(var(--gonuts-good))]';
    case 'investment':
      return 'text-[hsl(var(--color-investment))]';
    default:
      return 'text-foreground';
  }
}

/** Text + soft tinted background classes (e.g. for type badges/pills). */
export function getTypeTintClasses(type: TransactionType): string {
  switch (type) {
    case 'expense':
      return 'text-[hsl(var(--gonuts-bad))] bg-[hsl(var(--gonuts-bad))]/10';
    case 'income':
      return 'text-[hsl(var(--gonuts-good))] bg-[hsl(var(--gonuts-good))]/10';
    case 'investment':
      return 'text-[hsl(var(--color-investment))] bg-[hsl(var(--color-investment))]/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
}

/** Soft tinted background-only class for group chips (uses the investment blue token). */
export const GROUP_CHIP_CLASSES =
  'bg-[hsl(var(--color-investment))]/10 text-[hsl(var(--color-investment))]';
