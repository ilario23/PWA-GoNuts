import { useRef, useState, useEffect, ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LazyChartProps {
  /** The chart component to render lazily */
  children: ReactNode;
  /** Height for the skeleton placeholder - should match chart height */
  height?: number | string;
  /** Additional CSS classes */
  className?: string;
  /** Root margin for IntersectionObserver (default: "100px") */
  rootMargin?: string;
  /** Whether the data is still loading */
  isLoading?: boolean;
}

/**
 * LazyChart - Renders charts only when they enter the viewport.
 *
 * Uses IntersectionObserver to defer heavy Recharts rendering
 * until the chart is about to be visible. Shows a skeleton placeholder
 * until then.
 *
 * @example
 * ```tsx
 * <LazyChart height={250}>
 *   <ChartContainer config={config}>
 *     <BarChart data={data}>...</BarChart>
 *   </ChartContainer>
 * </LazyChart>
 * ```
 */
export function LazyChart({
  children,
  height = 250,
  className = "",
  rootMargin = "100px", // Start loading 100px before entering viewport
  isLoading = false,
}: LazyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(() => !("IntersectionObserver" in window));
  const [hasBeenVisible, setHasBeenVisible] = useState(() => !("IntersectionObserver" in window));

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    // If already visible (e.g. IO not supported), no need to observe
    if (isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setHasBeenVisible(true);
            // Once visible, no need to observe anymore
            observer.unobserve(element);
          }
        });
      },
      {
        rootMargin,
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, isVisible]);

  const heightStyle = typeof height === "number" ? `${height}px` : height;

  // Show skeleton if:
  // 1. Chart has never been visible (initial state)
  // 2. Data is still loading
  const showSkeleton = !hasBeenVisible || isLoading;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: heightStyle, minWidth: 0 }}
    >
      {showSkeleton ? (
        <div
          className="flex flex-col gap-2 p-4"
          style={{ height: heightStyle }}
        >
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="flex-1 w-full rounded-lg" />
          <div className="flex justify-center gap-4 pt-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ) : (
        isVisible && children
      )}
    </div>
  );
}

/**
 * ChartSkeleton - Standalone skeleton for chart loading states.
 * Use when you need a skeleton without the lazy loading behavior.
 */
export function ChartSkeleton({
  height = 250,
  className = "",
}: {
  height?: number | string;
  className?: string;
}) {
  const heightStyle = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`flex flex-col gap-2 p-4 ${className}`}
      style={{ height: heightStyle }}
    >
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="flex-1 w-full rounded-lg" />
      <div className="flex justify-center gap-4 pt-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
