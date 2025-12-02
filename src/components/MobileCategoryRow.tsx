import { useTranslation } from "react-i18next";
import { Category } from "@/lib/db";
import { getIconComponent } from "@/lib/icons";
import { Edit, Trash2, ChevronRight } from "lucide-react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface MobileCategoryRowProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onClick?: (category: Category) => void;
  style?: React.CSSProperties;
  childCount?: number;
  budgetAmount?: number; // Monthly budget limit for expense categories
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  groupName?: string; // Name of the group (if group category)
}

export function MobileCategoryRow({
  category,
  onEdit,
  onDelete,
  onClick,
  style,
  childCount,
  budgetAmount,
  isExpanded,
  onToggleExpand,
  groupName,
}: MobileCategoryRowProps) {
  const { t } = useTranslation();
  const IconComp = category.icon ? getIconComponent(category.icon) : null;
  const x = useMotionValue(0);
  const isInactive = category.active === 0;

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
    const threshold = 220; // Increased from 80 to require more deliberate swipe
    if (info.offset.x < -threshold) {
      // Swiped left - Delete
      onDelete(category.id);
    } else if (info.offset.x > threshold) {
      // Swiped right - Edit
      onEdit(category);
      // Reset position after a delay
      setTimeout(() => x.set(0), 300);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "expense":
        return "text-red-500 bg-red-500/10";
      case "income":
        return "text-green-500 bg-green-500/10";
      case "investment":
        return "text-blue-500 bg-blue-500/10";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  return (
    <div style={style} className="relative overflow-hidden rounded-lg mb-2">
      {/* Background Actions Layer */}
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

      {/* Foreground Content Layer */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        onClick={() => {
          // Only handle expand/collapse if there are children and user clicked (not dragged)
          if (x.get() !== 0) return; // Don't click if dragging

          if (onClick) {
            onClick(category);
          }
        }}
        style={{
          x,
          touchAction: "pan-y",
          cursor: "pointer",
        }}
        className={`relative bg-card p-3 rounded-lg border shadow-sm flex items-center gap-3 h-[72px] ${isInactive ? "opacity-60" : ""
          }`}
      >
        {/* Icon */}
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            backgroundColor: category.color ? `${category.color}20` : "#f3f4f6",
            color: category.color || "#6b7280",
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
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm truncate">{category.name}</div>
            {groupName && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-primary/50 text-primary shrink-0"
              >
                {groupName}
              </Badge>
            )}
            {childCount !== undefined && childCount > 0 && (
              <>
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                >
                  {childCount}
                </Badge>
                {onToggleExpand && (
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand();
                    }}
                  >
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </motion.div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Type Badge and Budget */}
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          <div
            className={`text-[10px] px-2 py-1 rounded-full uppercase font-medium tracking-wider ${getTypeColor(
              category.type
            )}`}
          >
            {t(category.type)}
          </div>
          {isInactive && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
              {t("inactive") || "Inactive"}
            </Badge>
          )}
          {!isInactive && budgetAmount && budgetAmount > 0 && (
            <div className="text-[10px] text-muted-foreground font-medium">
              €{budgetAmount.toFixed(0)}/mese
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
