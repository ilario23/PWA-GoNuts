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
import { Cloud, CloudOff } from "lucide-react";
import { DetailDrawerActions } from "@/components/ui/DetailDrawerActions";
import { GROUP_CHIP_CLASSES } from "@/lib/typeColors";
import {
  DetailHero,
  DetailPills,
  TypePill,
  DetailFacts,
  DetailFact,
  DetailChip,
  DetailMeta,
} from "@/components/ui/DetailDrawerLayout";
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

  const isActive = category.active !== 0;
  const overBudget = budgetInfo ? budgetInfo.percentage > 100 : false;
  const nearBudget = budgetInfo ? budgetInfo.percentage > 80 : false;

  const Content = (
    <div className="mx-auto w-full max-w-sm pb-2">
      <DetailHero
        iconName={category.icon}
        color={category.color}
        title={category.name}
      >
        <DetailPills>
          <TypePill type={category.type} label={t(category.type)} />
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] ${
              isActive
                ? "bg-[hsl(var(--gonuts-good))]/10 text-[hsl(var(--gonuts-good))]"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {isActive ? t("active") : t("inactive")}
          </span>
        </DetailPills>
      </DetailHero>

      <DetailFacts className="mt-1">
        <DetailFact label={t("parent_category")}>
          {parentCategory ? (
            parentCategory.name
          ) : (
            <span className="text-muted-foreground">{t("none") || "—"}</span>
          )}
        </DetailFact>

        {childrenCount > 0 && (
          <DetailFact label={t("subcategories")} valueClassName="num">
            {childrenCount}
          </DetailFact>
        )}

        {groupName && (
          <DetailFact label={t("group")}>
            <DetailChip className={GROUP_CHIP_CLASSES}>{groupName}</DetailChip>
          </DetailFact>
        )}
      </DetailFacts>

      {/* Budget (Expense Only) */}
      {category.type === "expense" && (
        <div className="mx-5 mt-4 rounded-[18px] bg-muted/40 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{t("budget")}</span>
            {budgetInfo && (
              <span
                className={`text-sm font-bold ${
                  overBudget ? "text-[hsl(var(--gonuts-bad))]" : ""
                }`}
              >
                {budgetInfo.percentage.toFixed(0)}%
              </span>
            )}
          </div>

          {budgetInfo ? (
            <div className="mt-2.5 space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${
                    overBudget
                      ? "bg-[hsl(var(--gonuts-bad))]"
                      : nearBudget
                        ? "bg-yellow-500"
                        : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(budgetInfo.percentage, 100)}%` }}
                />
              </div>
              <div className="num text-sm font-medium">
                €{budgetInfo.spent.toFixed(2)}
                <span className="text-muted-foreground">
                  {" "}
                  / €{budgetInfo.amount.toFixed(0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">
              {t("budget_not_set")}
            </div>
          )}
        </div>
      )}

      <DetailMeta>
        {category.pendingSync === 1 ? (
          <>
            <CloudOff className="mr-1.5 h-3.5 w-3.5" />
            {t("pending_sync") || t("status")}
          </>
        ) : (
          <>
            <Cloud className="mr-1.5 h-3.5 w-3.5 text-[hsl(var(--gonuts-good))]" />
            {t("synced")}
          </>
        )}
      </DetailMeta>

      <DetailDrawerActions
        onClose={() => onOpenChange(false)}
        onEdit={() => onEdit(category)}
        onDelete={() => onDelete(category.id)}
      />
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
