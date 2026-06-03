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
  /** Hide the top hairline ruler (first line in a ledger section). */
  isFirst?: boolean;
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
  isFirst,
}: MobileTransactionRowProps) {
  const { t } = useTranslation();
  const IconComp = category?.icon ? getIconComponent(category.icon) : null;
  const isSettlement = isSettlementTransaction(transaction);
  const settlementNote = isSettlement
    ? extractSettlementNote(transaction.description)
    : "";

  const sign =
    transaction.type === "expense"
      ? "−"
      : transaction.type === "investment"
        ? ""
        : "+";

  return (
    <div className="h-full px-1.5" style={style}>
      <div
        className={`group relative flex h-full items-center gap-3 rounded-xl px-2.5 cursor-pointer transition-colors duration-150 hover:bg-muted/50 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
          isFirst ? "" : "before:absolute before:inset-x-2.5 before:top-0 before:h-px before:bg-border/45"
        }`}
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
        {/* Category icon — solid fill, white glyph (matches dashboard) */}
        <div
          className="h-10 w-10 rounded-[14px] flex items-center justify-center shrink-0 transition-transform duration-150 ease-out group-active:scale-95"
          style={{
            backgroundColor: category?.color || "hsl(var(--muted))",
            color: "#fff",
          }}
          aria-hidden="true"
        >
          {IconComp ? (
            createElement(IconComp, { className: "h-5 w-5" })
          ) : (
            <span className="text-xs font-bold">
              {(category?.name || transaction.description || "?")[0]}
            </span>
          )}
        </div>

        {/* Description + meta */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <div className="font-semibold text-[15px] leading-tight truncate flex items-center gap-1.5">
            <span className="truncate">
              {transaction.description || t("transaction")}
            </span>
            {isSettlement && (
              <span className="shrink-0 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                {t("group_settlement_reset")}
              </span>
            )}
            {transaction.category_id === UNCATEGORIZED_CATEGORY.ID && (
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground min-w-0">
            <span className={`truncate ${!category && transaction.category_id === UNCATEGORIZED_CATEGORY.ID ? "text-amber-500" : ""}`}>
              {isSettlement
                ? settlementNote || t("group_settlement_reset")
                : category?.name || (transaction.category_id === UNCATEGORIZED_CATEGORY.ID ? (t("needs_review") || "Needs Review") : "-")}
            </span>
            {group && (
              <span className={`shrink-0 flex items-center gap-0.5 ${GROUP_CHIP_CLASSES} pl-1 pr-1.5 py-0.5 rounded-full text-[10px] font-medium`}>
                <Users className="h-2.5 w-2.5" />
                <span className="truncate max-w-[72px]">{group.name}</span>
              </span>
            )}
            {context && !hideContext && (
              <span className="shrink-0 flex items-center gap-0.5 bg-primary/10 text-primary pl-1 pr-1.5 py-0.5 rounded-full text-[10px] font-medium">
                <Tag className="h-2.5 w-2.5" />
                <span className="truncate max-w-[72px]">{context.name}</span>
              </span>
            )}
          </div>
        </div>

        {/* Amount (the focal figure) */}
        <div className="shrink-0 flex flex-col items-end justify-center gap-0.5">
          <div
            className={`num font-bold text-[17px] leading-none tracking-tight tabular-nums ${getTypeTextColor(
              transaction.type
            )}`}
          >
            {isSettlement
              ? t("settlement_history_amount_placeholder")
              : `${sign}€${(personalAmount ?? transaction.amount).toFixed(2)}`}
          </div>
          {isGroupShare && !isSettlement && (
            <div className="text-[10px] text-muted-foreground leading-none">
              {t("your_share")}
            </div>
          )}
          {transaction.pendingSync === 1 && (
            <div className="leading-none">
              <SyncStatusBadge isPending={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
