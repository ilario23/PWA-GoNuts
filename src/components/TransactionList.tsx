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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, Trash2, Tag, Users, AlertCircle } from "lucide-react";
import { SyncStatusBadge } from "@/components/SyncStatus";
import { Transaction, Category, Context, Group } from "@/lib/db";
import { useMobile } from "@/hooks/useMobile";
import { useMemo, useRef, useCallback, useState } from "react";
import { ContentLoader } from "@/components/ui/content-loader";
import { SmoothLoader } from "@/components/ui/smooth-loader";
import { motion, Variants } from "framer-motion";
import { FadeIn } from "@/components/ui/fade-in";
import { getIconComponent } from "@/lib/icons";
import { getTypeTextColor, GROUP_CHIP_CLASSES } from "@/lib/typeColors";
import { useVirtualizer } from "@tanstack/react-virtual";
import { UI_DEFAULTS, UNCATEGORIZED_CATEGORY } from "@/lib/constants";
import { Copy } from "lucide-react"; // Import Copy icon
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { MobileTransactionRow } from "./MobileTransactionRow";
import { TransactionDetailDrawer } from "./TransactionDetailDrawer";
import { GroupWithMembers } from "@/hooks/useGroups";
import { useAuth } from "@/hooks/useAuth";
import {
  extractSettlementNote,
  isSettlementTransaction,
} from "@/lib/settlements";

interface TransactionListProps {
  transactions: Transaction[] | undefined;
  categories: Category[] | undefined;
  contexts?: Context[];
  groups?: Group[] | GroupWithMembers[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (transaction: Transaction) => void;
  showActions?: boolean;
  isLoading?: boolean;
  /** Height of the container for virtualization (default: auto-detect) */
  height?: number;
  hideContext?: boolean;
}

// Row heights for virtualization
export const MOBILE_ROW_HEIGHT = 64; // Full-bleed ledger line, no inter-row gap
export const MOBILE_HEADER_HEIGHT = 48;
export const DESKTOP_ROW_HEIGHT = 53;

type GroupedItem =
  | { type: "header"; date: string; label: string; total: number; count: number; isToday: boolean }
  | { type: "transaction"; data: Transaction; isFirst: boolean };

export function TransactionList({
  transactions,
  categories,
  contexts,
  groups,
  onEdit,
  onDelete,
  onDuplicate,
  showActions = true,
  isLoading = false,
  height,
  hideContext = false,
}: TransactionListProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isMobile = useMobile();
  const parentRef = useRef<HTMLDivElement>(null);

  // Removed containerVariants as we are moving to independent item animations
  // to avoid race conditions where items stay at opacity: 0

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.34,
        // ease-out-quint: the row drops in and settles, not just fades.
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDrawerOpen(true);
  };

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

  const groupMap = useMemo(() => {
    const map = new Map<string, Group | GroupWithMembers>();
    groups?.forEach((g) => {
      map.set(g.id, g);
    });
    return map;
  }, [groups]);

  const getCategory = (id?: string) => {
    if (!id) return undefined;
    return categoryMap.get(id);
  };

  const getContext = (id?: string | null) => {
    if (!id) return undefined;
    return contextMap.get(id);
  };

  const getGroup = (id?: string | null) => {
    if (!id) return undefined;
    return groupMap.get(id);
  };

  const getPersonalAmount = (transaction: Transaction) => {
    if (!transaction.group_id) return transaction.amount;
    const group = getGroup(transaction.group_id);
    if (!group || !("myShare" in group)) return transaction.amount;
    return (transaction.amount * (group as GroupWithMembers).myShare) / 100;
  };

  // Group transactions by date
  const groupedItems = useMemo(() => {
    if (!transactions) return [];
    const items: GroupedItem[] = [];
    let lastDate = "";
    let currentHeader: Extract<GroupedItem, { type: "header" }> | null = null;

    transactions.forEach((transaction) => {
      const isNewGroup = transaction.date !== lastDate;
      if (isNewGroup) {
        const dateObj = parseISO(transaction.date);
        let label = format(dateObj, "d MMMM yyyy", {
          locale: i18n.language === "it" ? it : enUS,
        });

        const today = isToday(dateObj);
        if (today) {
          label = t("today");
        } else if (isYesterday(dateObj)) {
          label = t("yesterday");
        }

        currentHeader = { type: "header", date: transaction.date, label, total: 0, count: 0, isToday: today };
        items.push(currentHeader);
        lastDate = transaction.date;
      }
      // Net daily cash flow: income adds, expense/investment are money out.
      if (currentHeader) {
        currentHeader.count += 1;
        if (!isSettlementTransaction(transaction)) {
          currentHeader.total +=
            transaction.type === "income"
              ? transaction.amount
              : -transaction.amount;
        }
      }
      items.push({ type: "transaction", data: transaction, isFirst: isNewGroup });
    });

    return items;
  }, [transactions, t, i18n.language]);

  // Virtualizer for large lists
  const rowVirtualizer = useVirtualizer({
    count: isMobile ? groupedItems.length : transactions?.length ?? 0,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      if (isMobile) {
        return groupedItems[index].type === "header"
          ? MOBILE_HEADER_HEIGHT
          : MOBILE_ROW_HEIGHT;
      }
      return DESKTOP_ROW_HEIGHT;
    },
    overscan: 5,
  });

  // Memoized row renderer for desktop
  const renderDesktopRow = useCallback(
    (t_item: Transaction, index: number, isVirtual: boolean) => {
      const category = getCategory(t_item.category_id);
      const context = getContext(t_item.context_id);
      const group = getGroup(t_item.group_id);
      const IconComp = category?.icon ? getIconComponent(category.icon) : null;
      const isSettlement = isSettlementTransaction(t_item);
      const settlementNote = isSettlement
        ? extractSettlementNote(t_item.description)
        : "";

      // Group Details Logic for Tooltip
      let payerName = "";
      let myShareAmount = 0;
      let mySharePercentage = 0;
      const isGroupTransaction = !!group && !!t_item.group_id;

      if (isGroupTransaction && user && group && "members" in group) {
        if (t_item.paid_by_member_id) {
          const payer = (group as GroupWithMembers).members.find((m) => m.id === t_item.paid_by_member_id);
          payerName = payer?.displayName || t("unknown_user");
        } else {
          const payerId = t_item.user_id;
          const payer = (group as GroupWithMembers).members.find((m) => m.user_id === payerId);
          payerName = payer?.displayName || t("unknown_user");
        }

        const myMemberInfo = (group as GroupWithMembers).members.find((m) => m.user_id === user.id);
        if (myMemberInfo) {
          mySharePercentage = myMemberInfo.share;
          myShareAmount = (t_item.amount * mySharePercentage) / 100;
        }
      }

      const animationProps =
        !isVirtual && index < 20
          ? {
            className: "animate-slide-in-up opacity-0 fill-mode-forwards",
            style: { animationDelay: `${index * 0.03}s` },
          }
          : {};

      return (
        <TableRow key={t_item.id} {...animationProps}>
          <TableCell className="w-[120px]">
            <time dateTime={t_item.date}>{t_item.date}</time>
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2 max-w-[200px] xl:max-w-[300px]">
              <span className="truncate">{t_item.description}</span>
              {isSettlement && (
                <span className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5 text-[10px] font-medium">
                  {t("group_settlement_reset")}
                </span>
              )}
              {t_item.category_id === UNCATEGORIZED_CATEGORY.ID && (
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
              )}
              <TooltipProvider delayDuration={300}>
                {t_item.pendingSync === 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        <SyncStatusBadge isPending={true} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("changes_pending_sync")}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>
          </TableCell>
          <TableCell className="w-[180px]">
            <div className="flex items-center gap-2">
              {IconComp && <IconComp className="h-4 w-4 shrink-0" aria-hidden="true" />}
              <span className={`truncate max-w-[140px] ${!category && t_item.category_id === UNCATEGORIZED_CATEGORY.ID ? "text-amber-500 font-medium" : ""}`}>
                {isSettlement
                  ? settlementNote || t("group_settlement_reset")
                  : category?.name || (t_item.category_id === UNCATEGORIZED_CATEGORY.ID ? (t("needs_review") || "Needs Review") : "-")}
              </span>
            </div>
          </TableCell>
          <TableCell className="w-[130px]">
            {context && !hideContext ? (
              <div className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
                <Tag className="h-3 w-3" aria-hidden="true" />
                {context.name}
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
          <TableCell className="w-[130px]">
            {group ? (
              <TooltipProvider>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <div className={`inline-flex items-center gap-1 text-xs ${GROUP_CHIP_CLASSES} px-2 py-1 rounded-md cursor-default`}>
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {group.name}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs p-3 space-y-2">
                    {isGroupTransaction && "members" in group ? (
                      <>
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                          <span className="text-muted-foreground">{t("paid_by")}:</span>
                          <span className="font-medium text-right">{payerName}</span>

                          {myShareAmount > 0 && (
                            <>
                              <span className="text-muted-foreground">{t("your_share")}:</span>
                              <div className="text-right">
                                <span className="font-medium">€{myShareAmount.toFixed(2)}</span>
                                <span className="text-muted-foreground ml-1">({mySharePercentage}%)</span>
                              </div>
                            </>
                          )}

                          <span className="text-muted-foreground">{t("total")}:</span>
                          <span className="font-medium text-right">€{t_item.amount.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <span>{t("amount")}: €{t_item.amount.toFixed(2)}</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </TableCell>
          <TableCell className="capitalize w-[100px]">{t(t_item.type)}</TableCell>
          <TableCell className={`text-right w-[120px] ${getTypeTextColor(t_item.type)}`}>
            {isSettlement ? (
              t("settlement_history_amount_placeholder")
            ) : (
              <>
                {t_item.type === "expense"
                  ? "-"
                  : t_item.type === "investment"
                    ? ""
                    : "+"}
                €{getPersonalAmount(t_item).toFixed(2)}
              </>
            )}
            {t_item.group_id && !isSettlement && (
              <div className="text-[10px] text-muted-foreground">
                {t("your_share")}
              </div>
            )}
          </TableCell>
          {showActions && (
            <TableCell className="w-[100px]">
              <div
                className="flex items-center justify-end gap-2"
                role="group"
                aria-label={t("actions")}
              >
                <TooltipProvider delayDuration={300}>
                  {onDuplicate && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDuplicate(t_item)}
                          aria-label={t("duplicate")}
                        >
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("duplicate")}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {onEdit && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(t_item)}
                          aria-label={t("edit")}
                          data-testid="edit-transaction-button"
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("edit")}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {onDelete && (
                    <Tooltip>
                      <TooltipTrigger asChild>
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
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("delete")}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>
            </TableCell>
          )}
        </TableRow>
      );
    },
    [getCategory, getContext, onEdit, onDelete, onDuplicate, showActions, t]
  );

  const renderContent = () => {
    if (!transactions || transactions.length === 0) {
      return (
        <div className="text-muted-foreground text-center py-4">
          {t("no_transactions")}
        </div>
      );
    }

    // Mobile view
    if (isMobile) {
      // Ledger section header: date label + net daily flow, coral marker for today.
      const renderMobileHeader = (
        item: Extract<GroupedItem, { type: "header" }>
      ) => (
        <div className="flex h-full items-center justify-between gap-2 px-4 pt-3 pb-1.5">
          <span className="flex items-center gap-1.5 min-w-0">
            {item.isToday && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
            )}
            <span
              className={`text-[13px] font-bold uppercase tracking-wide truncate ${
                item.isToday ? "text-primary" : "text-foreground/70"
              }`}
            >
              {item.label}
            </span>
          </span>
          {item.count > 1 && (
            <span className="num text-[12px] font-semibold tabular-nums text-muted-foreground/80 shrink-0">
              {item.total >= 0 ? "+" : "−"}€{Math.abs(item.total).toFixed(2)}
            </span>
          )}
        </div>
      );

      // Virtualized mobile list for large datasets
      if (shouldVirtualize) {
        return (
          <>
            <div
              ref={parentRef}
              className="overflow-auto rounded-[22px] border border-border/50 bg-card shadow-card"
              style={{ height: height ?? 'calc(100vh - 280px)', minHeight: '450px' }}
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = groupedItems[virtualRow.index];

                  if (item.type === "header") {
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
                        }}
                        className="z-10 sticky bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
                      >
                        {renderMobileHeader(item)}
                      </div>
                    );
                  }

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
                      }}
                    >
                      <FadeIn delay={0} duration={200} className="h-full">
                        <MobileTransactionRow
                          transaction={item.data}
                          category={getCategory(item.data.category_id)}
                          context={getContext(item.data.context_id)}
                          group={getGroup(item.data.group_id)}
                          onClick={() => handleRowClick(item.data)}
                          isVirtual={true}
                          hideContext={hideContext}
                          personalAmount={getPersonalAmount(item.data)}
                          isGroupShare={!!item.data.group_id}
                          isFirst={item.isFirst}
                        />
                      </FadeIn>
                    </div>
                  );
                })}
              </div>
            </div>
            <TransactionDetailDrawer
              transaction={selectedTransaction}
              category={getCategory(selectedTransaction?.category_id)}
              context={getContext(selectedTransaction?.context_id)}
              group={getGroup(selectedTransaction?.group_id)}
              open={isDrawerOpen}
              onOpenChange={setIsDrawerOpen}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          </>
        );
      }

      // Non-virtualized mobile list for small datasets
      return (
        <>
          <div className="rounded-[22px] border border-border/50 bg-card shadow-card overflow-hidden">
            {groupedItems.map((item, index) => {
              if (item.type === "header") {
                return (
                  <motion.div
                    key={`header-${item.date}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
                    style={{ height: MOBILE_HEADER_HEIGHT }}
                  >
                    {renderMobileHeader(item)}
                  </motion.div>
                );
              }
              return (
                <motion.div
                  key={item.data.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  custom={index}
                  // Add a small delay based on index to stagger the animation manually
                  // This is more robust than staggerChildren which can sometimes fail if parent state updates too quickly
                  transition={{ delay: Math.min(index * 0.05, 0.5) }}
                  style={{ height: MOBILE_ROW_HEIGHT }}
                >
                  <MobileTransactionRow
                    transaction={item.data}
                    category={getCategory(item.data.category_id)}
                    context={getContext(item.data.context_id)}
                    group={getGroup(item.data.group_id)}
                    onClick={() => handleRowClick(item.data)}
                    isVirtual={false}
                    hideContext={hideContext}
                    personalAmount={getPersonalAmount(item.data)}
                    isGroupShare={!!item.data.group_id}
                    isFirst={item.isFirst}
                  />
                </motion.div>
              );
            })}
          </div>
          <TransactionDetailDrawer
            transaction={selectedTransaction}
            category={getCategory(selectedTransaction?.category_id)}
            context={getContext(selectedTransaction?.context_id)}
            group={getGroup(selectedTransaction?.group_id)}
            open={isDrawerOpen}
            onOpenChange={setIsDrawerOpen}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
          />
        </>
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
                <TableHead className="w-[120px]">{t("date")}</TableHead>
                <TableHead>{t("description")}</TableHead>
                <TableHead className="w-[180px]">{t("category")}</TableHead>
                <TableHead className="w-[130px]">{t("context")}</TableHead>
                <TableHead className="w-[130px]">{t("group")}</TableHead>
                <TableHead className="w-[100px]">{t("type")}</TableHead>
                <TableHead className="text-right w-[120px]">{t("amount")}</TableHead>
                {showActions && <TableHead className="w-[100px]"></TableHead>}
              </TableRow>
            </TableHeader>
          </Table>
          <div
            ref={parentRef}
            className="overflow-auto"
            style={{ height: height ?? 'calc(100vh - 280px)', minHeight: '400px' }}
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
                          <FadeIn delay={0} duration={200}>
                            <Table>
                              <TableBody>
                                {renderDesktopRow(t_item, virtualRow.index, true)}
                              </TableBody>
                            </Table>
                          </FadeIn>
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
              <TableHead className="w-[120px]">{t("date")}</TableHead>
              <TableHead>{t("description")}</TableHead>
              <TableHead className="w-[180px]">{t("category")}</TableHead>
              <TableHead className="w-[130px]">{t("context")}</TableHead>
              <TableHead className="w-[130px]">{t("group")}</TableHead>
              <TableHead className="w-[100px]">{t("type")}</TableHead>
              <TableHead className="text-right w-[120px]">{t("amount")}</TableHead>
              {showActions && <TableHead className="w-[100px]"></TableHead>}
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
  };

  return (
    <SmoothLoader
      isLoading={isLoading}
      skeleton={<ContentLoader variant="transaction" count={5} />}
    >
      {renderContent()}
    </SmoothLoader>
  );
}

