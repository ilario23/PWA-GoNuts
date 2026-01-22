import { useTranslation } from "react-i18next";
import { Transaction, Category, Context, Group } from "@/lib/db";
import { getIconComponent } from "@/lib/icons";
import { Tag, Users, AlertCircle, Edit, Copy, Trash2 } from "lucide-react";
import { SyncStatusBadge } from "./SyncStatus";
import { UNCATEGORIZED_CATEGORY } from "@/lib/constants";
import { SwipeableItem } from "@/components/ui/SwipeableItem";
import { createElement } from "react";

interface MobileTransactionRowProps {
  transaction: Transaction;
  category?: Category;
  context?: Context;
  group?: Group;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (transaction: Transaction) => void;
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
  onEdit,
  onDelete,
  onDuplicate,
  onClick,
  style,
  hideContext,
  personalAmount,
  isGroupShare,
}: MobileTransactionRowProps) {
  const { t } = useTranslation();
  const IconComp = category?.icon ? getIconComponent(category.icon) : null;

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
      onDelete={onDelete ? () => onDelete(transaction.id) : undefined}
      leftActions={
        onEdit || onDuplicate
          ? [
            ...(onEdit
              ? [
                {
                  key: "edit",
                  label: t("edit"),
                  icon: <Edit className="h-5 w-5" />,
                  onClick: () => onEdit(transaction),
                  color: "bg-blue-500",
                },
              ]
              : []),
            ...(onDuplicate
              ? [
                {
                  key: "duplicate",
                  label: t("duplicate"),
                  icon: <Copy className="h-5 w-5" />,
                  onClick: () => onDuplicate(transaction),
                  color: "bg-indigo-500",
                },
              ]
              : []),
          ]
          : undefined
      }
      rightActions={
        onDelete
          ? [
            {
              key: "delete",
              label: t("delete"),
              icon: <Trash2 className="h-5 w-5" />,
              onClick: () => onDelete(transaction.id),
              color: "bg-red-500",
            },
          ]
          : undefined
      }
      onClick={onClick}
      className={style ? "" : undefined}
      style={style}
    >
      <div
        className="bg-card p-3 rounded-lg border shadow-sm flex items-center gap-3 h-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={`${transaction.description}, ${(personalAmount ?? transaction.amount).toFixed(2)}`}
      >
        {/* Icon */}
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            backgroundColor: category?.color
              ? `${category.color}20`
              : "#f3f4f6",
            color: category?.color || "#6b7280",
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
            {transaction.category_id === UNCATEGORIZED_CATEGORY.ID && (
              <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" aria-hidden="true" />
            )}
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span className={`truncate ${!category && transaction.category_id === UNCATEGORIZED_CATEGORY.ID ? "text-amber-500" : ""}`}>
              {category?.name || (transaction.category_id === UNCATEGORIZED_CATEGORY.ID ? (t("needs_review") || "Needs Review") : "-")}
            </span>
            {(group || (context && !hideContext)) && (
              <div className="flex items-center gap-1 flex-wrap">
                {group && (
                  <div className="flex items-center gap-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded text-[10px]">
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
            className={`font-bold text-sm ${getTypeTextColor(
              transaction.type
            )}`}
          >
            {transaction.type === "expense"
              ? "-"
              : transaction.type === "investment"
                ? ""
                : "+"}
            €{(personalAmount ?? transaction.amount).toFixed(2)}
          </div>
          {isGroupShare && (
            <div className="text-[10px] text-muted-foreground">
              {t("your_share")}
            </div>
          )}
          <div className="mt-1">
            <SyncStatusBadge isPending={transaction.pendingSync === 1} />
          </div>
        </div>
      </div>
    </SwipeableItem>
  );
}
