import { useState, useMemo } from "react";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";
import { useContexts } from "@/hooks/useContexts";
import { useGroups } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Plus, Search, FilterX, Repeat } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useTranslation } from "react-i18next";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { RecurringTransactionDetailDrawer } from "@/components/RecurringTransactionDetailDrawer";
import { RecurringTransaction } from "@/lib/db";
import { MobileRecurringTransactionRow } from "@/components/MobileRecurringTransactionRow";
import { RecurringTransactionFormValues } from "@/lib/schemas";

import { RecurringTransactionFormDialog } from "@/components/recurring/RecurringTransactionFormDialog";
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

  const handleToggle = async (id: string, active: boolean) => {
    await updateRecurringTransaction(id, { active: active ? 1 : 0 });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("recurring")}</h1>
        <Button
          onClick={openNew}
          size="sm"
          className="gap-1.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("add_recurring")}</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search_transactions") || "Search..."}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
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

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-[72px] w-full rounded-[var(--radius)]" />
          <Skeleton className="h-[72px] w-full rounded-[var(--radius)]" />
          <Skeleton className="h-[72px] w-full rounded-[var(--radius)]" />
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Repeat className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">
              {recurringTransactions && recurringTransactions.length > 0
                ? t("no_results_found")
                : t("no_recurring_transactions")}
            </h3>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((t_item) => (
            <MobileRecurringTransactionRow
              key={t_item.id}
              transaction={t_item}
              category={categories?.find((c) => c.id === t_item.category_id)}
              context={contexts?.find((c) => c.id === t_item.context_id)}
              group={groups?.find((g) => g.id === t_item.group_id)}
              onClick={handleTransactionClick}
              onToggle={handleToggle}
            />
          ))}
        </div>
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
