import { useTranslation } from "react-i18next";
import { RecurringTransaction, Category, Context, Group } from "@/lib/db";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  format,
  parseISO,
  startOfDay,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isAfter,
  isSameDay,
} from "date-fns";
import { it, enUS } from "date-fns/locale";
import { Cloud, CloudOff } from "lucide-react";
import { DetailDrawerActions } from "@/components/ui/DetailDrawerActions";
import { GROUP_CHIP_CLASSES } from "@/lib/typeColors";
import {
  DetailHero,
  DetailAmount,
  DetailPills,
  TypePill,
  DetailFacts,
  DetailFact,
  DetailChip,
  DetailMeta,
} from "@/components/ui/DetailDrawerLayout";

interface RecurringTransactionDetailDrawerProps {
  transaction: RecurringTransaction | null;
  category?: Category;
  context?: Context;
  group?: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (transaction: RecurringTransaction) => void;
  onDelete: (id: string) => void;
}

export function RecurringTransactionDetailDrawer({
  transaction,
  category,
  context,
  group,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: RecurringTransactionDetailDrawerProps) {
  const { t, i18n } = useTranslation();

  if (!transaction) return null;

  const sign =
    transaction.type === "expense"
      ? "-"
      : transaction.type === "investment"
        ? ""
        : "+";

  const getNextOccurrence = (startDateStr: string, frequency: string) => {
    const startDate = parseISO(startDateStr);
    const today = startOfDay(new Date());

    if (isAfter(startDate, today) || isSameDay(startDate, today)) {
      return format(startDate, "EEEE d MMMM yyyy", {
        locale: i18n.language === "it" ? it : enUS,
      });
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
    return format(nextDate, "EEEE d MMMM yyyy", {
      locale: i18n.language === "it" ? it : enUS,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm pb-2">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{transaction.description}</DrawerTitle>
            <DrawerDescription>{t("frequency")}</DrawerDescription>
          </DrawerHeader>

          <DetailHero
            iconName={category?.icon}
            color={category?.color}
            title={transaction.description}
          >
            <DetailAmount type={transaction.type}>
              {sign}€{transaction.amount.toFixed(2)}
            </DetailAmount>
            <DetailPills>
              <TypePill type={transaction.type} label={t(transaction.type)} />
              <TypePill type="" label={t(transaction.frequency)} />
            </DetailPills>
          </DetailHero>

          <DetailFacts className="mt-1">
            <DetailFact label={t("next_occurrence")} valueClassName="capitalize">
              {getNextOccurrence(transaction.start_date, transaction.frequency)}
            </DetailFact>

            <DetailFact label={t("category")}>{category?.name || "-"}</DetailFact>

            {context && (
              <DetailFact label={t("context")}>
                <DetailChip className="bg-primary/10 text-primary">
                  {context.name}
                </DetailChip>
              </DetailFact>
            )}

            {group && (
              <DetailFact label={t("group")}>
                <DetailChip className={GROUP_CHIP_CLASSES}>{group.name}</DetailChip>
              </DetailFact>
            )}

            {transaction.created_at && (
              <DetailFact label={t("created_at") || "Created At"} valueClassName="capitalize">
                {format(parseISO(transaction.created_at), "d MMMM yyyy", {
                  locale: i18n.language === "it" ? it : enUS,
                })}
              </DetailFact>
            )}
          </DetailFacts>

          <DetailMeta>
            {transaction.pendingSync === 1 ? (
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

          {(onEdit || onDelete) && (
            <DetailDrawerActions
              onClose={() => onOpenChange(false)}
              onEdit={() => onEdit?.(transaction)}
              onDelete={() => onDelete?.(transaction.id)}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
