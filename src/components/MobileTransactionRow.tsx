import { useTranslation } from "react-i18next";
import { Transaction, Category, Context, Group } from "@/lib/db";
import { getIconComponent } from "@/lib/icons";
import { Tag, Users, AlertCircle } from "lucide-react";
import { SyncStatusBadge } from "./SyncStatus";
import { UNCATEGORIZED_CATEGORY } from "@/lib/constants";
import { getTypeTextColor, GROUP_CHIP_CLASSES } from "@/lib/typeColors";
import { createElement } from "react";
import {
  extractSettlementNote,
  isSettlementTransaction,
} from "@/lib/settlements";

interface MobileTransactionRowProps {
  transaction: Transaction;
  category?: Category;
  context?: Context;
  group?: Group;
  onClick?: () => void;
  isVirtual?: boolean;
  style?: React.CSSProperties;
  hideContext?: boolean;
  personalAmount?: number;
  isGroupShare?: boolean;
}

export function MobileTransactionRow({
  transaction,
  category,
  context,
  group,
  onClick,
  style,
  hideContext,
  personalAmount,
  isGroupShare,
}: MobileTransactionRowProps) {
  const { t } = useTranslation();
  const IconComp = category?.icon ? getIconComponent(category.icon) : null;
  const isSettlement = isSettlementTransaction(transaction);
  const settlementNote = isSettlement
    ? extractSettlementNote(transaction.description)
    : "";

  return (
    <div className="mb-2" style={style}>
      <div
        className="group bg-card p-3 rounded-lg border border-border/60 shadow-card flex items-center gap-3 h-[72px] cursor-pointer transition-all duration-200 ease-out active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        aria-label={`${transaction.description}, ${(personalAmount ?? transaction.amount).toFixed(2)}`}
      >
        {/* Icon */}
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 ring-1 ring-inset ring-foreground/[0.04] transition-transform duration-200 ease-out group-hover:scale-105"
          style={{
            backgroundColor: category?.color
              ? `${category.color}1f`
              : "hsl(var(--muted))",
            color: category?.color || "hsl(var(--muted-foreground))",
          }}
          aria-hidden="true"
        >
          {IconComp ? (
            createElement(IconComp, { className: "h-5 w-5" })
          ) : (
            <div className="h-5 w-5 rounded-full bg-muted" />
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="font-medium text-sm truncate flex items-center gap-1">
            {transaction.description || t("transaction")}
            {isSettlement && (
              <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-1.5 py-0.5 text-[9px] font-medium">
                {t("group_settlement_reset")}
              </span>
            )}
            {transaction.category_id === UNCATEGORIZED_CATEGORY.ID && (
              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" aria-hidden="true" />
            )}
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span className={`truncate ${!category && transaction.category_id === UNCATEGORIZED_CATEGORY.ID ? "text-amber-500" : ""}`}>
              {isSettlement
                ? settlementNote || t("group_settlement_reset")
                : category?.name || (transaction.category_id === UNCATEGORIZED_CATEGORY.ID ? (t("needs_review") || "Needs Review") : "-")}
            </span>
            {(group || (context && !hideContext)) && (
              <div className="flex items-center gap-1 flex-wrap">
                {group && (
                  <div className={`flex items-center gap-0.5 ${GROUP_CHIP_CLASSES} px-1.5 py-0.5 rounded text-[10px]`}>
                    <Users className="h-3 w-3" />
                    <span className="truncate max-w-[80px]">{group.name}</span>
                  </div>
                )}
                {context && !hideContext && (
                  <div className="flex items-center gap-0.5 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">
                    <Tag className="h-3 w-3" />
                    <span className="truncate max-w-[80px]">{context.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Amount & Status */}
        <div className="text-right shrink-0 flex flex-col items-end justify-center">
          <div
            className={`num font-bold text-sm tracking-tight ${getTypeTextColor(
              transaction.type
            )}`}
          >
            {isSettlement
              ? t("settlement_history_amount_placeholder")
              : (
                <>
                  {transaction.type === "expense"
                    ? "-"
                    : transaction.type === "investment"
                      ? ""
                      : "+"}
                  €{(personalAmount ?? transaction.amount).toFixed(2)}
                </>
              )}
          </div>
          {isGroupShare && !isSettlement && (
            <div className="text-[10px] text-muted-foreground">
              {t("your_share")}
            </div>
          )}
          <div className="mt-1">
            <SyncStatusBadge isPending={transaction.pendingSync === 1} />
          </div>
        </div>
      </div>
    </div>
  );
}
