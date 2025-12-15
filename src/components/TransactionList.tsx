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
import { useMemo, useRef, useCallback } from "react";
import { ContentLoader } from "@/components/ui/content-loader";
import { SmoothLoader } from "@/components/ui/smooth-loader";
import { motion, Variants } from "framer-motion";
import { FadeIn } from "@/components/ui/fade-in";
import { getIconComponent } from "@/lib/icons";
import { useVirtualizer } from "@tanstack/react-virtual";
import { UI_DEFAULTS, UNCATEGORIZED_CATEGORY } from "@/lib/constants";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { it, enUS } from "date-fns/locale";
import { MobileTransactionRow } from "./MobileTransactionRow";
import { TransactionDetailDrawer } from "./TransactionDetailDrawer";
import { useState } from "react";
import { GroupWithMembers } from "@/hooks/useGroups";
import { useAuth } from "@/hooks/useAuth";

interface TransactionListProps {
  transactions: Transaction[] | undefined;
  categories: Category[] | undefined;
  contexts?: Context[];
  groups?: Group[] | GroupWithMembers[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  isLoading?: boolean;
  /** Height of the container for virtualization (default: auto-detect) */
  height?: number;
  hideContext?: boolean;
}

// Row heights for virtualization
export const MOBILE_ROW_HEIGHT = 80; // Reduced height for compact row + margin
export const MOBILE_HEADER_HEIGHT = 40;
export const DESKTOP_ROW_HEIGHT = 53;

type GroupedItem =
  | { type: "header"; date: string; label: string }
  | { type: "transaction"; data: Transaction };

export function TransactionList({
  transactions,
  categories,
  contexts,
  groups,
  onEdit,
  onDelete,
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
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
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

  // Group transactions by date
  const groupedItems = useMemo(() => {
    if (!transactions) return [];
    const items: GroupedItem[] = [];
    let lastDate = "";

    transactions.forEach((transaction) => {
      if (transaction.date !== lastDate) {
        const dateObj = parseISO(transaction.date);
        let label = format(dateObj, "d MMMM yyyy", {
          locale: i18n.language === "it" ? it : enUS,
        });

        if (isToday(dateObj)) {
          label = t("today");
        } else if (isYesterday(dateObj)) {
          label = t("yesterday");
        }

        items.push({ type: "header", date: transaction.date, label });
        lastDate = transaction.date;
      }
      items.push({ type: "transaction", data: transaction });
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
              {t_item.category_id === UNCATEGORIZED_CATEGORY.ID && (
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
              )}
              <SyncStatusBadge isPending={t_item.pendingSync === 1} />
            </div>
          </TableCell>
          <TableCell className="w-[180px]">
            <div className="flex items-center gap-2">
              {IconComp && <IconComp className="h-4 w-4 shrink-0" aria-hidden="true" />}
              <span className={`truncate max-w-[140px] ${!category && t_item.category_id === UNCATEGORIZED_CATEGORY.ID ? "text-amber-500 font-medium" : ""}`}>
                {category?.name || (t_item.category_id === UNCATEGORIZED_CATEGORY.ID ? (t("needs_review") || "Needs Review") : "-")}
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
                    <div className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md cursor-default">
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
            {t_item.type === "expense"
              ? "-"
              : t_item.type === "investment"
                ? ""
                : "+"}
            €{getPersonalAmount(t_item).toFixed(2)}
            {t_item.group_id && (
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
      // Virtualized mobile list for large datasets
      if (shouldVirtualize) {
        return (
          <>
            <div
              ref={parentRef}
              className="overflow-auto"
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
                          padding: "8px 4px",
                        }}
                        className="font-semibold text-sm text-muted-foreground sticky z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
                      >
                        {item.label}
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
                        padding: "0 4px",
                      }}
                    >
                      <FadeIn delay={0} duration={200}>
                        <MobileTransactionRow
                          transaction={item.data}
                          category={getCategory(item.data.category_id)}
                          context={getContext(item.data.context_id)}
                          group={getGroup(item.data.group_id)}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onClick={() => handleRowClick(item.data)}
                          isVirtual={true}
                          hideContext={hideContext}
                          personalAmount={getPersonalAmount(item.data)}
                          isGroupShare={!!item.data.group_id}
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
            />
          </>
        );
      }

      // Non-virtualized mobile list for small datasets
      return (
        <>
          <div className="space-y-1">
            {groupedItems.map((item, index) => {
              if (item.type === "header") {
                return (
                  <motion.div
                    key={`header-${item.date}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="font-semibold text-sm text-muted-foreground pt-4 pb-2 px-1 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
                  >
                    {item.label}
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
                >
                  <MobileTransactionRow
                    transaction={item.data}
                    category={getCategory(item.data.category_id)}
                    context={getContext(item.data.context_id)}
                    group={getGroup(item.data.group_id)}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onClick={() => handleRowClick(item.data)}
                    isVirtual={false}
                    hideContext={hideContext}
                    personalAmount={getPersonalAmount(item.data)}
                    isGroupShare={!!item.data.group_id}
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

