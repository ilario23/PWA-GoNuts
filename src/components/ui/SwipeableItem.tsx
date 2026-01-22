import { motion, useMotionValue, useTransform, PanInfo, useAnimation } from "framer-motion";
import { Edit, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface SwipeAction {
    key: string;
    label?: string;
    icon?: React.ReactNode;
    onClick: () => void;
    color: string; // Tailwind bg class or hex
    textColor?: string;
}

interface SwipeableItemProps {
    children: React.ReactNode;
    onEdit?: () => void;
    onDelete?: () => void;
    onClick?: () => void;
    className?: string;
    threshold?: number;
    editLabel?: string;
    deleteLabel?: string;
    style?: React.CSSProperties;
    enabled?: boolean;
    leftActions?: SwipeAction[]; // Actions revealed when swiping right (appear on left)
    rightActions?: SwipeAction[]; // Actions revealed when swiping left (appear on right)
}

export function SwipeableItem({
    children,
    onEdit,
    onDelete,
    onClick,
    className,
    threshold = 100, // Reduced default threshold for reveal
    editLabel,
    deleteLabel,
    style,
    enabled = true,
    leftActions,
    rightActions,
}: SwipeableItemProps) {
    const { t } = useTranslation();
    const x = useMotionValue(0);
    const controls = useAnimation();

    // Dimensions
    const ACTION_WIDTH = 70;
    const leftActionsWidth = (leftActions?.length || 0) * ACTION_WIDTH;
    const rightActionsWidth = (rightActions?.length || 0) * ACTION_WIDTH;

    // Legacy behavior support
    const isLegacy = !leftActions && !rightActions;
    const effectiveThreshold = isLegacy ? (threshold || 220) : 60;

    // Background color based on swipe direction (Legacy)
    const legacyBackground = useTransform(
        x,
        [-100, 0, 100],
        [
            "rgb(239 68 68)", // Red for delete (left)
            "rgba(0, 0, 0, 0)", // Transparent
            "rgb(59 130 246)", // Blue for edit (right)
        ]
    );

    const handleDragEnd = async (_: unknown, info: PanInfo) => {
        if (!enabled) return;
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        // Legacy "Swipe to Trigger" Behavior
        if (isLegacy) {
            if (offset < -effectiveThreshold && onDelete) {
                onDelete();
            } else if (offset > effectiveThreshold && onEdit) {
                onEdit();
                setTimeout(() => controls.start({ x: 0 }), 300);
                return;
            }
            controls.start({ x: 0 });
            return;
        }

        // New "Swipe to Reveal" Behavior with Stepped Snapping

        // Swipe Right (reveal Left Actions)
        if (leftActions && offset > 0) {
            // Find closest snap point
            // Snap points are multiples of ACTION_WIDTH (e.g., 70, 140, 210)
            const count = leftActions.length;
            let targetWidth = 0;

            // Heuristic for snapping:
            // Calculate which "slot" the user dragged to.
            // A "slot" is ACTION_WIDTH wide.
            // We favor opening more if velocity is high.

            const projectedOffset = offset + velocity * 0.2; // Use projection for better feel
            const slotIndex = Math.min(Math.round(projectedOffset / ACTION_WIDTH), count);

            if (slotIndex > 0) {
                targetWidth = slotIndex * ACTION_WIDTH;
            }

            await controls.start({ x: targetWidth });
        }
        // Swipe Left (reveal Right Actions)
        else if (rightActions && offset < 0) {
            // For now, keep simple behavior for right actions (Delete) or implement similar logic?
            // Since rightActions usually has only one item (Delete), simple threshold is fine.
            // But let's be consistent just in case.

            const count = rightActions.length;
            let targetWidth = 0;
            const projectedOffset = Math.abs(offset) - velocity * 0.2; // Velocity is negative when swiping left
            const slotIndex = Math.min(Math.round(projectedOffset / ACTION_WIDTH), count);

            if (slotIndex > 0) {
                targetWidth = -slotIndex * ACTION_WIDTH;
            }

            await controls.start({ x: targetWidth });
        }
        // Close
        else {
            await controls.start({ x: 0 });
        }
    };

    const handleActionClick = (action: SwipeAction) => {
        action.onClick();
        controls.start({ x: 0 });
    };

    const hasActions = enabled && (!!onEdit || !!onDelete || !!leftActions || !!rightActions);

    const actionsOpacity = useTransform(x, [-10, -5, 5, 10], [1, 0, 0, 1]);

    return (
        <div
            className={cn("relative overflow-hidden rounded-lg mb-2", className)}
            style={style}
        >
            {/* Background Layer */}
            <motion.div
                style={{ opacity: actionsOpacity }}
                className="absolute inset-0 pointer-events-none"
            >
                {/* Left Actions (Revealed by swiping Right) */}
                <div className="absolute inset-y-0 left-0 flex items-center h-full">
                    {leftActions ? (
                        <>
                            {leftActions.map((action) => (
                                <div
                                    key={action.key}
                                    className={cn(
                                        "h-full flex flex-col items-center justify-center cursor-pointer pointer-events-auto",
                                        action.color
                                    )}
                                    style={{ width: ACTION_WIDTH, backgroundColor: action.color }}
                                    onClick={() => handleActionClick(action)}
                                >
                                    <div className={cn("text-white", action.textColor)}>
                                        {action.icon}
                                    </div>
                                    {action.label && (
                                        <span className={cn("text-[10px] font-medium text-white mt-1", action.textColor)}>
                                            {action.label}
                                        </span>
                                    )}
                                </div>
                            ))}
                            {/* Extension to cover rounded corners */}
                            {leftActions.length > 0 && (
                                <div
                                    className={leftActions[leftActions.length - 1].color}
                                    style={{
                                        width: 20, // Enough to cover corner radius
                                        height: '100%',
                                        backgroundColor: leftActions[leftActions.length - 1].color
                                    }}
                                />
                            )}
                        </>
                    ) : isLegacy && onEdit ? (
                        <motion.div
                            style={{ backgroundColor: legacyBackground }}
                            className="absolute inset-0 flex items-center justify-start px-4 w-screen"
                        >
                            <div className="flex items-center text-white font-medium">
                                <Edit className="h-5 w-5 mr-2" />
                                {editLabel || t("edit")}
                            </div>
                        </motion.div>
                    ) : null}
                </div>

                {/* Right Actions (Revealed by swiping Left) */}
                <div className="absolute inset-y-0 right-0 flex items-center h-full">
                    {rightActions ? (
                        <>
                            {/* Extension to cover rounded corners */}
                            {rightActions.length > 0 && (
                                <div
                                    className={rightActions[0].color}
                                    style={{
                                        width: 20,
                                        height: '100%',
                                        backgroundColor: rightActions[0].color
                                    }}
                                />
                            )}
                            {rightActions.map((action) => (
                                <div
                                    key={action.key}
                                    className={cn(
                                        "h-full flex flex-col items-center justify-center cursor-pointer pointer-events-auto",
                                        action.color
                                    )}
                                    style={{ width: ACTION_WIDTH, backgroundColor: action.color }}
                                    onClick={() => handleActionClick(action)}
                                >
                                    <div className={cn("text-white", action.textColor)}>
                                        {action.icon}
                                    </div>
                                    {action.label && (
                                        <span className={cn("text-[10px] font-medium text-white mt-1", action.textColor)}>
                                            {action.label}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </>
                    ) : isLegacy && onDelete ? (
                        <motion.div
                            style={{ backgroundColor: legacyBackground }}
                            className="absolute inset-0 flex items-center justify-end px-4 w-screen right-0"
                            initial={{ x: 0 }}
                        >
                            <div className="flex items-center text-white font-medium">
                                {deleteLabel || t("delete")}
                                <Trash2 className="h-5 w-5 ml-2" />
                            </div>
                        </motion.div>
                    ) : null}
                </div>
            </motion.div>

            {/* Foreground Content Layer */}
            <motion.div
                drag={hasActions ? "x" : false}
                dragConstraints={{
                    left: rightActions ? -rightActionsWidth : (isLegacy && onDelete ? -1000 : 0),
                    right: leftActions ? leftActionsWidth : (isLegacy && onEdit ? 1000 : 0)
                }}
                dragElastic={0.1} // Reduced elastic for stickier feel
                onDragEnd={handleDragEnd}
                animate={controls}
                style={{ x, touchAction: "pan-y" }}
                onClick={() => {
                    if (x.get() === 0 && onClick) onClick();
                    else controls.start({ x: 0 }); // Close if open
                }}
                whileTap={{ scale: 0.98 }}
                className="relative h-full z-10" // Removed bg-background to allow under-corner color extension to show
                data-testid="swipeable-row-content"
            >
                {children}
            </motion.div>
        </div>
    );
}
