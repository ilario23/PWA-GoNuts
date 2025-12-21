import { useState, useMemo } from "react";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";
import { useContexts } from "@/hooks/useContexts";
import { useGroups } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";

import { Plus, Search, FilterX } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useTranslation } from "react-i18next";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { RecurringTransactionDetailDrawer } from "@/components/RecurringTransactionDetailDrawer";
import { RecurringTransaction } from "@/lib/db";
import { MobileRecurringTransactionRow } from "@/components/MobileRecurringTransactionRow";
import { RecurringTransactionFormValues } from "@/lib/schemas";

// Extracted components
import { RecurringTransactionFormDialog } from "@/components/recurring/RecurringTransactionFormDialog";
import { RecurringTransactionDesktopTable } from "@/components/recurring/RecurringTransactionDesktopTable";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export function RecurringTransactionsPage() {
  const {
    recurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
  } = useRecurringTransactions();
  const { categories } = useCategories();

  const loadingTransactions = recurringTransactions === undefined;
  const loadingCategories = categories === undefined;
  const { contexts } = useContexts();
  const { groups } = useGroups();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  // We store the transaction being edited as "initialData" for the form
  const [editingTransaction, setEditingTransaction] = useState<
    RecurringTransactionFormValues & { id: string } | null
  >(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<RecurringTransaction | null>(null);
  const [activeSection, setActiveSection] = useState("main");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: RecurringTransactionFormValues) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      if (editingTransaction?.id) {
        await updateRecurringTransaction(editingTransaction.id, {
          ...data,
          group_id: data.group_id || null, // Ensure explicit null if undefined/none
          paid_by_member_id: data.paid_by_member_id || null,
          context_id: data.context_id || undefined,
        });
        toast.success(t("transaction_updated"));
      } else {
        await addRecurringTransaction({
          user_id: user.id,
          ...data,
          group_id: data.group_id || null,
          paid_by_member_id: data.paid_by_member_id || null,
          context_id: data.context_id || undefined,
        });
        toast.success(t("transaction_added"));
      }
      setIsOpen(false);
      setEditingTransaction(null);
      setActiveSection("main");
    } catch (error) {
      console.error("Error saving recurring transaction:", error);
      toast.error(t("error_saving_transaction"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (transaction: RecurringTransaction) => {
    setEditingTransaction({
      id: transaction.id,
      amount: transaction.amount,
      description: transaction.description || "",
      type: transaction.type,
      frequency: transaction.frequency,
      start_date: transaction.start_date,
      category_id: transaction.category_id || "",
      context_id: transaction.context_id || "",
      group_id: transaction.group_id || null,
      paid_by_member_id: transaction.paid_by_member_id || null,
    });
    // Auto-open 'more' if advanced fields are present
    if (!!transaction.group_id || !!transaction.context_id) {
      setActiveSection("more");
    } else {
      setActiveSection("main");
    }
    setIsOpen(true);
  };

  const openNew = () => {
    setEditingTransaction(null);
    setActiveSection("main");
    setIsOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      deleteRecurringTransaction(deletingId);
      setDeletingId(null);
    }
  };

  const handleTransactionClick = (transaction: RecurringTransaction) => {
    setSelectedTransaction(transaction);
    setDetailDrawerOpen(true);
  };

  // Filter Logic
  const filteredTransactions = useMemo(() => {
    if (!recurringTransactions) return [];

    return recurringTransactions.filter((tx) => {
      // Search Query (Description)
      if (
        searchQuery &&
        !tx.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Type Filter
      if (typeFilter !== "all" && tx.type !== typeFilter) {
        return false;
      }

      // Category Filter
      if (categoryFilter !== "all" && tx.category_id !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [recurringTransactions, searchQuery, typeFilter, categoryFilter]);

  const isLoading = loadingTransactions || loadingCategories;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("recurring")}</h1>
        <div className="flex gap-2">
          <Button
            onClick={openNew}
            size="icon"
            className="md:w-auto md:px-4 md:h-10"
          >
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t("add_recurring")}</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search_transactions") || "Search..."}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t("type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_types") || "All"}</SelectItem>
              <SelectItem value="expense">{t("expense")}</SelectItem>
              <SelectItem value="income">{t("income")}</SelectItem>
              <SelectItem value="investment">{t("investment")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t("category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_categories") || "All"}</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchQuery || typeFilter !== "all" || categoryFilter !== "all") && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("all");
                setCategoryFilter("all");
              }}
              title={t("clear_filters")}
            >
              <FilterX className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[100px] w-full rounded-xl" />
          <Skeleton className="h-[100px] w-full rounded-xl" />
          <Skeleton className="h-[100px] w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Mobile View: Card Stack */}
          <div className="space-y-2 md:hidden">
            {filteredTransactions.map((t_item) => (
              <MobileRecurringTransactionRow
                key={t_item.id}
                transaction={t_item}
                category={categories?.find((c) => c.id === t_item.category_id)}
                context={contexts?.find((c) => c.id === t_item.context_id)}
                group={groups?.find((g) => g.id === t_item.group_id)}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onClick={handleTransactionClick}
              />
            ))}
            {filteredTransactions.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {recurringTransactions && recurringTransactions.length > 0
                  ? t("no_results_found")
                  : t("no_recurring_transactions")}
              </div>
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block">
            <RecurringTransactionDesktopTable
              recurringTransactions={filteredTransactions}
              categories={categories}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          </div>
        </>
      )}

      {/* Form Dialog */}
      <RecurringTransactionFormDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        initialData={editingTransaction}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        groups={groups}
        contexts={contexts}
        user={user}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={t("confirm_delete_recurring") || t("confirm_delete")}
        description={
          t("confirm_delete_recurring_description") ||
          t("confirm_delete_description")
        }
      />

      <RecurringTransactionDetailDrawer
        transaction={selectedTransaction}
        category={categories?.find(
          (c) => c.id === selectedTransaction?.category_id
        )}
        context={contexts?.find(
          (c) => c.id === selectedTransaction?.context_id
        )}
        group={groups?.find((g) => g.id === selectedTransaction?.group_id)}
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />
    </div>
  );
}
