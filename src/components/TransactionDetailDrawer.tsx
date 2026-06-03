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
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { CloudOff, Cloud, X } from "lucide-react";
import { DetailDrawerActions } from "@/components/ui/DetailDrawerActions";
import {
  DetailHeader,
  DetailEyebrow,
  DetailIcon,
  DetailAmount,
  DetailTitle,
  DetailPills,
  TypePill,
  MetaPill,
  DetailGrid,
  DetailCell,
  DetailMeta,
} from "@/components/ui/DetailDrawerLayout";

interface TransactionDetailDrawerProps {
  transaction: Transaction | null;
  category?: Category;
  context?: Context;
  group?: Group | GroupWithMembers;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (transaction: Transaction) => void;
}

export function TransactionDetailDrawer({
  transaction,
  category,
  context,
  group,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onDuplicate,
}: TransactionDetailDrawerProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  if (!transaction) return null;

  const dateObj = parseISO(transaction.date);
  const formattedDate = format(dateObj, "EEEE d MMMM yyyy", {
    locale: i18n.language === "it" ? it : enUS,
  });

  const sign =
    transaction.type === "expense"
      ? "-"
      : transaction.type === "investment"
        ? ""
        : "+";

  // Group logic
  const isGroupTransaction = !!group && !!transaction.group_id;
  let payerName = "";
  let myShareAmount = 0;
  let mySharePercentage = 0;

  if (isGroupTransaction && user && "members" in group) {
    if (transaction.paid_by_member_id) {
      const payer = group.members.find((m) => m.id === transaction.paid_by_member_id);
      payerName = payer?.displayName || t("unknown_user");
    } else {
      // Fallback for old transactions or edge cases
      const payerId = transaction.user_id;
      const payer = group.members.find((m) => m.user_id === payerId);
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
        <div className="mx-auto w-full max-w-sm pb-2">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{transaction.description}</DrawerTitle>
            <DrawerDescription>{t("type")}</DrawerDescription>
          </DrawerHeader>

          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full opacity-60 hover:opacity-100"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{t("close")}</span>
            </Button>
          </DrawerClose>

          <DetailHeader>
            <DetailEyebrow>
              <DetailIcon iconName={category?.icon} color={category?.color} />
              <TypePill type={transaction.type} label={t(transaction.type)} />
              {isGroupTransaction && myShareAmount > 0 && (
                <MetaPill label={t("your_share")} />
              )}
            </DetailEyebrow>

            <DetailAmount type={transaction.type}>
              {sign}€
              {isGroupTransaction && myShareAmount > 0
                ? myShareAmount.toFixed(2)
                : transaction.amount.toFixed(2)}
            </DetailAmount>

            <DetailTitle>{transaction.description}</DetailTitle>
          </DetailHeader>

          <DetailGrid>
            <DetailCell label={t("date")} valueClassName="capitalize">
              {formattedDate}
            </DetailCell>

            <DetailCell label={t("category")}>{category?.name || "-"}</DetailCell>

            {context && (
              <DetailCell label={t("context")} valueClassName="text-primary">
                {context.name}
              </DetailCell>
            )}

            {group && (
              <DetailCell
                label={t("group")}
                valueClassName="text-[hsl(var(--color-investment))]"
              >
                {group.name}
              </DetailCell>
            )}

            {isGroupTransaction && "members" in group && (
              <>
                <DetailCell label={t("paid_by")}>{payerName}</DetailCell>
                <DetailCell label={t("your_share")} mono>
                  €{myShareAmount.toFixed(2)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({mySharePercentage}%)
                  </span>
                </DetailCell>
                <DetailCell label={t("total")} mono>
                  €{transaction.amount.toFixed(2)}
                </DetailCell>
              </>
            )}
          </DetailGrid>

          <DetailMeta>
            {transaction.pendingSync === 1 ? (
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

          {(onEdit || onDelete) && (
            <DetailDrawerActions
              onClose={() => onOpenChange(false)}
              onEdit={() => onEdit?.(transaction)}
              onDelete={() => onDelete?.(transaction.id)}
              onDuplicate={onDuplicate ? () => onDuplicate(transaction) : undefined}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
