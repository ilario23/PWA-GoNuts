import { useState, useMemo } from "react";

import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useContexts } from "@/hooks/useContexts";
import { useGroups } from "@/hooks/useGroups";
import { Transaction } from "@/lib/db";
import { useAvailableYears } from "@/hooks/useAvailableYears";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useTranslation } from "react-i18next";
import { TransactionList } from "@/components/TransactionList";

import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { TransactionDialog, TransactionFormData } from "@/components/TransactionDialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";


export function TransactionsPage() {
  const { t } = useTranslation();
  const { categories } = useCategories();
  const { contexts } = useContexts();
  const { groups } = useGroups();
  const { user } = useAuth();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(now, "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState(format(now, "yyyy"));
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Using existing hook
  const { transactions, addTransaction, updateTransaction, deleteTransaction } =
    useTransactions(undefined, showAllMonths ? selectedYear : selectedMonth);

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);


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

  // Helper for Month/Year selection
  const years = useAvailableYears();
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

  return (
    <div className="space-y-4">
      {/* Header Area */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 -mx-4 px-4 md:mx-0 md:px-0 border-b md:border-none">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t("transactions")}</h1>
          <Badge variant="secondary" className="px-2 py-0.5 h-6">
            {transactions?.length || 0}
          </Badge>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {/* Scope Selectors (Month/Year) */}
          <div className="flex gap-2">
            <Select
              value={showAllMonths ? "all" : selectedMonth.split("-")[1]}
              onValueChange={handleMonthChange}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder={t("month")} />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedYear}
              onValueChange={(year) => {
                setSelectedYear(year);
                if (showAllMonths) {
                  setSelectedMonth(year);
                } else {
                  const currentMonthPart = selectedMonth.split("-")[1];
                  setSelectedMonth(`${year}-${currentMonthPart}`);
                }
              }}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder={t("year")} />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={openNew} size="icon" className="md:w-auto md:px-4">
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t("add_transaction")}</span>
          </Button>
        </div>
      </div>

      {/* Transactions List */}
      <TransactionList
        transactions={transactions}
        categories={categories}
        contexts={contexts}
        groups={groups}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        isLoading={transactions === undefined}
      />

      <TransactionDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        onSubmit={handleSubmit}
        editingTransaction={editingTransaction}
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
