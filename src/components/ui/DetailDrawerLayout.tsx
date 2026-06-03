import { ComponentType, ReactNode, createElement } from "react";
import { cn } from "@/lib/utils";
import { getIconComponent } from "@/lib/icons";
import { getTypeTextColor, getTypeTintClasses } from "@/lib/typeColors";

/**
 * "Ledger Stub" layout primitives shared by every entity detail drawer
 * (transaction, recurring, category, context).
 *
 * Left-aligned, amount-first. The monumental tabular-mono figure is the hero
 * (the brand's "truth at a glance"); category rides as a small icon-chip
 * eyebrow; supporting facts live in a 2-column spec grid, not stacked
 * form rows. Replaces the old centered-medallion + key/value sheet.
 *
 *   <DetailHeader>
 *     <DetailEyebrow><DetailIcon/> <TypePill/> <StatePill/></DetailEyebrow>
 *     <DetailAmount> | <DetailHeadline>
 *     <DetailTitle>
 *   </DetailHeader>
 *   <DetailGrid>
 *     <DetailCell label>value</DetailCell>
 *     <DetailCell wide> budget bar </DetailCell>
 *   </DetailGrid>
 *   <DetailMeta> sync tick </DetailMeta>
 */

type IconType = ComponentType<{ className?: string }>;

/** Small rounded icon chip, tinted by the entity's color. */
export function DetailIcon({
  iconName,
  fallbackIcon: Fallback,
  color,
}: {
  iconName?: string | null;
  fallbackIcon?: IconType;
  color?: string | null;
}) {
  const IconComp = iconName ? getIconComponent(iconName) : null;
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-muted text-muted-foreground"
      style={color ? { backgroundColor: `${color}24`, color } : undefined}
    >
      {IconComp ? (
        createElement(IconComp, { className: "h-5 w-5" })
      ) : Fallback ? (
        <Fallback className="h-5 w-5" />
      ) : (
        <div className="h-5 w-5 rounded-md bg-muted-foreground/20" />
      )}
    </div>
  );
}

/** Left-aligned hero zone. */
export function DetailHeader({ children }: { children: ReactNode }) {
  return <div className="px-5 pb-5 pt-6">{children}</div>;
}

/** Top identity row: icon chip + pills, all left-aligned. */
export function DetailEyebrow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2.5">{children}</div>;
}

/** Monumental tabular-mono amount, type-colored. Caller supplies the sign. */
export function DetailAmount({
  type,
  children,
  className,
}: {
  type: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "num mt-4 break-words text-[clamp(2rem,8vw,2.75rem)] font-bold leading-[1.05] tracking-tight",
        getTypeTextColor(type),
        className
      )}
    >
      {children}
    </div>
  );
}

/** Monumental headline for entities without an amount (category, context). */
export function DetailHeadline({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-4 text-pretty break-words text-[2rem] font-bold leading-[1.1] tracking-tight">
      {children}
    </h2>
  );
}

/** Secondary bold title under the amount (a transaction's description). */
export function DetailTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 break-words text-lg font-semibold leading-snug text-foreground/90">
      {children}
    </p>
  );
}

/** Row wrapper for hero pills. */
export function DetailPills({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mt-3.5 flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

const PILL_BASE =
  "inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em]";

/** Short uppercase tinted pill for a transaction/category type. */
export function TypePill({ type, label }: { type: string; label: string }) {
  return <span className={cn(PILL_BASE, getTypeTintClasses(type))}>{label}</span>;
}

/** Active / inactive state pill. */
export function StatePill({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={cn(
        PILL_BASE,
        active
          ? "bg-[hsl(var(--gonuts-good))]/10 text-[hsl(var(--gonuts-good))]"
          : "bg-muted text-muted-foreground"
      )}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

/** Neutral pill for secondary metadata (frequency, "your share"). */
export function MetaPill({ label }: { label: string }) {
  return <span className={cn(PILL_BASE, "bg-muted text-muted-foreground")}>{label}</span>;
}

/** 2-column spec grid, separated from the hero by a full-width hairline. */
export function DetailGrid({ children }: { children: ReactNode }) {
  return (
    <div className="border-t border-border/60">
      <dl className="grid grid-cols-2 gap-x-5 gap-y-5 px-5 py-5">{children}</dl>
    </div>
  );
}

/** One spec cell: micro uppercase label over its value. */
export function DetailCell({
  label,
  children,
  wide,
  mono,
  valueClassName,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
  mono?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2")}>
      <dt className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 break-words text-[15px] font-medium leading-snug",
          mono && "num",
          valueClassName
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/** Demoted footer tick for low-priority metadata (sync status). */
export function DetailMeta({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-5 pb-1 pt-4 text-xs text-muted-foreground">
      {children}
    </div>
  );
}
