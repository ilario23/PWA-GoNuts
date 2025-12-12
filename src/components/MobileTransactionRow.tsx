import { useTranslation } from "react-i18next";
import { Transaction, Category, Context, Group } from "@/lib/db";
import { getIconComponent } from "@/lib/icons";
import { Tag, Trash2, Edit, Users, AlertCircle } from "lucide-react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useState } from "react";
import { SyncStatusBadge } from "./SyncStatus";
import { UNCATEGORIZED_CATEGORY } from "@/lib/constants";

interface MobileTransactionRowProps {
  transaction: Transaction;
  category?: Category;
  context?: Context;
  group?: Group;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onClick?: () => void;
  isVirtual?: boolean;
  style?: React.CSSProperties;
  hideContext?: boolean;
  personalAmount?: number;
  isGroupShare?: boolean;
}

export function MobileTransactionRow({
  transaction,
  category,
  context,
  group,
  onEdit,
  onDelete,
  onClick,
  style,
  hideContext,
  personalAmount,
  isGroupShare,
}: MobileTransactionRowProps) {
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
    const threshold = 220;
    if (info.offset.x < -threshold && onDelete) {
      // Swiped left - Delete
      onDelete(transaction.id);
      setSwipedState("left");
    } else if (info.offset.x > threshold && onEdit) {
      // Swiped right - Edit
      onEdit(transaction);
      setSwipedState("right");
      // Reset position after a delay if it was just an edit trigger
      setTimeout(() => x.set(0), 300);
    } else {
      // Reset
      setSwipedState("none");
    }
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
          <motion.div
            style={{ scale: useTransform(x, [50, 220], [0.8, 1.2]) }}
            className="flex items-center text-white font-medium"
          >
            <Edit className="h-5 w-5 mr-2" />
            {t("edit")}
          </motion.div>
          <motion.div
            style={{ scale: useTransform(x, [-50, -220], [0.8, 1.2]) }}
            className="flex items-center text-white font-medium"
          >
            {t("delete")}
            <Trash2 className="h-5 w-5 ml-2" />
          </motion.div>
        </motion.div>
      )}

      {/* Foreground Content Layer */}
      <motion.div
        drag={hasActions ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
        style={{ x, touchAction: "pan-y" }} // Important for vertical scrolling
        className="relative bg-card p-3 rounded-lg border shadow-sm flex items-center gap-3 h-[72px]"
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
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="font-medium text-sm truncate flex items-center gap-1">
            {transaction.description || t("transaction")}
            {transaction.category_id === UNCATEGORIZED_CATEGORY.ID && (
              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
            )}
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span className={`truncate ${!category && transaction.category_id === UNCATEGORIZED_CATEGORY.ID ? "text-amber-500" : ""}`}>
              {category?.name || (transaction.category_id === UNCATEGORIZED_CATEGORY.ID ? (t("needs_review") || "Needs Review") : "-")}
            </span>
            {(group || (context && !hideContext)) && (
              <div className="flex items-center gap-1 flex-wrap">
                {group && (
                  <div className="flex items-center gap-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px]">
                    <Users className="h-3 w-3" />
                    <span className="truncate max-w-[80px]">{group.name}</span>
                  </div>
                )}
                {context && !hideContext && (
                  <div className="flex items-center gap-0.5 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">
                    <Tag className="h-3 w-3" />
                    <span className="truncate max-w-[80px]">{context.name}</span>
                  </div>
                )}
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
            €{(personalAmount ?? transaction.amount).toFixed(2)}
          </div>
          {isGroupShare && (
            <div className="text-[10px] text-muted-foreground">
              {t("your_share")}
            </div>
          )}
          <div className="mt-1">
            <SyncStatusBadge isPending={transaction.pendingSync === 1} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
