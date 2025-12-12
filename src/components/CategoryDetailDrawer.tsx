import { useTranslation } from "react-i18next";
import { Category } from "@/lib/db";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getIconComponent } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Tag, Users, FolderTree, Target, RefreshCw, Cloud, Edit, Trash2 } from "lucide-react";
import { SyncStatusBadge } from "@/components/SyncStatus";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface CategoryBudgetInfo {
  amount: number;
  spent: number;
  percentage: number;
}

interface CategoryDetailDrawerProps {
  category: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetInfo?: CategoryBudgetInfo | null;
  parentCategory?: Category | null;
  childrenCount: number;
  groupName?: string;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
  onSetBudget?: () => void;
}

export function CategoryDetailDrawer({
  category,
  open,
  onOpenChange,
  budgetInfo,
  parentCategory,
  childrenCount,
  groupName,
  onEdit,
  onDelete,
}: CategoryDetailDrawerProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  if (!category) return null;

  const IconComp = category.icon ? getIconComponent(category.icon) : null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "expense":
        return "text-red-500";
      case "income":
        return "text-green-500";
      case "investment":
        return "text-blue-500";
      default:
        return "text-foreground";
    }
  };

  const Content = (
    <div className="mx-auto w-full max-w-sm">
      <div className="text-center pt-8 pb-4">
        <div className="flex justify-center mb-4">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: category.color
                ? `${category.color}20`
                : "#f3f4f6",
              color: category.color || "#6b7280",
            }}
          >
            {IconComp ? (
              <IconComp className="h-8 w-8" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted" />
            )}
          </div>
        </div>
        <div className="text-2xl font-bold truncate px-4">
          {category.name}
        </div>
        <div className="text-lg font-medium mt-1 capitalize">
          <span className={getTypeColor(category.type)}>
            {t(category.type)}
          </span>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6 pb-12">
        {/* Details Grid */}
        <div className="grid gap-4">
          {/* Type */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-muted-foreground">
              <Tag className="h-4 w-4 mr-2" />
              <span className="text-sm">{t("type")}</span>
            </div>
            <span
              className={`text-sm font-medium capitalize ${getTypeColor(
                category.type
              )}`}
            >
              {t(category.type)}
            </span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-muted-foreground">
              <Tag className="h-4 w-4 mr-2" />
              <span className="text-sm">{t("status")}</span>
            </div>
            {category.active === 0 ? (
              <Badge variant="secondary">{t("inactive")}</Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600 bg-green-50 dark:bg-green-950/30"
              >
                {t("active")}
              </Badge>
            )}
          </div>

          {/* Parent Category */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-muted-foreground">
              <FolderTree className="h-4 w-4 mr-2" />
              <span className="text-sm">{t("parent_category")}</span>
            </div>
            <span className="text-sm font-medium">
              {parentCategory ? parentCategory.name : "N/A"}
            </span>
          </div>

          {/* Subcategories */}
          {childrenCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-muted-foreground">
                <FolderTree className="h-4 w-4 mr-2" />
                <span className="text-sm">{t("subcategories")}</span>
              </div>
              <Badge variant="secondary">{childrenCount}</Badge>
            </div>
          )}

          {/* Group */}
          {groupName && (
            <div className="flex items-center justify-between">
              <div className="flex items-center text-muted-foreground">
                <Users className="h-4 w-4 mr-2" />
                <span className="text-sm">{t("group")}</span>
              </div>
              <div className="flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-medium">
                {groupName}
              </div>
            </div>
          )}

          {/* Budget (Expense Only) */}
          {category.type === "expense" && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-muted-foreground">
                  <Target className="h-4 w-4 mr-2" />
                  <span className="text-sm">{t("budget")}</span>
                </div>
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
                        budgetInfo.percentage > 100
                          ? "text-destructive"
                          : ""
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
                </div>
              )}
            </div>
          )}

          {/* Sync Status */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center text-muted-foreground">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="text-sm">{t("status")}</span>
            </div>
            {category.pendingSync === 1 ? (
              <SyncStatusBadge isPending={true} />
            ) : (
              <Badge
                variant="outline"
                className="border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30"
              >
                <Cloud className="mr-1 h-3 w-3" />
                {t("synced")}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Actions Footer - Hidden on mobile since swipe gestures are used */}
      {!isMobile && (
        <div className="pt-4 mt-6 border-t flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onEdit(category);
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
              onDelete(category.id);
              onOpenChange(false);
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("delete")}
          </Button>
        </div>
      )}
    </div>
  );

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("category_details")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("category_details_description")}
            </DialogDescription>
          </DialogHeader>
          {Content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>{t("category_details")}</DrawerTitle>
          <DrawerDescription>
            {t("category_details_description")}
          </DrawerDescription>
        </DrawerHeader>
        {Content}
      </DrawerContent>
    </Drawer>
  );
}
