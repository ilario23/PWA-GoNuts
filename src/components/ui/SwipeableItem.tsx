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
    threshold = 80, // Reduced from 220 for easier triggering
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

    const editScale = useTransform(x, [50, threshold], [0.8, 1.2]);
    const deleteScale = useTransform(x, [-50, -threshold], [0.8, 1.2]);

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        if (!enabled) return;

        if (info.offset.x < -threshold && onDelete) {
            // Swiped left - Delete
            onDelete();
            setSwipedState("left");
        } else if (info.offset.x > threshold && onEdit) {
            // Swiped right - Edit
            onEdit();
            setSwipedState("right");
            setTimeout(() => x.set(0), 300);
        } else {
            // Reset
            setSwipedState("none");
        }
    };

    const hasActions = enabled && (!!onEdit || !!onDelete);

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
                                style={{ scale: editScale }}
                                className="flex items-center"
                                data-testid="swipe-action-edit"
                            >
                                <Edit className="h-5 w-5 mr-2" />
                                {editLabel || t("edit")}
                            </motion.div>
                        )}
                    </div>
                    <div className="flex items-center text-white font-medium">
                        {onDelete && (
                            <motion.div
                                style={{ scale: deleteScale }}
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
                dragConstraints={{ left: onDelete ? -1000 : 0, right: onEdit ? 1000 : 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                onClick={() => {
                    if (x.get() === 0 && onClick) {
                        onClick();
                    }
                }}
                whileTap={{ scale: 0.98 }}
                style={{ x, touchAction: "pan-y" }}
                className="relative h-full"
                data-testid="swipeable-row-content"
            >
                {children}
            </motion.div>
        </div>
    );
}
