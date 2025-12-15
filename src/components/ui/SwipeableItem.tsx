import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

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
}

export function SwipeableItem({
    children,
    onEdit,
    onDelete,
    onClick,
    className,
    threshold = 220,
    editLabel,
    deleteLabel,
    style,
    enabled = true,
}: SwipeableItemProps) {
    const { t } = useTranslation();
    const x = useMotionValue(0);
    const [, setSwipedState] = useState<"none" | "left" | "right">("none");

    // Background color based on swipe direction
    const background = useTransform(
        x,
        [-100, 0, 100],
        [
            "rgb(239 68 68)", // Red for delete (left)
            "rgba(0, 0, 0, 0)", // Transparent (center) - adapts to light/dark mode
            "rgb(59 130 246)", // Blue for edit (right)
        ]
    );

    const handleDragEnd = (_: any, info: PanInfo) => {
        if (!enabled) return;
        // If we only have one action, we prevent swiping in the other direction by checking velocity/direction
        // but framer-motion dragConstraints handles the physics, we just handle the trigger here.

        // However, if onEdit is missing, we shouldn't trigger edit, and ideally shouldn't allow swipe right.
        // The drag prop 'x' allows bidirectional. We can restrict it?
        // Let's rely on the check inside handleDragEnd for now and maybe restrict drag prop if needed.

        if (info.offset.x < -threshold && onDelete) {
            // Swiped left - Delete
            onDelete();
            setSwipedState("left");
        } else if (info.offset.x > threshold && onEdit) {
            // Swiped right - Edit
            onEdit();
            setSwipedState("right");
            // Reset position after a delay if it was just an edit trigger (edit usually opens a dialog)
            setTimeout(() => x.set(0), 300);
        } else {
            // Reset
            setSwipedState("none");
        }
    };

    const hasActions = enabled && (!!onEdit || !!onDelete);

    // We can also allow drag but just not trigger action. 
    // But a better UX is to not allow dragging in the direction if no action exists.
    // framer-motion `dragConstraints` with `dragElastic` still allows pulling.
    // To completely disable one direction is harder with just `drag="x"`.
    // We will trust the user to swipe correctly and just not trigger if no handler.

    return (
        <div
            className={cn("relative overflow-hidden rounded-lg mb-2", className)}
            style={style}
        >
            {/* Background Actions Layer */}
            {hasActions && (
                <motion.div
                    style={{ backgroundColor: background }}
                    className="absolute inset-0 flex items-center justify-between px-4 rounded-lg"
                >
                    <div className="flex items-center text-white font-medium">
                        {onEdit && (
                            <motion.div
                                style={{ scale: useTransform(x, [50, threshold], [0.8, 1.2]) }}
                                className="flex items-center"
                            >
                                <Edit className="h-5 w-5 mr-2" />
                                {editLabel || t("edit")}
                            </motion.div>
                        )}
                    </div>
                    <div className="flex items-center text-white font-medium">
                        {onDelete && (
                            <motion.div
                                style={{ scale: useTransform(x, [-50, -threshold], [0.8, 1.2]) }}
                                className="flex items-center"
                            >
                                {deleteLabel || t("delete")}
                                <Trash2 className="h-5 w-5 ml-2" />
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Foreground Content Layer */}
            <motion.div
                drag={hasActions ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                onClick={() => {
                    // Only trigger click if not swiping
                    if (x.get() === 0 && onClick) {
                        onClick();
                    }
                }}
                whileTap={{ scale: 0.98 }}
                style={{ x, touchAction: "pan-y" }}
                className="relative h-full"
            >
                {children}
            </motion.div>
        </div>
    );
}
