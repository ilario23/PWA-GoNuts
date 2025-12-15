import { useTranslation } from "react-i18next";
import { RecurringTransaction, Category, Context, Group } from "@/lib/db";
import { getIconComponent } from "@/lib/icons";
import { Tag, Users, Repeat } from "lucide-react";
import { SyncStatusBadge } from "./SyncStatus";
import { SwipeableItem } from "@/components/ui/SwipeableItem";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isAfter,
  isSameDay,
  parseISO,
  format,
  startOfDay,
} from "date-fns";

interface MobileRecurringTransactionRowProps {
  transaction: RecurringTransaction;
  category?: Category;
  context?: Context;
  group?: Group;
  onEdit?: (transaction: RecurringTransaction) => void;
  onDelete?: (id: string) => void;
  onClick?: (transaction: RecurringTransaction) => void;
  style?: React.CSSProperties;
}

export function MobileRecurringTransactionRow({
  transaction,
  category,
  context,
  group,
  onEdit,
  onDelete,
  onClick,
  style,
}: MobileRecurringTransactionRowProps) {
  const { t } = useTranslation();
  const IconComp = category?.icon ? getIconComponent(category.icon) : null;

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

  return (
    <SwipeableItem
      onEdit={onEdit ? () => onEdit(transaction) : undefined}
      onDelete={onDelete ? () => onDelete(transaction.id) : undefined}
      onClick={onClick ? () => onClick(transaction) : undefined}
      style={style}
    >
      <div className="relative bg-card p-3 rounded-lg border shadow-sm flex flex-col gap-2 min-h-[84px] cursor-pointer">
        {/* Top: Description (Full Width) */}
        <div className="font-medium text-sm w-full break-all">
          {transaction.description || t("transaction")}
        </div>

        {/* Bottom: Details Row */}
        <div className="flex items-start gap-3 w-full">
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

          {/* Middle: Recurrence & Badges */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            {/* Recurrence Info */}
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Repeat className="h-3 w-3" />
                <span className="capitalize">{t(transaction.frequency)}</span>
              </div>
              <div>
                {t("next")}:{" "}
                {getNextOccurrence(transaction.start_date, transaction.frequency)}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span className="truncate">{category?.name || "-"}</span>
              {(group || context) && (
                <div className="flex items-center gap-1 flex-wrap">
                  {group && (
                    <div className="flex items-center gap-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px]">
                      <Users className="h-3 w-3" />
                      <span className="truncate max-w-[80px]">{group.name}</span>
                    </div>
                  )}
                  {context && (
                    <div className="flex items-center gap-0.5 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">
                      <Tag className="h-3 w-3" />
                      <span className="truncate max-w-[80px]">{context.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Amount & Status */}
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
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
            <SyncStatusBadge isPending={transaction.pendingSync === 1} />
          </div>
        </div>
      </div>
    </SwipeableItem>
  );
}
