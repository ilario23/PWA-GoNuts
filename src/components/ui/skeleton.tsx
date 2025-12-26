import { cn } from "@/lib/utils"

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            role="status"
            aria-label="Loading content"
            aria-live="polite"
            aria-busy="true"
            className={cn(
                // Base styles
                "relative overflow-hidden rounded-md bg-muted dark:bg-primary/10",
                // Shimmer effect - optimized for both light and dark mode
                "before:absolute before:inset-0",
                "before:-translate-x-full before:animate-shimmer",
                // Enhanced gradient for dark mode visibility
                "before:bg-gradient-to-r before:from-transparent",
                "before:via-muted-foreground/[0.08] dark:before:via-muted-foreground/[0.15]",
                "before:to-transparent",
                // Performance optimization
                "will-change-transform",
                className
            )}
            {...props}
        >
            <span className="sr-only">Loading...</span>
        </div>
    )
}

export { Skeleton }
