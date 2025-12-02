import { useTranslation } from "react-i18next";
import { RecurringTransaction, Category, Context, Group } from "@/lib/db";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { getIconComponent } from "@/lib/icons";
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
import {
  Tag,
  Users,
  Calendar,
  Wallet,
  RefreshCw,
  Repeat,
  Cloud,
  Clock,
} from "lucide-react";
import { SyncStatusBadge } from "@/components/SyncStatus";
import { Badge } from "@/components/ui/badge";

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
}: RecurringTransactionDetailDrawerProps) {
  const { t, i18n } = useTranslation();

  if (!transaction) return null;

  const IconComp = category?.icon ? getIconComponent(category.icon) : null;

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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader className="text-center pt-8 pb-4">
            <div className="flex justify-center mb-4">
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: category?.color
                    ? `${category.color}20`
                    : "#f3f4f6",
                  color: category?.color || "#6b7280",
                }}
              >
                {IconComp ? (
                  <IconComp className="h-8 w-8" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted" />
                )}
              </div>
            </div>
            <DrawerTitle className="text-2xl font-bold truncate px-4">
              {transaction.description}
            </DrawerTitle>
            <DrawerDescription className="text-lg font-medium mt-1">
              <span className={getTypeColor(transaction.type)}>
                {transaction.type === "expense"
                  ? "-"
                  : transaction.type === "investment"
                    ? ""
                    : "+"}
                €{transaction.amount.toFixed(2)}
              </span>
            </DrawerDescription>
          </DrawerHeader>

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
                    transaction.type
                  )}`}
                >
                  {t(transaction.type)}
                </span>
              </div>

              {/* Frequency */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-muted-foreground">
                  <Repeat className="h-4 w-4 mr-2" />
                  <span className="text-sm">{t("frequency")}</span>
                </div>
                <span className="text-sm font-medium capitalize">
                  {t(transaction.frequency)}
                </span>
              </div>

              {/* Next Occurrence */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm">{t("next_occurrence")}</span>
                </div>
                <span className="text-sm font-medium capitalize text-right max-w-[60%]">
                  {getNextOccurrence(
                    transaction.start_date,
                    transaction.frequency
                  )}
                </span>
              </div>

              {/* Category */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-muted-foreground">
                  <Wallet className="h-4 w-4 mr-2" />
                  <span className="text-sm">{t("category")}</span>
                </div>
                <span className="text-sm font-medium">
                  {category?.name || "-"}
                </span>
              </div>

              {/* Context */}
              {context && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-muted-foreground">
                    <Tag className="h-4 w-4 mr-2" />
                    <span className="text-sm">{t("context")}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                    {context.name}
                  </div>
                </div>
              )}

              {/* Group */}
              {group && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    <span className="text-sm">{t("group")}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-medium">
                    {group.name}
                  </div>
                </div>
              )}

              {/* Created At */}
              {transaction.created_at && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      {t("created_at") || "Created At"}
                    </span>
                  </div>
                  <span className="text-sm font-medium capitalize">
                    {format(parseISO(transaction.created_at), "d MMMM yyyy", {
                      locale: i18n.language === "it" ? it : enUS,
                    })}
                  </span>
                </div>
              )}

              {/* Sync Status */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center text-muted-foreground">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span className="text-sm">{t("status")}</span>
                </div>
                {transaction.pendingSync === 1 ? (
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
        </div>
      </DrawerContent>
    </Drawer>
  );
}
