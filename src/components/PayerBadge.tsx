import type { PayerInfo } from "@/lib/payer";

interface PayerBadgeProps {
  payer: PayerInfo;
  /** Show the payer name next to the avatar (desktop). Initial-only when false. */
  showName?: boolean;
  /** Avatar diameter; "sm" for mobile, "md" for desktop. */
  size?: "sm" | "md";
  className?: string;
}

const SIZES = {
  sm: { box: "h-[18px] w-[18px] text-[10px]", ring: "ring-1" },
  md: { box: "h-5 w-5 text-[11px]", ring: "ring-2" },
} as const;

/**
 * Compact "who paid" indicator: a coloured initial avatar, optionally followed
 * by the payer's name. Used in transaction lists to surface the payer at a
 * glance without opening the detail view.
 */
export function PayerBadge({
  payer,
  showName = false,
  size = "sm",
  className = "",
}: PayerBadgeProps) {
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span
        className={`flex items-center justify-center rounded-full font-bold text-white shrink-0 ${s.box} ${s.ring} ring-card`}
        style={{ backgroundColor: payer.color }}
        aria-hidden="true"
      >
        {payer.initial}
      </span>
      {showName && (
        <span className="truncate max-w-[80px] text-xs text-muted-foreground">
          {payer.name}
        </span>
      )}
    </span>
  );
}
