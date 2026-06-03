import { useTranslation } from "react-i18next";
import { RecurringTransaction, Category, Context, Group } from "@/lib/db";
import { getIconComponent } from "@/lib/icons";
import { Repeat } from "lucide-react";
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
import { createElement } from "react";
import { cn } from "@/lib/utils";

interface MobileRecurringTransactionRowProps {
  transaction: RecurringTransaction;
  category?: Category;
  context?: Context;
  group?: Group;
  onClick?: (transaction: RecurringTransaction) => void;
  onToggle?: (id: string, active: boolean) => void;
  style?: React.CSSProperties;
}

function getNextOccurrence(startDateStr: string, frequency: string): string {
  const startDate = parseISO(startDateStr);
  const today = startOfDay(new Date());
  if (isAfter(startDate, today) || isSameDay(startDate, today)) {
    return format(startDate, "MMM d");
  }
  let nextDate = startDate;
  while (isAfter(today, nextDate)) {
    switch (frequency) {
      case "daily":   nextDate = addDays(nextDate, 1); break;
      case "weekly":  nextDate = addWeeks(nextDate, 1); break;
      case "monthly": nextDate = addMonths(nextDate, 1); break;
      case "yearly":  nextDate = addYears(nextDate, 1); break;
      default: return format(startDate, "MMM d");
    }
  }
  return format(nextDate, "MMM d");
}

export function MobileRecurringTransactionRow({
  transaction,
  category,
  onClick,
  onToggle,
  style,
}: MobileRecurringTransactionRowProps) {
  const { t } = useTranslation();
  const IconComp = category?.icon ? getIconComponent(category.icon) : null;
  const isActive = transaction.active !== 0;

  const amountColor =
    transaction.type === "income"
      ? "text-[hsl(var(--gonuts-good))]"
      : transaction.type === "investment"
        ? "text-[hsl(var(--color-investment))]"
        : "text-[hsl(var(--gonuts-bad))]";

  const amountPrefix =
    transaction.type === "income" ? "+" : transaction.type === "expense" ? "−" : "";

  return (
    <div style={style}>
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        className={cn(
          "bg-card rounded-[var(--radius)] border border-border/50 p-4 flex items-center gap-3 cursor-pointer transition-transform duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "shadow-[0_1px_0_rgba(26,23,20,0.04),0_6px_16px_-8px_rgba(26,23,20,0.12)]",
          "dark:shadow-[0_1px_0_rgba(0,0,0,0.12),0_6px_16px_-8px_rgba(0,0,0,0.30)]",
          !isActive && "opacity-50"
        )}
        onClick={onClick ? () => onClick(transaction) : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick(transaction);
                }
              }
            : undefined
        }
      >
        {/* Category icon swatch */}
        <div
          className="h-11 w-11 rounded-[14px] flex items-center justify-center shrink-0"
          style={{
            backgroundColor: category?.color ?? "#8A8278",
            color: "#fff",
          }}
        >
          {IconComp ? (
            createElement(IconComp, { className: "h-5 w-5" })
          ) : (
            <Repeat className="h-5 w-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] truncate">
            {transaction.description || t("transaction")}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <span className="capitalize">{t(transaction.frequency)}</span>
            <span>·</span>
            <span>{t("next")} {getNextOccurrence(transaction.start_date, transaction.frequency)}</span>
          </div>
        </div>

        {/* Right: amount + toggle */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={cn("num font-extrabold text-[15px]", amountColor)}>
            {amountPrefix}€{Math.round(transaction.amount).toLocaleString()}
          </span>

          {onToggle && (
            <button
              role="switch"
              aria-checked={isActive}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(transaction.id, !isActive);
              }}
              className="relative shrink-0"
              aria-label={isActive ? t("deactivate") : t("activate")}
              style={{
                width: 38,
                height: 22,
                borderRadius: 11,
                background: isActive ? "hsl(var(--gonuts-good))" : "hsl(var(--muted))",
                transition: "background .15s",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: isActive ? 18 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: "#fff",
                  transition: "left .15s",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
