import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/useMobile";
import { useState, useEffect } from "react";

interface ContentLoaderProps {
    variant: "transaction" | "card" | "chart" | "table-row" | "category-mobile" | "category-desktop" | "group-card";
    count?: number;
    className?: string;
    /** If true, automatically adjusts count based on screen size (mobile: 60% of count, desktop: full count) */
    adaptive?: boolean;
    /** Delay in milliseconds before showing skeleton (default: 150ms). Prevents flash for fast cached data. */
    delay?: number;
}

/**
 * Get adaptive skeleton count based on screen size
 * Mobile shows fewer skeletons for faster perceived loading
 */
function getAdaptiveSkeletonCount(count: number, isMobile: boolean): number {
    if (!isMobile) return count;
    // Mobile: show 60% of desktop count (min 2, max 5)
    return Math.max(2, Math.min(5, Math.ceil(count * 0.6)));
}

/**
 * ContentLoader - Reusable skeleton loader for common UI patterns
 * 
 * Provides pre-built skeleton layouts that match actual content structure.
 * Uses shimmer animation for smooth loading indication.
 * 
 * Implements a delay mechanism to prevent flash of loading state when data
 * is cached (e.g., IndexedDB). If data loads within the delay period,
 * skeleton never appears, providing instant perceived performance.
 * 
 * @example
 * ```tsx
 * // Single skeleton with default 150ms delay
 * <ContentLoader variant="transaction" count={1} />
 * 
 * // Multiple skeletons with custom delay
 * <ContentLoader variant="card" count={8} adaptive delay={200} />
 * ```
 */
export function ContentLoader({ variant, count = 5, className, adaptive = false, delay = 150 }: ContentLoaderProps) {
    const isMobile = useMobile();
    const actualCount = adaptive ? getAdaptiveSkeletonCount(count, isMobile) : count;
    const [showSkeleton, setShowSkeleton] = useState(false);

    useEffect(() => {
        // Set a timeout to show skeleton only after delay
        // If component unmounts before delay (data arrived), skeleton never shows
        const timer = setTimeout(() => {
            setShowSkeleton(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [delay]);

    // Don't render anything until delay has passed
    if (!showSkeleton) {
        return null;
    }

    const renderSkeleton = () => {
        switch (variant) {
            case "transaction":
                return (
                    <div className="rounded-lg border bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            {/* Icon placeholder */}
                            <Skeleton className="h-10 w-10 rounded-full shrink-0" />

                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-28" /> {/* Description */}
                                    <Skeleton className="h-3 w-3 rounded-full" /> {/* Sync badge */}
                                </div>
                                <div className="flex gap-2">
                                    <Skeleton className="h-3 w-16 rounded-md" /> {/* Category */}
                                    <Skeleton className="h-3 w-12 rounded-md" /> {/* Date */}
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="text-right space-y-1">
                                <Skeleton className="h-5 w-16 ml-auto" />
                                <Skeleton className="h-2.5 w-10 ml-auto" />
                            </div>
                        </div>
                    </div>
                );

            case "card":
                return (
                    <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                        <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                );

            case "chart":
                return (
                    <div className="space-y-3 p-4">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-64 w-full rounded-lg" />
                        <div className="flex gap-4 justify-center pt-2">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                    </div>
                );

            case "table-row":
                return (
                    <div className="flex items-center gap-4 p-3 border-b">
                        <Skeleton className="h-4 w-4" />
                        <div className="flex items-center gap-2 flex-1">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                );

            case "category-mobile":
                return (
                    <div className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                    </div>
                );

            case "category-desktop":
                return (
                    <div className="flex items-center gap-4 p-3 border-b">
                        <Skeleton className="h-4 w-4" />
                        <div className="flex items-center gap-2 flex-1">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                );

            case "group-card":
                return (
                    <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Skeleton className="h-9 flex-1 rounded-md" />
                            <Skeleton className="h-9 flex-1 rounded-md" />
                        </div>
                    </div>
                );

            default:
                return <Skeleton className="h-16 w-full" />;
        }
    };

    return (
        <div className={cn("space-y-3 pointer-events-none", className)}>
            {Array.from({ length: actualCount }).map((_, i) => (
                <div
                    key={i}
                    className="animate-slide-in-up opacity-0 fill-mode-forwards"
                    style={{ animationDelay: `${i * 0.05}s` }}
                >
                    {renderSkeleton()}
                </div>
            ))}
        </div>
    );
}
