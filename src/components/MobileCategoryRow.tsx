import { useTranslation } from "react-i18next";
import { Category } from "@/lib/db";
import { getIconComponent } from "@/lib/icons";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { SwipeableItem } from "@/components/ui/SwipeableItem";

interface MobileCategoryRowProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onClick?: (category: Category) => void;
  style?: React.CSSProperties;
  className?: string; // Allow custom classes
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
  className,
  childCount,
  budgetAmount,
  isExpanded,
  onToggleExpand,
  groupName,
}: MobileCategoryRowProps) {
  const { t } = useTranslation();
  const IconComp = category.icon ? getIconComponent(category.icon) : null;
  const isInactive = category.active === 0;

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
    <SwipeableItem
      onEdit={() => onEdit(category)}
      onDelete={() => onDelete(category.id)}
      onClick={onClick ? () => onClick(category) : undefined}
      style={style}
      className={className}
    >
      <div
        className={`relative bg-card p-3 rounded-lg border shadow-sm flex items-center gap-3 h-[72px] cursor-pointer ${isInactive ? "opacity-60" : ""
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
                {onToggleExpand ? (
                  <div
                    className="flex items-center gap-0.5 shrink-0 cursor-pointer p-1 -m-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand();
                    }}
                  >
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {childCount}
                    </Badge>
                    <motion.div
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </motion.div>
                  </div>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                  >
                    {childCount}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Side: Type/Budget Info */}
        <div className="shrink-0 flex items-center gap-3">
          <div className="flex flex-col items-end gap-0.5">
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
                {budgetAmount} / {t("month_short")}
              </div>
            )}
          </div>
        </div>
      </div>
    </SwipeableItem>
  );
}
