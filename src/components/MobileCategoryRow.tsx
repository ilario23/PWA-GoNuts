import { useTranslation } from "react-i18next";
import { Category } from "@/lib/db";
import { getIconComponent } from "@/lib/icons";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { createElement } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MobileCategoryRowProps {
  category: Category;
  onClick?: (category: Category) => void;
  style?: React.CSSProperties;
  className?: string; // Allow custom classes
  childCount?: number;
  budget?: {
    amount: number;
    spent: number;
    percentage: number;
    period: "monthly" | "yearly";
  } | null;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  groupName?: string; // Name of the group (if group category)
  /** Hide the top hairline ruler (first line in a ledger section). */
  isFirst?: boolean;
}

export function MobileCategoryRow({
  category,
  onClick,
  style,
  className,
  childCount,
  budget,
  isExpanded,
  onToggleExpand,
  groupName,
  isFirst,
}: MobileCategoryRowProps) {
  const { t } = useTranslation();
  const IconComp = category.icon ? getIconComponent(category.icon) : null;
  const isInactive = category.active === 0;
  const hasChildren = childCount !== undefined && childCount > 0;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-[hsl(var(--gonuts-bad))]";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-[hsl(var(--gonuts-good))]";
  };

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? () => onClick(category) : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(category);
              }
            }
          : undefined
      }
      style={style}
      className={cn(
        "group relative flex flex-col justify-center gap-1.5 px-2.5 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 hover:bg-muted/50 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        !isFirst &&
          "before:absolute before:inset-x-2.5 before:top-0 before:h-px before:bg-border/45",
        isInactive && "opacity-55",
        className
      )}
    >
      <div className="flex items-center gap-3 min-h-[44px]">
        {/* Category icon */}
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 ring-1 ring-inset ring-foreground/[0.05] transition-transform duration-150 ease-out group-active:scale-95"
          style={{
            backgroundColor: category.color ? `${category.color}1f` : "hsl(var(--muted))",
            color: category.color || "hsl(var(--muted-foreground))",
          }}
          aria-hidden="true"
        >
          {IconComp ? (
            createElement(IconComp, { className: "h-[18px] w-[18px]" })
          ) : (
            <div className="h-[18px] w-[18px] rounded-full bg-muted-foreground/30" />
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-[15px] leading-tight truncate">
              {category.name}
            </span>
            {groupName && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-primary/40 text-primary shrink-0"
              >
                {groupName}
              </Badge>
            )}
            {isInactive && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                {t("inactive") || "Inactive"}
              </Badge>
            )}
          </div>
          {!isInactive && budget && (
            <div className="num mt-0.5 text-[12px] tabular-nums text-muted-foreground flex items-center gap-1">
              <span className="font-semibold text-foreground/80">
                €{budget.spent.toFixed(2)}
              </span>
              <span className="text-muted-foreground/70">/ €{budget.amount.toFixed(0)}</span>
              <span
                className={
                  budget.percentage >= 100
                    ? "text-[hsl(var(--gonuts-bad))] font-bold"
                    : "text-muted-foreground"
                }
              >
                · {budget.percentage.toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {/* Trailing: child count + chevron */}
        {hasChildren && (
          <div
            className="flex items-center justify-end gap-1 shrink-0 -mr-1 pl-3 pr-1 min-h-[44px] min-w-[44px] cursor-pointer rounded-lg hover:bg-foreground/[0.04]"
            onClick={
              onToggleExpand
                ? (e) => {
                    e.stopPropagation();
                    onToggleExpand();
                  }
                : undefined
            }
            role={onToggleExpand ? "button" : undefined}
            aria-label={onToggleExpand ? t("expand") || "Expand" : undefined}
            aria-expanded={onToggleExpand ? isExpanded : undefined}
          >
            <Badge
              variant="secondary"
              className="num text-[10px] px-1.5 py-0 h-[18px] tabular-nums font-bold"
            >
              {childCount}
            </Badge>
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
            >
              <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
            </motion.div>
          </div>
        )}
      </div>

      {/* Budget progress */}
      {!isInactive && budget && (
        <Progress
          value={Math.min(budget.percentage, 100)}
          className="h-1 ml-[52px]"
          indicatorClassName={getProgressColor(budget.percentage)}
        />
      )}
    </div>
  );
}
