import { useTranslation } from "react-i18next";
import { RecurringTransaction, Category, Context, Group } from "@/lib/db";
import { getIconComponent } from "@/lib/icons";
import { Tag, Trash2, Edit, Users, Repeat } from "lucide-react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useState } from "react";
import { SyncStatusBadge } from "./SyncStatus";
import { addDays, addWeeks, addMonths, addYears, isAfter, isSameDay, parseISO, format, startOfDay } from "date-fns";

interface MobileRecurringTransactionRowProps {
    transaction: RecurringTransaction;
    category?: Category;
    context?: Context;
    group?: Group;
    onEdit?: (transaction: RecurringTransaction) => void;
    onDelete?: (id: string) => void;
    style?: React.CSSProperties;
}

export function MobileRecurringTransactionRow({
    transaction,
    category,
    context,
    group,
    onEdit,
    onDelete,
    style,
}: MobileRecurringTransactionRowProps) {
    const { t } = useTranslation();
    const IconComp = category?.icon ? getIconComponent(category.icon) : null;
    const x = useMotionValue(0);
    const [, setSwipedState] = useState<"none" | "left" | "right">("none");

    // Background color based on swipe direction
    const background = useTransform(
        x,
        [-100, 0, 100],
        [
            "rgb(239 68 68)", // Red for delete (left)
            "rgb(255 255 255)", // White (center)
            "rgb(59 130 246)", // Blue for edit (right)
        ]
    );

    const handleDragEnd = (_: any, info: PanInfo) => {
        const threshold = 100;
        if (info.offset.x < -threshold && onDelete) {
            // Swiped left - Delete
            onDelete(transaction.id);
            setSwipedState("left");
        } else if (info.offset.x > threshold && onEdit) {
            // Swiped right - Edit
            onEdit(transaction);
            setSwipedState("right");
            setTimeout(() => x.set(0), 300);
        } else {
            // Reset
            setSwipedState("none");
        }
    };

    const getNextOccurrence = (startDateStr: string, frequency: string) => {
        const startDate = parseISO(startDateStr);
        const today = startOfDay(new Date());

        if (isAfter(startDate, today) || isSameDay(startDate, today)) {
            return format(startDate, "yyyy-MM-dd");
        }

        let nextDate = startDate;
        while (isAfter(today, nextDate)) {
            switch (frequency) {
                case "daily":
                    nextDate = addDays(nextDate, 1);
                    break;
                case "weekly":
                    nextDate = addWeeks(nextDate, 1);
                    break;
                case "monthly":
                    nextDate = addMonths(nextDate, 1);
                    break;
                case "yearly":
                    nextDate = addYears(nextDate, 1);
                    break;
                default:
                    return startDateStr;
            }
        }
        return format(nextDate, "yyyy-MM-dd");
    };

    const getTypeTextColor = (type: string) => {
        switch (type) {
            case "expense":
                return "text-red-500";
            case "income":
                return "text-green-500";
            case "investment":
                return "text-blue-500";
            default:
                return "";
        }
    };

    const hasActions = !!onEdit || !!onDelete;

    return (
        <div style={style} className="relative overflow-hidden rounded-lg mb-2">
            {/* Background Actions Layer */}
            {hasActions && (
                <motion.div
                    style={{ backgroundColor: background }}
                    className="absolute inset-0 flex items-center justify-between px-4 rounded-lg"
                >
                    <div className="flex items-center text-white font-medium">
                        <Edit className="h-5 w-5 mr-2" />
                        {t("edit")}
                    </div>
                    <div className="flex items-center text-white font-medium">
                        {t("delete")}
                        <Trash2 className="h-5 w-5 ml-2" />
                    </div>
                </motion.div>
            )}

            {/* Foreground Content Layer */}
            <motion.div
                drag={hasActions ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                style={{ x, touchAction: "pan-y" }}
                className="relative bg-card p-3 rounded-lg border shadow-sm flex items-center gap-3 h-[84px]"
            >
                {/* Icon */}
                <div
                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                    style={{
                        backgroundColor: category?.color
                            ? `${category.color}20`
                            : "#f3f4f6",
                        color: category?.color || "#6b7280",
                    }}
                >
                    {IconComp ? (
                        <IconComp className="h-5 w-5" />
                    ) : (
                        <div className="h-5 w-5 rounded-full bg-muted" />
                    )}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                    <div className="font-medium text-sm truncate">
                        {transaction.description || t("transaction")}
                    </div>

                    {/* Recurrence Info */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Repeat className="h-3 w-3" />
                        <span className="capitalize">{t(transaction.frequency)}</span>
                        <span>•</span>
                        <span>{t("next")}: {getNextOccurrence(transaction.start_date, transaction.frequency)}</span>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="truncate">{category?.name || "-"}</span>
                        {group && (
                            <div className="flex items-center gap-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px]">
                                <Users className="h-3 w-3" />
                                <span className="truncate max-w-[60px]">{group.name}</span>
                            </div>
                        )}
                        {context && (
                            <div className="flex items-center gap-0.5 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">
                                <Tag className="h-3 w-3" />
                                <span className="truncate max-w-[60px]">{context.name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Amount & Status */}
                <div className="text-right shrink-0 flex flex-col items-end justify-center">
                    <div
                        className={`font-bold text-sm ${getTypeTextColor(
                            transaction.type
                        )}`}
                    >
                        {transaction.type === "expense"
                            ? "-"
                            : transaction.type === "investment"
                                ? ""
                                : "+"}
                        €{transaction.amount.toFixed(2)}
                    </div>
                    <div className="mt-1">
                        <SyncStatusBadge isPending={transaction.pendingSync === 1} />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
