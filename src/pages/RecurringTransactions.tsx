import { useState, useEffect } from "react";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";
import { useContexts } from "@/hooks/useContexts";
import { useGroups } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";

import { Plus, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useTranslation } from "react-i18next";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { RecurringTransactionDetailDrawer } from "@/components/RecurringTransactionDetailDrawer";
import { RecurringTransaction } from "@/lib/db";
import { MobileRecurringTransactionRow } from "@/components/MobileRecurringTransactionRow";
import { ValidationError } from "@/lib/validation";

// Extracted components
import { RecurringTransactionFormDialog } from "@/components/recurring/RecurringTransactionFormDialog";
import { RecurringTransactionDesktopTable } from "@/components/recurring/RecurringTransactionDesktopTable";

export function RecurringTransactionsPage() {
  const {
    recurringTransactions,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    generateTransactions,
  } = useRecurringTransactions();
  const { categories } = useCategories();
  const { contexts } = useContexts();
  const { groups } = useGroups();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<RecurringTransaction | null>(null);
  const [activeSection, setActiveSection] = useState("main");
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    type: "expense" as "income" | "expense" | "investment",
    frequency: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
    start_date: new Date().toISOString().split("T")[0],
    category_id: "",
    context_id: "",
    group_id: "" as string | null,
    paid_by_member_id: "" as string | null,
  });

  // Reset category when type changes (only when creating new recurring transaction)
  useEffect(() => {
    if (!editingId && formData.category_id) {
      setFormData((prev) => ({ ...prev, category_id: "" }));
    }
  }, [formData.type, editingId]);

  // Reset category when group changes
  useEffect(() => {
    if (editingId === null) {
      setFormData((prev) => ({ ...prev, category_id: "" }));
    }
  }, [formData.group_id, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.category_id) {
      toast.warning(t("category_required"));
      return;
    }

    const groupId = formData.group_id || null;
    let paidByMemberId = groupId ? formData.paid_by_member_id : null;

    // Default to me if group selected but no payer selected
    if (groupId && !paidByMemberId && groups) {
      const group = groups.find((g) => g.id === groupId);
      const member = group?.members.find((m) => m.user_id === user.id);
      if (member) paidByMemberId = member.id;
    }

    try {
      if (editingId) {
        await updateRecurringTransaction(editingId, {
          amount: parseFloat(formData.amount),
          description: formData.description,
          type: formData.type,
          frequency: formData.frequency,
          start_date: formData.start_date,
          category_id: formData.category_id,
          context_id: formData.context_id || undefined,
          group_id: groupId,
          paid_by_member_id: paidByMemberId,
        });
        toast.success(t("transaction_updated"));
      } else {
        await addRecurringTransaction({
          user_id: user.id,
          amount: parseFloat(formData.amount),
          description: formData.description,
          type: formData.type,
          frequency: formData.frequency,
          start_date: formData.start_date,
          category_id: formData.category_id,
          context_id: formData.context_id || undefined,
          group_id: groupId,
          paid_by_member_id: paidByMemberId,
        });
        toast.success(t("transaction_added"));
      }
      closeAndReset();
    } catch (error) {
      console.error("Error saving recurring transaction:", error);
      if (error instanceof ValidationError) {
        const firstError = error.errors[0];
        toast.error(`${firstError.path.join(".")}: ${firstError.message}`);
      } else {
        toast.error(t("error_saving_transaction"));
      }
    }
  };

  const closeAndReset = () => {
    setIsOpen(false);
    setEditingId(null);
    setActiveSection("main");
    setFormData({
      amount: "",
      description: "",
      category_id: "",
      type: "expense",
      frequency: "monthly",
      start_date: new Date().toISOString().split("T")[0],
      context_id: "",
      group_id: "",
      paid_by_member_id: "",
    });
  };

  const handleEdit = (transaction: any) => {
    setEditingId(transaction.id);
    setFormData({
      amount: transaction.amount.toString(),
      description: transaction.description || "",
      type: transaction.type,
      frequency: transaction.frequency,
      start_date: transaction.start_date,
      category_id: transaction.category_id || "",
      context_id: transaction.context_id || "",
      group_id: transaction.group_id || "",
      paid_by_member_id: transaction.paid_by_member_id || "",
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
    setEditingId(null);
    setFormData({
      amount: "",
      description: "",
      category_id: "",
      type: "expense",
      frequency: "monthly",
      start_date: new Date().toISOString().split("T")[0],
      context_id: "",
      group_id: "",
      paid_by_member_id: "",
    });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("recurring")}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const count = await generateTransactions();
              if (count > 0) {
                toast.success(t("recurring_expenses_added", { count }));
              } else {
                toast.info(t("no_expenses_to_load"));
              }
            }}
            size="icon"
            className="md:w-auto md:px-4 md:h-10"
          >
            <Play className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t("run_now")}</span>
          </Button>
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

      {/* Mobile View: Card Stack */}
      <div className="space-y-2 md:hidden">
        {recurringTransactions?.map((t_item) => (
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
        {(!recurringTransactions || recurringTransactions.length === 0) && (
          <div className="text-center text-muted-foreground py-8">
            {t("no_recurring_transactions")}
          </div>
        )}
      </div>

      {/* Desktop View: Table */}
      <RecurringTransactionDesktopTable
        recurringTransactions={recurringTransactions}
        categories={categories}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* Form Dialog */}
      <RecurringTransactionFormDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        groups={groups}
        contexts={contexts}
        user={user}
        onSubmit={handleSubmit}
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
