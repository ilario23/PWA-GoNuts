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
import {
  DetailHeader,
  DetailEyebrow,
  DetailIcon,
  DetailHeadline,
  TypePill,
  StatePill,
  DetailGrid,
  DetailCell,
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
      <DetailHeader>
        <DetailEyebrow>
          <DetailIcon iconName={category.icon} color={category.color} />
          <TypePill type={category.type} label={t(category.type)} />
          <StatePill
            active={isActive}
            activeLabel={t("active")}
            inactiveLabel={t("inactive")}
          />
        </DetailEyebrow>

        <DetailHeadline>{category.name}</DetailHeadline>
      </DetailHeader>

      <DetailGrid>
        <DetailCell label={t("parent_category")}>
          {parentCategory ? (
            parentCategory.name
          ) : (
            <span className="text-muted-foreground">{t("none") || "—"}</span>
          )}
        </DetailCell>

        {childrenCount > 0 && (
          <DetailCell label={t("subcategories")} mono>
            {childrenCount}
          </DetailCell>
        )}

        {groupName && (
          <DetailCell
            label={t("group")}
            valueClassName="text-[hsl(var(--color-investment))]"
          >
            {groupName}
          </DetailCell>
        )}

        {/* Budget (Expense Only) */}
        {category.type === "expense" && (
          <DetailCell label={t("budget")} wide>
            {budgetInfo ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="num text-[15px] font-medium">
                    €{budgetInfo.spent.toFixed(2)}
                    <span className="text-muted-foreground">
                      {" "}
                      / €{budgetInfo.amount.toFixed(0)}
                    </span>
                  </span>
                  <span
                    className={`num text-[13px] font-bold ${
                      overBudget ? "text-[hsl(var(--gonuts-bad))]" : "text-muted-foreground"
                    }`}
                  >
                    {budgetInfo.percentage.toFixed(0)}%
                  </span>
                </div>
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
              </div>
            ) : (
              <span className="font-normal text-muted-foreground">
                {t("budget_not_set")}
              </span>
            )}
          </DetailCell>
        )}
      </DetailGrid>

      <DetailMeta>
        {category.pendingSync === 1 ? (
          <>
            <CloudOff className="h-3.5 w-3.5" />
            {t("pending_sync") || t("status")}
          </>
        ) : (
          <>
            <Cloud className="h-3.5 w-3.5 text-[hsl(var(--gonuts-good))]" />
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
