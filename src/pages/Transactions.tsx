import { useState, useEffect, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useContexts } from "@/hooks/useContexts";
import { useGroups } from "@/hooks/useGroups";
import { CategorySelector } from "@/components/CategorySelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, Filter, X, ChevronDown, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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

import { format } from "date-fns";

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

  // Generate years for selector (last 5 years + current + next)
  const currentYearNum = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) =>
    (currentYearNum - 5 + i).toString()
  );

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
  const [moreSectionOpen, setMoreSectionOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    type: "expense" as "income" | "expense" | "investment",
    category_id: "",
    date: new Date().toISOString().split("T")[0],
    context_id: "" as string | null,
    group_id: "" as string | null,
    paid_by_user_id: "" as string | null,
  });

  const [filters, setFilters] = useState({
    text: "",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
    categoryId: "all",
    type: "all",
    groupFilter: "all" as "all" | "personal" | "group" | string, // 'all', 'personal', 'group', or specific group id
    contextFilter: "all" as "all" | "none" | string, // 'all', 'none' (no context), or specific context id
  });

  // Reset category when type changes (only when creating new transaction)
  useEffect(() => {
    if (!editingId && formData.category_id) {
      setFormData((prev) => ({ ...prev, category_id: "" }));
    }
  }, [formData.type, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.category_id) {
      alert(t("select_category_required"));
      return;
    }

    const groupId = formData.group_id || undefined;
    const paidByUserId = groupId
      ? formData.paid_by_user_id || user.id
      : undefined;
    const contextId = formData.context_id || undefined;

    if (editingId) {
      await updateTransaction(editingId, {
        amount: parseFloat(formData.amount),
        description: formData.description,
        type: formData.type,
        category_id: formData.category_id,
        date: formData.date,
        year_month: formData.date.substring(0, 7),
        context_id: contextId,
        group_id: groupId,
        paid_by_user_id: paidByUserId,
      });
    } else {
      await addTransaction({
        user_id: user.id,
        amount: parseFloat(formData.amount),
        description: formData.description,
        type: formData.type,
        category_id: formData.category_id,
        date: formData.date,
        year_month: formData.date.substring(0, 7),
        context_id: contextId,
        group_id: groupId,
        paid_by_user_id: paidByUserId,
      });
    }
    setIsOpen(false);
    setEditingId(null);
    setMoreSectionOpen(false);
    setFormData({
      amount: "",
      description: "",
      category_id: "",
      type: "expense",
      date: new Date().toISOString().split("T")[0],
      context_id: "",
      group_id: "",
      paid_by_user_id: "",
    });
  };

  const handleEdit = (transaction: any) => {
    setEditingId(transaction.id);
    setFormData({
      amount: transaction.amount.toString(),
      description: transaction.description || "",
      type: transaction.type,
      category_id: transaction.category_id || "",
      date: transaction.date,
      context_id: transaction.context_id || "",
      group_id: transaction.group_id || "",
      paid_by_user_id: transaction.paid_by_user_id || "",
    });
    // Open the section if transaction has group or context data
    setMoreSectionOpen(!!transaction.group_id || !!transaction.context_id);
    setIsOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({
      amount: "",
      description: "",
      category_id: "",
      type: "expense",
      date: new Date().toISOString().split("T")[0],
      context_id: "",
      group_id: "",
      paid_by_user_id: "",
    });
    setMoreSectionOpen(false);
    setIsOpen(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "expense":
        return "bg-red-500 hover:bg-red-600 text-white";
      case "income":
        return "bg-green-500 hover:bg-green-600 text-white";
      case "investment":
        return "bg-blue-500 hover:bg-blue-600 text-white";
      default:
        return "";
    }
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

        return true;
      }) || []
    );
  }, [transactions, filters]);

  const FilterContent = () => (
    <div className="space-y-4 py-4 px-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("description")}</label>
        <Input
          placeholder={t("search_placeholder") || "Search..."}
          value={filters.text}
          onChange={(e) => setFilters({ ...filters, text: e.target.value })}
          autoFocus={false}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("type")}</label>
        <Select
          value={filters.type}
          onValueChange={(value) => setFilters({ ...filters, type: value })}
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
              setFilters({ ...filters, groupFilter: value })
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
            {categories?.map((category) => (
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

      <Button
        variant="outline"
        onClick={handleResetFilters}
        className="w-full gap-2"
      >
        <X className="h-4 w-4" />
        {t("reset_filters") || "Reset Filters"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* First row: Title and action buttons */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("transactions")}</h1>
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
                <FilterContent />
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
                <FilterContent />
              </PopoverContent>
            </Popover>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openNew}
                size="icon"
                className="md:w-auto md:px-4 md:h-10"
              >
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">{t("add_transaction")}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? t("edit_transaction") : t("add_transaction")}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("type")}</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full ${formData.type === "expense"
                        ? getTypeColor("expense")
                        : ""
                        }`}
                      onClick={() =>
                        setFormData({ ...formData, type: "expense" })
                      }
                    >
                      {t("expense")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full ${formData.type === "income" ? getTypeColor("income") : ""
                        }`}
                      onClick={() =>
                        setFormData({ ...formData, type: "income" })
                      }
                    >
                      {t("income")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full ${formData.type === "investment"
                        ? getTypeColor("investment")
                        : ""
                        }`}
                      onClick={() =>
                        setFormData({ ...formData, type: "investment" })
                      }
                    >
                      {t("investment")}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("amount")}</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Limit to 2 decimal places
                      const match = value.match(/^-?\d*\.?\d{0,2}$/);
                      if (match || value === "") {
                        setFormData({ ...formData, amount: value });
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("category")}</label>
                  <CategorySelector
                    value={formData.category_id}
                    onChange={(value) =>
                      setFormData({ ...formData, category_id: value })
                    }
                    type={formData.type}
                    modal
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("date")}</label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("description")}
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Collapsible More Section - Group & Context */}
                {(groups.length > 0 || contexts.length > 0) && (
                  <Collapsible
                    open={moreSectionOpen}
                    onOpenChange={setMoreSectionOpen}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full flex items-center justify-between p-2 h-auto"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {t("more_options") || "More"}
                          </span>
                          {(formData.group_id || formData.context_id) && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {
                                [formData.group_id, formData.context_id].filter(
                                  Boolean
                                ).length
                              }
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${moreSectionOpen ? "rotate-180" : ""
                            }`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                      {/* Group Selection */}
                      {groups.length > 0 && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              {t("group")}
                            </label>
                            <Select
                              value={formData.group_id || "none"}
                              onValueChange={(value) =>
                                setFormData({
                                  ...formData,
                                  group_id: value === "none" ? "" : value,
                                  paid_by_user_id:
                                    value === "none"
                                      ? ""
                                      : formData.paid_by_user_id ||
                                      user?.id ||
                                      "",
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t("select_group")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  {t("personal_expense")}
                                </SelectItem>
                                {groups.map((group) => (
                                  <SelectItem key={group.id} value={group.id}>
                                    {group.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {formData.group_id && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                {t("paid_by")}
                              </label>
                              <Select
                                value={
                                  formData.paid_by_user_id || user?.id || ""
                                }
                                onValueChange={(value) =>
                                  setFormData({
                                    ...formData,
                                    paid_by_user_id: value,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t("select_payer")}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {groups
                                    .find((g) => g.id === formData.group_id)
                                    ?.members.map((member) => (
                                      <SelectItem
                                        key={member.id}
                                        value={member.user_id}
                                      >
                                        {member.user_id === user?.id
                                          ? t("me")
                                          : member.user_id.substring(0, 8) +
                                          "..."}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </>
                      )}

                      {/* Context Selection */}
                      {contexts.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("context")}
                          </label>
                          <Select
                            value={formData.context_id || "none"}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                context_id: value === "none" ? "" : value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t("select_context")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                {t("no_context")}
                              </SelectItem>
                              {contexts.map((ctx) => (
                                <SelectItem key={ctx.id} value={ctx.id}>
                                  {ctx.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <Button type="submit" className="w-full">
                  {t("save")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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
        filters.contextFilter !== "all") && (
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
                  ? t("no_context")
                  : contexts.find((c) => c.id === filters.contextFilter)?.name ||
                  filters.contextFilter}
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
