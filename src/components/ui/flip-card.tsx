import * as React from "react";
import { motion, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";

type FlipDirection = "top" | "bottom" | "left" | "right";
type SwipeDirection = "left" | "right" | "up" | "down";
type SwipeAxis = "horizontal" | "vertical";

interface FlipCardProps {
  /** Content for the front face */
  frontContent: React.ReactNode;
  /** Content for the back face */
  backContent: React.ReactNode;
  /** Whether the card is flipped */
  isFlipped?: boolean;
  /** Callback when card is clicked (simple flip) */
  onFlip?: () => void;
  /** Callback when card is swiped with direction info */
  onSwipe?: (direction: SwipeDirection) => void;
  /** Custom rotation value in degrees (overrides isFlipped-based calculation) */
  rotation?: number;
  /** Direction of the flip animation - can be changed dynamically */
  flipDirection?: FlipDirection;
  /** Axis for swipe detection: "horizontal" (left/right) or "vertical" (up/down) */
  swipeAxis?: SwipeAxis;
  /** Framer Motion transition configuration */
  transition?: Transition;
  /** Additional classes for the container */
  className?: string;
  /** Additional classes for front face */
  frontClassName?: string;
  /** Additional classes for back face */
  backClassName?: string;
  /** Whether the card is interactive */
  disabled?: boolean;
  /** Disable click on entire card - flip must be triggered externally via onFlip */
  disableGlobalClick?: boolean;
}

const directionConfig: Record<
  FlipDirection,
  { axis: "rotateX" | "rotateY"; direction: number }
> = {
  top: { axis: "rotateX", direction: 1 },
  bottom: { axis: "rotateX", direction: -1 },
  left: { axis: "rotateY", direction: -1 },
  right: { axis: "rotateY", direction: 1 },
};

const FlipCard = React.forwardRef<HTMLDivElement, FlipCardProps>(
  (
    {
      frontContent,
      backContent,
      isFlipped = false,
      onFlip,
      onSwipe,
      rotation,
      flipDirection = "right",
      swipeAxis = "horizontal",
      transition = { type: "spring", stiffness: 260, damping: 20 },
      className,
      frontClassName,
      backClassName,
      disabled = false,
      disableGlobalClick = false,
    },
    ref
  ) => {
    const { axis, direction: dir } = directionConfig[flipDirection];
    const finalRotation = rotation !== undefined ? rotation : (isFlipped ? dir * 180 : 0);
    const isClickable = !disabled && !disableGlobalClick;

    // Swipe handling with direction detection
    const handlePanEnd = (
      _event: MouseEvent | TouchEvent | PointerEvent,
      info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
    ) => {
      const swipeThreshold = 50;

      if (swipeAxis === "vertical") {
        // Vertical swipe detection: only flip if vertical movement is greater than horizontal
        if (
          Math.abs(info.offset.y) > Math.abs(info.offset.x) &&
          Math.abs(info.offset.y) > swipeThreshold
        ) {
          // Determine swipe direction: negative y = swipe up, positive y = swipe down
          const swipeDir: SwipeDirection = info.offset.y < 0 ? "up" : "down";

          if (onSwipe) {
            onSwipe(swipeDir);
          } else if (onFlip) {
            onFlip();
          }
        }
      } else {
        // Horizontal swipe detection (default): only flip if horizontal movement is greater than vertical
        if (
          Math.abs(info.offset.x) > Math.abs(info.offset.y) &&
          Math.abs(info.offset.x) > swipeThreshold
        ) {
          // Determine swipe direction: negative x = swipe left, positive x = swipe right
          const swipeDir: SwipeDirection = info.offset.x < 0 ? "left" : "right";

          if (onSwipe) {
            onSwipe(swipeDir);
          } else if (onFlip) {
            onFlip();
          }
        }
      }
    };

    // Touch action based on swipe axis
    // For horizontal swipes: allow vertical scrolling (pan-y)
    // For vertical swipes: allow horizontal scrolling (pan-x)
    const touchAction = swipeAxis === "vertical" ? "pan-x" : "pan-y";

    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative select-none",
          isClickable && "cursor-pointer",
          disabled && "pointer-events-none",
          className
        )}
        onClick={isClickable ? onFlip : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onFlip?.();
              }
            }
            : undefined
        }
        tabIndex={isClickable ? 0 : -1}
        role={isClickable ? "button" : undefined}
        aria-pressed={isClickable ? isFlipped : undefined}
        style={{
          perspective: 1000,
          transformStyle: "preserve-3d",
          touchAction, // Allow scrolling on the perpendicular axis, capture swipes on the configured axis
        }}
        whileTap={isClickable ? { scale: 0.98 } : undefined}
        onPanEnd={handlePanEnd}
      >
        {/* Front Face */}
        <motion.div
          className={cn("w-full h-full", frontClassName)}
          initial={false}
          animate={{
            [axis]: finalRotation,
            opacity: isFlipped ? 0 : 1,
          }}
          transition={transition}
          style={{
            backfaceVisibility: "hidden",
            transformStyle: "preserve-3d",
            pointerEvents: isFlipped ? "none" : "auto",
          }}
        >
          {frontContent}
        </motion.div>

        {/* Back Face */}
        <motion.div
          className={cn("absolute inset-0 w-full h-full", backClassName)}
          initial={false}
          animate={{
            [axis]: finalRotation + dir * 180,
            opacity: isFlipped ? 1 : 0,
          }}
          transition={transition}
          style={{
            backfaceVisibility: "hidden",
            transformStyle: "preserve-3d",
            pointerEvents: isFlipped ? "auto" : "none",
          }}
        >
          {backContent}
        </motion.div>
      </motion.div>
    );
  }
);

FlipCard.displayName = "FlipCard";

export { FlipCard };
export type { FlipCardProps, FlipDirection, SwipeDirection, SwipeAxis };
