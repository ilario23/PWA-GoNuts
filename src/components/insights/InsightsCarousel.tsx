import React, { useRef } from "react";
import { Insight } from "../../lib/insightUtils";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";
import * as Icons from "lucide-react";


import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface InsightsCarouselProps {
    insights: Insight[];
    isLoading?: boolean;
}

export const InsightsCarousel: React.FC<InsightsCarouselProps> = ({
    insights,
    isLoading = false,
}) => {
    const { t } = useTranslation();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = React.useState(false);
    const [canScrollRight, setCanScrollRight] = React.useState(true);
    const [activeIndex, setActiveIndex] = React.useState(0);

    const checkScrollButtons = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);

            // Calculate active index based on scroll position
            // We use different logic for mobile (full width) vs desktop
            const isMobile = window.innerWidth < 640; // sm breakpoint
            if (isMobile) {
                const index = Math.round(scrollLeft / clientWidth);
                setActiveIndex(index);
            }
        }
    };

    React.useEffect(() => {
        checkScrollButtons();
        window.addEventListener("resize", checkScrollButtons);
        return () => window.removeEventListener("resize", checkScrollButtons);
    }, [insights]);

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const isMobile = window.innerWidth < 640;
            // On mobile, scroll by full container width. On desktop, by card width (320)
            const scrollAmount = isMobile ? scrollRef.current.clientWidth : 320;

            scrollRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
            // Check buttons after scroll animation (approximate delay)
            setTimeout(checkScrollButtons, 300);
        }
    };

    // Prevent layout shift: render a placeholder with the same height if no insights
    // Prevent layout shift: render a placeholder with the same height if no insights
    if (isLoading || !insights || insights.length === 0) {
        return null;
    }

    return (
        <div className="w-full mb-6 space-y-2">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {t("insights.section_title", "Highlights")}
                </h3>
                <div className="hidden md:flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-transparent hover:bg-muted disabled:opacity-30"
                        onClick={() => scroll("left")}
                        disabled={!canScrollLeft}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-transparent hover:bg-muted disabled:opacity-30"
                        onClick={() => scroll("right")}
                        disabled={!canScrollRight}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Scroll Container */}
            <div
                ref={scrollRef}
                onScroll={checkScrollButtons}
                className="flex w-full overflow-x-auto gap-4 pb-4 px-1 snap-x snap-mandatory no-scrollbar"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {insights.map((insight) => {
                    // Dynamic Icon Rendering
                    const IconComponent = (Icons as any)[insight.icon] || Icons.Info;

                    return (
                        <div
                            key={insight.id}
                            className="min-w-full sm:min-w-[320px] sm:max-w-[320px] h-[140px] snap-center px-1 sm:px-0 sm:first:pl-1 sm:last:pr-1"
                        >
                            <Card
                                className={cn(
                                    "h-full border-l-4 shadow-sm hover:shadow-md transition-shadow",
                                    insight.type === "positive" && "border-l-green-500 bg-green-50/50 dark:bg-green-900/10",
                                    insight.type === "warning" && "border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10",
                                    insight.type === "neutral" && "border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10",
                                    insight.type === "tip" && "border-l-purple-500 bg-purple-50/50 dark:bg-purple-900/10"
                                )}
                            >
                                <CardContent className="p-4 flex flex-col gap-3 h-full justify-between">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <h4 className={cn("font-semibold leading-tight",
                                                insight.type === "positive" && "text-green-700 dark:text-green-400",
                                                insight.type === "warning" && "text-amber-700 dark:text-amber-400",
                                                insight.type === "neutral" && "text-blue-700 dark:text-blue-400",
                                            )}>
                                                {t(insight.title)}
                                            </h4>
                                            <p className="text-sm text-balance text-muted-foreground leading-snug">
                                                {t(insight.message || "", insight.messageParams)}
                                            </p>
                                        </div>
                                        <div className={cn("p-2 rounded-full shrink-0",
                                            insight.type === "positive" && "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
                                            insight.type === "warning" && "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
                                            insight.type === "neutral" && "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
                                        )}>
                                            <IconComponent size={20} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    );
                })}
            </div>

            {/* Pagination Dots (Mobile Only) */}
            <div className="flex md:hidden justify-center gap-1.5 pb-2">
                {insights.map((_, index) => (
                    <div
                        key={index}
                        className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            activeIndex === index ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
                        )}
                    />
                ))}
            </div>
        </div>
    );
};
