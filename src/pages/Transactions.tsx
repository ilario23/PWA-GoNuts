import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useContexts } from "@/hooks/useContexts";
import { useGroups } from "@/hooks/useGroups";
import { Transaction } from "@/lib/db";
import { useAvailableYears } from "@/hooks/useAvailableYears";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useTranslation } from "react-i18next";
import { TransactionList } from "@/components/TransactionList";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { TransactionDialog, TransactionFormData } from "@/components/TransactionDialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertCircle } from "lucide-react";
import { UNCATEGORIZED_CATEGORY } from "@/lib/constants";
import { Category, Group, Context } from "@/lib/db";

import { format } from "date-fns";

interface FilterState {
  text: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
  categoryId: string;
  type: string;
  groupFilter: string; // 'all', 'personal', 'group', or specific group id
  contextFilter: string; // 'all', 'none' (no context), or specific context id
  needsReview: boolean;
}

interface FilterContentProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  availableCategories: Category[];
  groups: Group[];
  contexts: Context[];
  onReset: () => void;
}

const FilterContent = ({
  filters,
  setFilters,
  availableCategories,
  groups,
  contexts,
  onReset,
}: FilterContentProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 py-4 px-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("description")}</label>
        <Input
          placeholder={t("search_transactions") || "Search transactions..."}
          value={filters.text}
          onChange={(e) => setFilters({ ...filters, text: e.target.value })}
          autoFocus={false}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("type")}</label>
        <Select
          value={filters.type}
          onValueChange={(value) =>
            setFilters({ ...filters, type: value, categoryId: "all" })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("all_types")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_types") || "All Types"}</SelectItem>
            <SelectItem value="expense">{t("expense")}</SelectItem>
            <SelectItem value="income">{t("income")}</SelectItem>
            <SelectItem value="investment">{t("investment")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {groups.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("group")}</label>
          <Select
            value={filters.groupFilter}
            onValueChange={(value) =>
              setFilters({ ...filters, groupFilter: value, categoryId: "all" })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="personal">{t("personal")}</SelectItem>
              <SelectItem value="group">{t("all_groups")}</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {contexts.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("context")}</label>
          <Select
            value={filters.contextFilter}
            onValueChange={(value) =>
              setFilters({ ...filters, contextFilter: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("all")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              <SelectItem value="none">{t("no_context")}</SelectItem>
              {contexts.map((ctx) => (
                <SelectItem key={ctx.id} value={ctx.id}>
                  {ctx.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("category")}</label>
        <Select
          value={filters.categoryId}
          onValueChange={(value) =>
            setFilters({ ...filters, categoryId: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("all_categories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("all_categories") || "All Categories"}
            </SelectItem>
            {availableCategories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("date_from")}</label>
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("date_to")}</label>
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("min_amount")}</label>
          <Input
            type="number"
            placeholder="0.00"
            value={filters.minAmount}
            onChange={(e) =>
              setFilters({ ...filters, minAmount: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("max_amount")}</label>
          <Input
            type="number"
            placeholder="∞"
            value={filters.maxAmount}
            onChange={(e) =>
              setFilters({ ...filters, maxAmount: e.target.value })
            }
          />
        </div>
      </div>

      {/* Needs Review Toggle - simple style like other filters */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="needs-review"
          className="text-sm font-medium cursor-pointer"
        >
          {t("needs_review") || "Needs Review"}
        </label>
        <Switch
          id="needs-review"
          checked={filters.needsReview}
          onCheckedChange={(checked) =>
            setFilters({ ...filters, needsReview: checked })
          }
        />
      </div>

      <Button
        variant="outline"
        onClick={onReset}
        className="w-full gap-2"
      >
        <X className="h-4 w-4" />
        {t("reset_filters") || "Reset Filters"}
      </Button>
    </div>
  );
};

export function TransactionsPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(now, "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState(format(now, "yyyy"));
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Pass undefined for limit, and the selectedMonth (which is in yyyy-MM format) for yearMonth
  // When showAllMonths is true, pass only the year
  const { transactions, addTransaction, updateTransaction, deleteTransaction } =
    useTransactions(undefined, showAllMonths ? selectedYear : selectedMonth);

  const { t } = useTranslation();
  const { categories } = useCategories();
  const { contexts } = useContexts();
  const { groups } = useGroups();
  const { user } = useAuth();

  // Get available years from database
  const years = useAvailableYears();

  // Generate months
  const months = [
    { value: "all", label: t("all") || "All" },
    { value: "01", label: t("january") },
    { value: "02", label: t("february") },
    { value: "03", label: t("march") },
    { value: "04", label: t("april") },
    { value: "05", label: t("may") },
    { value: "06", label: t("june") },
    { value: "07", label: t("july") },
    { value: "08", label: t("august") },
    { value: "09", label: t("september") },
    { value: "10", label: t("october") },
    { value: "11", label: t("november") },
    { value: "12", label: t("december") },
  ];

  const handleMonthChange = (monthValue: string) => {
    if (monthValue === "all") {
      setShowAllMonths(true);
      setSelectedMonth(selectedYear);
    } else {
      setShowAllMonths(false);
      setSelectedMonth(`${selectedYear}-${monthValue}`);
    }
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (showAllMonths) {
      setSelectedMonth(year);
    } else {
      const currentMonthPart = selectedMonth.split("-")[1];
      setSelectedMonth(`${year}-${currentMonthPart}`);
    }
  };
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState<FilterState>({
    text: "",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
    categoryId: "all",
    type: "all",
    groupFilter: "all", // 'all', 'personal', 'group', or specific group id
    contextFilter: (searchParams.get("contextId") || "all"), // 'all', 'none' (no context), or specific context id
    needsReview: false,
  });

  const editingTransaction = useMemo(() => {
    if (!editingId || !transactions) return null;
    const tx = transactions.find((t) => t.id === editingId);
    if (!tx) return null;
    return {
      id: tx.id,
      amount: tx.amount,
      description: tx.description,
      type: tx.type,
      category_id: tx.category_id,
      date: tx.date,
      context_id: tx.context_id,
      group_id: tx.group_id,
      paid_by_member_id: tx.paid_by_member_id,
    };
  }, [editingId, transactions]);

  const handleSubmit = async (data: TransactionFormData) => {
    if (!user) return;

    const groupId = data.group_id || undefined;
    const paidByMemberId = groupId ? data.paid_by_member_id : undefined;
    const contextId = data.context_id || undefined;

    if (editingId) {
      await updateTransaction(editingId, {
        amount: data.amount,
        description: data.description || "",
        type: data.type,
        category_id: data.category_id,
        date: data.date,
        year_month: data.date.substring(0, 7),
        context_id: contextId,
        group_id: groupId,
        paid_by_member_id: paidByMemberId,
      });
    } else {
      await addTransaction({
        user_id: user.id,
        amount: data.amount,
        description: data.description || "",
        type: data.type,
        category_id: data.category_id,
        date: data.date,
        year_month: data.date.substring(0, 7),
        context_id: contextId,
        group_id: groupId,
        paid_by_member_id: paidByMemberId,
      });
    }
    setIsOpen(false);
    setEditingId(null);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setIsOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setIsOpen(true);
  };

  const handleResetFilters = () => {
    setFilters({
      text: "",
      dateFrom: "",
      dateTo: "",
      minAmount: "",
      maxAmount: "",
      categoryId: "all",
      type: "all",
      groupFilter: "all",
      contextFilter: "all",
      needsReview: false,
    });
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      deleteTransaction(deletingId);
      setDeletingId(null);
    }
  };

  const filteredTransactions = useMemo(() => {
    return (
      transactions?.filter((transaction) => {
        if (transaction.deleted_at) return false;

        // Text Search
        if (
          filters.text &&
          !transaction.description
            ?.toLowerCase()
            .includes(filters.text.toLowerCase())
        ) {
          return false;
        }

        // Date Range
        if (filters.dateFrom && transaction.date < filters.dateFrom)
          return false;
        if (filters.dateTo && transaction.date > filters.dateTo) return false;

        // Amount Range
        if (
          filters.minAmount &&
          transaction.amount < parseFloat(filters.minAmount)
        )
          return false;
        if (
          filters.maxAmount &&
          transaction.amount > parseFloat(filters.maxAmount)
        )
          return false;

        // Category
        if (
          filters.categoryId !== "all" &&
          transaction.category_id !== filters.categoryId
        )
          return false;

        // Type
        if (filters.type !== "all" && transaction.type !== filters.type)
          return false;

        // Group Filter
        if (filters.groupFilter !== "all") {
          if (filters.groupFilter === "personal") {
            if (transaction.group_id) return false;
          } else if (filters.groupFilter === "group") {
            if (!transaction.group_id) return false;
          } else {
            // Specific group id
            if (transaction.group_id !== filters.groupFilter) return false;
          }
        }

        // Context Filter
        if (filters.contextFilter !== "all") {
          if (filters.contextFilter === "none") {
            if (transaction.context_id) return false;
          } else {
            // Specific context id
            if (transaction.context_id !== filters.contextFilter) return false;
          }
        }

        // Needs Review (uncategorized transactions)
        if (filters.needsReview && transaction.category_id !== UNCATEGORIZED_CATEGORY.ID) return false;

        return true;
      }) || []
    );
  }, [transactions, filters]);

  // Filter available categories based on selected type and group
  const availableCategories = useMemo(() => {
    if (!categories) return [];

    return categories.filter((category) => {
      // Filter by type
      if (filters.type !== "all" && category.type !== filters.type) {
        return false;
      }

      // Filter by group
      if (filters.groupFilter !== "all") {
        if (filters.groupFilter === "personal") {
          // Personal categories have no group_id
          if (category.group_id) return false;
        } else if (filters.groupFilter === "group") {
          // Any group category
          if (!category.group_id) return false;
        } else {
          // Specific group id
          if (category.group_id !== filters.groupFilter) return false;
        }
      }

      return true;
    });
  }, [categories, filters.type, filters.groupFilter]);





  return (
    <div className="space-y-4">
      {/* First row: Title and action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t("transactions")}</h1>
          <Badge variant="secondary" className="px-2 py-0.5 h-6">
            {filteredTransactions.length}
          </Badge>
        </div>
        <div className="flex gap-2">
          {/* Mobile Filter Sheet */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <SheetHeader>
                  <SheetTitle>{t("filters")}</SheetTitle>
                </SheetHeader>
                <FilterContent
                  filters={filters}
                  setFilters={setFilters}
                  availableCategories={availableCategories}
                  groups={groups}
                  contexts={contexts}
                  onReset={handleResetFilters}
                />
              </SheetContent>
            </Sheet>
          </div>

          {/* Date Selectors - Desktop only */}
          <div className="hidden md:flex gap-2">
            <Select
              value={showAllMonths ? "all" : selectedMonth.split("-")[1]}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Filter Popover */}
          <div className="hidden md:block">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {t("filters") || "Filters"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <FilterContent
                  filters={filters}
                  setFilters={setFilters}
                  availableCategories={availableCategories}
                  groups={groups}
                  contexts={contexts}
                  onReset={handleResetFilters}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={openNew}
            size="icon"
            className="md:w-auto md:px-4 md:h-10"
          >
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t("add_transaction")}</span>
          </Button>

          <TransactionDialog
            open={isOpen}
            onOpenChange={setIsOpen}
            onSubmit={handleSubmit}
            editingTransaction={editingTransaction}
          />
        </div>
      </div>

      {/* Second row: Date Selectors - Mobile only */}
      <div className="flex gap-2 md:hidden">
        <Select
          value={showAllMonths ? "all" : selectedMonth.split("-")[1]}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Filters Summary */}
      {(filters.text ||
        filters.dateFrom ||
        filters.dateTo ||
        filters.minAmount ||
        filters.maxAmount ||
        filters.categoryId !== "all" ||
        filters.type !== "all" ||
        filters.groupFilter !== "all" ||
        filters.groupFilter !== "all" ||
        filters.contextFilter !== "all" ||
        filters.needsReview) && (
          <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
            <span>{t("active_filters")}:</span>
            {filters.text && (
              <span className="bg-muted px-2 py-1 rounded-md">
                "{filters.text}"
              </span>
            )}
            {filters.type !== "all" && (
              <span className="bg-muted px-2 py-1 rounded-md capitalize">
                {t(filters.type)}
              </span>
            )}
            {filters.groupFilter !== "all" && (
              <span className="bg-muted px-2 py-1 rounded-md">
                {filters.groupFilter === "personal"
                  ? t("personal")
                  : filters.groupFilter === "group"
                    ? t("all_groups")
                    : groups.find((g) => g.id === filters.groupFilter)?.name ||
                    filters.groupFilter}
              </span>
            )}
            {filters.contextFilter !== "all" && (
              <span className="bg-muted px-2 py-1 rounded-md">
                {filters.contextFilter === "none"
                  ? t("no_contexts")
                  : contexts.find((c) => c.id === filters.contextFilter)?.name ||
                  filters.contextFilter}
              </span>
            )}
            {filters.needsReview && (
              <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-md flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {t("needs_review") || "Needs Review"}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-auto p-0 text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3 mr-1" />
              {t("clear")}
            </Button>
          </div>
        )}

      {/* Mobile View: Card Stack */}
      <TransactionList
        transactions={filteredTransactions}
        categories={categories}
        contexts={contexts}
        groups={groups}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        isLoading={transactions === undefined}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={t("confirm_delete_transaction") || t("confirm_delete")}
        description={
          t("confirm_delete_transaction_description") ||
          t("confirm_delete_description")
        }
      />
    </div>
  );
}
