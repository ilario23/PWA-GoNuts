import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Tag } from "lucide-react";
import { SyncStatusBadge } from "@/components/SyncStatus";
import { Transaction, Category, Context } from "@/lib/db";
import { useMobile } from "@/hooks/useMobile";
import { useMemo, useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getIconComponent } from "@/lib/icons";
import { useVirtualizer } from "@tanstack/react-virtual";
import { UI_DEFAULTS } from "@/lib/constants";

interface TransactionListProps {
  transactions: Transaction[] | undefined;
  categories: Category[] | undefined;
  contexts?: Context[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  isLoading?: boolean;
  /** Height of the container for virtualization (default: auto-detect) */
  height?: number;
}

// Row heights for virtualization
const MOBILE_ROW_HEIGHT = 120;
const DESKTOP_ROW_HEIGHT = 53;

export function TransactionList({
  transactions,
  categories,
  contexts,
  onEdit,
  onDelete,
  showActions = true,
  isLoading = false,
  height,
}: TransactionListProps) {
  const { t } = useTranslation();
  const isMobile = useMobile();
  const parentRef = useRef<HTMLDivElement>(null);

  // Determine if we should virtualize based on item count
  const shouldVirtualize =
    (transactions?.length ?? 0) > UI_DEFAULTS.VIRTUALIZATION_THRESHOLD;

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories?.forEach((c) => {
      map.set(c.id, c);
    });
    return map;
  }, [categories]);

  const contextMap = useMemo(() => {
    const map = new Map<string, Context>();
    contexts?.forEach((c) => {
      map.set(c.id, c);
    });
    return map;
  }, [contexts]);

  const getCategory = (id?: string) => {
    if (!id) return undefined;
    return categoryMap.get(id);
  };

  const getContext = (id?: string | null) => {
    if (!id) return undefined;
    return contextMap.get(id);
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

  // Virtualizer for large lists
  const rowVirtualizer = useVirtualizer({
    count: transactions?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isMobile ? MOBILE_ROW_HEIGHT : DESKTOP_ROW_HEIGHT),
    overscan: 5,
  });

  // Memoized row renderer for mobile
  const renderMobileRow = useCallback(
    (t_item: Transaction, index: number, isVirtual: boolean) => {
      const category = getCategory(t_item.category_id);
      const context = getContext(t_item.context_id);
      const IconComp = category?.icon ? getIconComponent(category.icon) : null;

      const animationProps =
        !isVirtual && index < 20
          ? {
              className:
                "rounded-lg border bg-card p-4 shadow-sm animate-slide-in-up opacity-0 fill-mode-forwards",
              style: { animationDelay: `${index * 0.05}s` },
            }
          : {
              className: "rounded-lg border bg-card p-4 shadow-sm",
            };

      return (
        <article
          key={t_item.id}
          {...animationProps}
          aria-label={`${
            t_item.description || t("transaction")
          }: €${t_item.amount.toFixed(2)} ${t(t_item.type)}`}
        >
          <div className="flex items-center justify-between mb-2">
            <time
              className="font-medium text-sm text-muted-foreground"
              dateTime={t_item.date}
            >
              {t_item.date}
            </time>
            <div
              className={`font-bold ${getTypeTextColor(t_item.type)}`}
              aria-label={`${t("amount")}: €${t_item.amount.toFixed(2)}`}
            >
              {t_item.type === "expense"
                ? "-"
                : t_item.type === "investment"
                ? ""
                : "+"}
              €{t_item.amount.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">{t_item.description || "-"}</div>
            <SyncStatusBadge isPending={t_item.pendingSync === 1} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md flex items-center gap-1">
                {IconComp && (
                  <IconComp className="h-3 w-3" aria-hidden="true" />
                )}
                <span>{category?.name || "-"}</span>
              </div>
              {context && (
                <div className="text-xs text-muted-foreground bg-primary/10 text-primary px-2 py-1 rounded-md flex items-center gap-1">
                  <Tag className="h-3 w-3" aria-hidden="true" />
                  <span>{context.name}</span>
                </div>
              )}
            </div>
            {showActions && (
              <div
                className="flex gap-2"
                role="group"
                aria-label={t("actions")}
              >
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEdit(t_item)}
                    aria-label={t("edit")}
                  >
                    <Edit className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onDelete(t_item.id)}
                    aria-label={t("delete")}
                  >
                    <Trash2
                      className="h-4 w-4 text-destructive"
                      aria-hidden="true"
                    />
                  </Button>
                )}
              </div>
            )}
          </div>
        </article>
      );
    },
    [getCategory, getContext, onEdit, onDelete, showActions, t]
  );

  // Memoized row renderer for desktop
  const renderDesktopRow = useCallback(
    (t_item: Transaction, index: number, isVirtual: boolean) => {
      const category = getCategory(t_item.category_id);
      const context = getContext(t_item.context_id);
      const IconComp = category?.icon ? getIconComponent(category.icon) : null;

      const animationProps =
        !isVirtual && index < 20
          ? {
              className: "animate-slide-in-up opacity-0 fill-mode-forwards",
              style: { animationDelay: `${index * 0.03}s` },
            }
          : {};

      return (
        <TableRow key={t_item.id} {...animationProps}>
          <TableCell>
            <time dateTime={t_item.date}>{t_item.date}</time>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {t_item.description}
              <SyncStatusBadge isPending={t_item.pendingSync === 1} />
            </div>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              {IconComp && <IconComp className="h-4 w-4" aria-hidden="true" />}
              <span>{category?.name || "-"}</span>
            </div>
          </TableCell>
          <TableCell>
            {context ? (
              <div className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
                <Tag className="h-3 w-3" aria-hidden="true" />
                {context.name}
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
          <TableCell className="capitalize">{t(t_item.type)}</TableCell>
          <TableCell className={`text-right ${getTypeTextColor(t_item.type)}`}>
            {t_item.type === "expense"
              ? "-"
              : t_item.type === "investment"
              ? ""
              : "+"}
            €{t_item.amount.toFixed(2)}
          </TableCell>
          {showActions && (
            <TableCell>
              <div
                className="flex items-center justify-end gap-2"
                role="group"
                aria-label={t("actions")}
              >
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(t_item)}
                    aria-label={t("edit")}
                  >
                    <Edit className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(t_item.id)}
                    aria-label={t("delete")}
                  >
                    <Trash2
                      className="h-4 w-4 text-destructive"
                      aria-hidden="true"
                    />
                  </Button>
                )}
              </div>
            </TableCell>
          )}
        </TableRow>
      );
    },
    [getCategory, getContext, onEdit, onDelete, showActions, t]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-4 shadow-sm space-y-3"
          >
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-4">
        {t("no_transactions")}
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    // Virtualized mobile list for large datasets
    if (shouldVirtualize) {
      return (
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: height ?? 400 }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const t_item = transactions[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    padding: "8px 0",
                  }}
                >
                  {renderMobileRow(t_item, virtualRow.index, true)}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Non-virtualized mobile list for small datasets
    return (
      <div className="space-y-4">
        {transactions.map((t_item, index) =>
          renderMobileRow(t_item, index, false)
        )}
      </div>
    );
  }

  // Desktop view
  // Virtualized table for large datasets
  if (shouldVirtualize) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("description")}</TableHead>
              <TableHead>{t("category")}</TableHead>
              <TableHead>{t("context")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
              {showActions && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
        </Table>
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ height: height ?? 400 }}
        >
          <Table>
            <TableBody>
              <tr
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  display: "block",
                }}
              >
                <td style={{ display: "block", position: "relative" }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const t_item = transactions[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.key}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <Table>
                          <TableBody>
                            {renderDesktopRow(t_item, virtualRow.index, true)}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </td>
              </tr>
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Non-virtualized table for small datasets
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("date")}</TableHead>
            <TableHead>{t("description")}</TableHead>
            <TableHead>{t("category")}</TableHead>
            <TableHead>{t("context")}</TableHead>
            <TableHead>{t("type")}</TableHead>
            <TableHead className="text-right">{t("amount")}</TableHead>
            {showActions && <TableHead></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t_item, index) =>
            renderDesktopRow(t_item, index, false)
          )}
        </TableBody>
      </Table>
    </div>
  );
}
