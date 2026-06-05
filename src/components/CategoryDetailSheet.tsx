import { useTranslation } from "react-i18next";
import { useMobile } from "@/hooks/useMobile";
import { Category } from "@/lib/db";
import { getIconComponent } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Edit, Trash2, Target, FolderTree } from "lucide-react";
import { createElement } from "react";

interface CategoryBudgetInfo {
  amount: number;
  spent: number;
  percentage: number;
}

interface CategoryDetailSheetProps {
  category: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetInfo?: CategoryBudgetInfo | null;
  parentCategory?: Category | null;
  childrenCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onSetBudget: () => void;
}

/**
 * Responsive component that shows category details.
 * Renders as Sheet (bottom drawer) on mobile, Dialog on desktop.
 */
export function CategoryDetailSheet({
  category,
  open,
  onOpenChange,
  budgetInfo,
  parentCategory,
  childrenCount,
  onEdit,
  onDelete,
  onSetBudget,
}: CategoryDetailSheetProps) {
  const { t } = useTranslation();
  const isMobile = useMobile();

  if (!category) return null;

  const IconComp = category.icon ? getIconComponent(category.icon) : null;

  const content = (
    <div className="space-y-6">
      {/* Header with icon and name */}
      <div className="flex items-center gap-4">
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: category.color }}
        >
          {IconComp && createElement(IconComp, { className: "h-7 w-7" })}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold truncate">{category.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {t(category.type)}
          </p>
        </div>
      </div>

      <Separator />

      {/* Details section */}
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("status")}</span>
          {category.active === 0 ? (
            <Badge variant="secondary">{t("inactive")}</Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-gonuts-good border-gonuts-good"
            >
              {t("active")}
            </Badge>
          )}
        </div>

        {/* Parent category */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t("parent_category")}
          </span>
          <span className="text-sm font-medium">
            {parentCategory
              ? parentCategory.name
              : t("root_category") || "Root"}
          </span>
        </div>

        {/* Subcategories count */}
        {childrenCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              {t("subcategories") || "Subcategories"}
            </span>
            <Badge variant="secondary">{childrenCount}</Badge>
          </div>
        )}

        {/* Budget section (only for expense categories) */}
        {category.type === "expense" && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {t("budget")}
                </span>
                {budgetInfo ? (
                  <span className="text-sm font-medium">
                    €{budgetInfo.amount.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t("budget_not_set")}
                  </span>
                )}
              </div>

              {budgetInfo && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      €{budgetInfo.spent.toFixed(2)} {t("used")}
                    </span>
                    <span
                      className={
                        budgetInfo.percentage > 100 ? "text-destructive" : ""
                      }
                    >
                      {budgetInfo.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${budgetInfo.percentage > 100
                        ? "bg-destructive"
                        : budgetInfo.percentage > 80
                          ? "bg-yellow-500"
                          : "bg-primary"
                        }`}
                      style={{
                        width: `${Math.min(budgetInfo.percentage, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    €{(budgetInfo.amount - budgetInfo.spent).toFixed(2)}{" "}
                    {t("remaining_label")}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  onSetBudget();
                  onOpenChange(false);
                }}
              >
                <Target className="h-4 w-4 mr-2" />
                {budgetInfo ? t("edit") + " " + t("budget") : t("set_budget")}
              </Button>
            </div>
          </>
        )}
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            onEdit();
            onOpenChange(false);
          }}
        >
          <Edit className="h-4 w-4 mr-2" />
          {t("edit")}
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={() => {
            onDelete();
            onOpenChange(false);
          }}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t("delete")}
        </Button>
      </div>
    </div>
  );

  // Mobile: Sheet from bottom
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-auto max-h-[85vh] rounded-t-xl"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{category.name}</SheetTitle>
            <SheetDescription>
              {t("category")} {t("details") || "details"}
            </SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>{category.name}</DialogTitle>
          <DialogDescription>
            {t("category")} {t("details") || "details"}
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
