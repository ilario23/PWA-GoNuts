import { useRef, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export interface DailyRhythmDay {
  day: number;
  value: number;
  hasData: boolean;
}

interface DailyRhythmProps {
  days: DailyRhythmDay[];
  max: number;
  /** Day-of-month of "today" within this period, or -1 if not the current month. */
  todayDay: number;
  startLabel: string;
  endLabel: string;
  todayLabel: string;
  currencySymbol: string;
  isLoading: boolean;
  emptyText: string;
}

/**
 * The daily-spend bars. Drag a finger/cursor across to scrub: a tooltip follows
 * the pointer showing that day's spend, and the hovered bar lifts. Pure
 * interaction (no autoplay), so it needs no reduced-motion alternative; the
 * static bars are the always-visible default.
 */
export function DailyRhythm({
  days,
  max,
  todayDay,
  startLabel,
  endLabel,
  todayLabel,
  currencySymbol,
  isLoading,
  emptyText,
}: DailyRhythmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || days.length === 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      const idx = Math.min(days.length - 1, Math.max(0, Math.floor(ratio * days.length)));
      setActiveIdx(idx);
    },
    [days.length]
  );

  const hasData = days.some((d) => d.value > 0);

  if (isLoading) return <Skeleton className="h-[84px] w-full" />;
  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-[84px] text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  const active = activeIdx !== null ? days[activeIdx] : null;

  return (
    <div className="relative select-none">
      {/* Scrub tooltip */}
      {active && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-2 py-1 text-center shadow-lg"
          style={{ left: `${((activeIdx! + 0.5) / days.length) * 100}%` }}
        >
          <div className="num text-sm font-bold leading-none text-background">
            {currencySymbol}
            {active.value.toFixed(2)}
          </div>
          <div className="text-[10px] font-medium leading-none text-background/70 mt-0.5">
            {active.day}
          </div>
        </div>
      )}

      <div
        ref={trackRef}
        className="flex items-end gap-[3px] h-[84px] touch-none cursor-ew-resize"
        role="img"
        aria-label={emptyText}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          updateFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0 && e.pointerType === "mouse") return;
          updateFromClientX(e.clientX);
        }}
        onPointerUp={() => setActiveIdx(null)}
        onPointerCancel={() => setActiveIdx(null)}
        onPointerLeave={() => setActiveIdx(null)}
      >
        {days.map((d, i) => {
          const h = d.hasData ? Math.max(3, (d.value / max) * 80) : 3;
          const isToday = d.day === todayDay;
          const isActive = i === activeIdx;
          const bg = isActive
            ? "hsl(var(--primary))"
            : isToday
              ? "hsl(var(--primary))"
              : d.value > 0
                ? "hsl(var(--foreground))"
                : "hsl(var(--muted))";
          return (
            <div
              key={d.day}
              className="flex-1 rounded-[3px] transition-[height,transform] duration-150"
              style={{
                height: h,
                backgroundColor: bg,
                transform: isActive ? "scaleY(1.06)" : undefined,
                transformOrigin: "bottom",
                opacity: activeIdx !== null && !isActive ? 0.55 : 1,
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <span>{startLabel}</span>
        {todayDay > 0 && <span>{todayLabel}</span>}
        <span>{endLabel}</span>
      </div>
    </div>
  );
}
