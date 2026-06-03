import { ComponentType, ReactNode, createElement } from "react";
import { cn } from "@/lib/utils";
import { getIconComponent } from "@/lib/icons";
import { getTypeTextColor, getTypeTintClasses } from "@/lib/typeColors";

/**
 * Shared layout primitives for every entity detail drawer (transaction,
 * recurring, category, context). One vocabulary so the surfaces read the same:
 *
 *   <DetailHero> ...icon, name, hero value/pills...
 *   <DetailFacts>            quiet definition list, hairline dividers
 *     <DetailFact label>value</DetailFact>
 *   <DetailMeta>             demoted footer line (sync status)
 *
 * Replaces the old "circle icon + redundant icon-prefixed key/value rows".
 */

type IconType = ComponentType<{ className?: string }>;

interface DetailHeroProps {
  /** Category icon name resolved via getIconComponent. */
  iconName?: string | null;
  /** Fallback icon when no category icon is set. */
  fallbackIcon?: IconType;
  /** Category color (hex) used to tint the icon chip. */
  color?: string | null;
  title: string;
  /** Hero value / pills rendered under the title (amount, type pill, etc). */
  children?: ReactNode;
}

/** Icon chip + title + hero slot. Rounded-square chip echoes the brand FAB. */
export function DetailHero({
  iconName,
  fallbackIcon: Fallback,
  color,
  title,
  children,
}: DetailHeroProps) {
  const IconComp = iconName ? getIconComponent(iconName) : null;

  return (
    <div className="flex flex-col items-center text-center px-6 pt-7 pb-5">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-muted text-muted-foreground"
        style={color ? { backgroundColor: `${color}1f`, color } : undefined}
      >
        {IconComp ? (
          createElement(IconComp, { className: "h-7 w-7" })
        ) : Fallback ? (
          <Fallback className="h-7 w-7" />
        ) : (
          <div className="h-7 w-7 rounded-full bg-muted-foreground/20" />
        )}
      </div>
      <h2 className="max-w-full text-pretty break-words text-[1.375rem] font-bold leading-tight">
        {title}
      </h2>
      {children}
    </div>
  );
}

/** Big tabular-mono amount, type-colored, signed by the caller. */
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
        "num mt-3 text-[2rem] font-bold leading-none",
        getTypeTextColor(type),
        className
      )}
    >
      {children}
    </div>
  );
}

/** Short uppercase tinted pill for a transaction/category type. */
export function TypePill({ type, label }: { type: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em]",
        getTypeTintClasses(type)
      )}
    >
      {label}
    </span>
  );
}

/** Wrapper row for the hero pills (type, state, frequency). */
export function DetailPills({ children }: { children: ReactNode }) {
  return <div className="mt-3 flex flex-wrap items-center justify-center gap-2">{children}</div>;
}

/** Quiet definition list with hairline dividers, no boxes. */
export function DetailFacts({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl className={cn("divide-y divide-border/60 px-5", className)}>{children}</dl>
  );
}

/** One label/value row. Value can be text or a node (chip, badge). */
export function DetailFact({
  label,
  children,
  valueClassName,
}: {
  label: string;
  children: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-right text-sm font-medium",
          valueClassName
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/** Soft tinted chip for an entity value (context, group). */
export function DetailChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Demoted footer line for low-priority metadata (sync status). */
export function DetailMeta({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex items-center justify-center px-5 text-xs text-muted-foreground">
      {children}
    </div>
  );
}
