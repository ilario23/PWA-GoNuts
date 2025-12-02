import { useTranslation } from "react-i18next";
import { Transaction, Category, Context, Group } from "@/lib/db";
import { GroupWithMembers } from "@/hooks/useGroups";
import { useAuth } from "@/hooks/useAuth";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { getIconComponent } from "@/lib/icons";
import { format, parseISO } from "date-fns";
import { it, enUS } from "date-fns/locale";
import {
  Tag,
  Users,
  Calendar,
  Wallet,
  RefreshCw,
  User,
  PieChart,
  Cloud,
} from "lucide-react";
import { SyncStatusBadge } from "@/components/SyncStatus";
import { Badge } from "@/components/ui/badge";

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  category?: Category;
  context?: Context;
  group?: Group | GroupWithMembers;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (transaction: Transaction) => void;
}

export function TransactionDetailDrawer({
  transaction,
  category,
  context,
  group,
  open,
  onOpenChange,
}: TransactionDetailDrawerProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  if (!transaction) return null;

  const IconComp = category?.icon ? getIconComponent(category.icon) : null;
  const dateObj = parseISO(transaction.date);
  const formattedDate = format(dateObj, "EEEE d MMMM yyyy", {
    locale: i18n.language === "it" ? it : enUS,
  });

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

  // Group logic
  const isGroupTransaction = !!group && !!transaction.group_id;
  let payerName = "";
  let myShareAmount = 0;
  let mySharePercentage = 0;

  if (isGroupTransaction && user && "members" in group) {
    const payerId = transaction.paid_by_user_id || transaction.user_id;
    const payer = group.members.find((m) => m.user_id === payerId);

    if (payerId === user.id) {
      payerName = t("you");
    } else {
      payerName = payer?.displayName || t("unknown_user");
    }

    const myMemberInfo = group.members.find((m) => m.user_id === user.id);
    if (myMemberInfo) {
      mySharePercentage = myMemberInfo.share;
      myShareAmount = (transaction.amount * mySharePercentage) / 100;
    }
  }

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

              {/* Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm">{t("date")}</span>
                </div>
                <span className="text-sm font-medium capitalize">
                  {formattedDate}
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

              {/* Group Details (Paid By & Share) */}
              {isGroupTransaction && "members" in group && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-muted-foreground">
                      <User className="h-4 w-4 mr-2" />
                      <span className="text-sm">{t("paid_by")}</span>
                    </div>
                    <span className="text-sm font-medium">{payerName}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-muted-foreground">
                      <PieChart className="h-4 w-4 mr-2" />
                      <span className="text-sm">{t("your_share")}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium block">
                        €{myShareAmount.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({mySharePercentage}%)
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Sync Status */}
              <div className="flex items-center justify-between">
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
