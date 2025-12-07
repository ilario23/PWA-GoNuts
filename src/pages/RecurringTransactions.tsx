import { useState, useEffect } from "react";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";
import { useContexts } from "@/hooks/useContexts";
import { useGroups } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Play,
  Edit,
  ListFilter,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useTranslation } from "react-i18next";
import { getIconComponent } from "@/lib/icons";
import { SyncStatusBadge } from "@/components/SyncStatus";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isAfter,
  isSameDay,
  parseISO,
  format,
  startOfDay,
} from "date-fns";
import { CategorySelector } from "@/components/CategorySelector";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { RecurringTransactionDetailDrawer } from "@/components/RecurringTransactionDetailDrawer";
import { RecurringTransaction } from "@/lib/db";
import { MobileRecurringTransactionRow } from "@/components/MobileRecurringTransactionRow";

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
      // Only for new recurring transactions
      setFormData((prev) => ({ ...prev, category_id: "" }));
    }
  }, [formData.group_id, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const groupId = formData.group_id || null;
    let paidByMemberId = groupId ? formData.paid_by_member_id : null;

    // Default to me if group selected but no payer selected
    if (groupId && !paidByMemberId && groups) {
      const group = groups.find(g => g.id === groupId);
      const member = group?.members.find(m => m.user_id === user.id);
      if (member) paidByMemberId = member.id;
    }

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
    }
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
    // Default to main section for new recurring transactions
    setActiveSection("main");
    setIsOpen(true);
  };

  const getNextOccurrence = (startDateStr: string, frequency: string) => {
    const startDate = parseISO(startDateStr);
    const today = startOfDay(new Date());

    if (isAfter(startDate, today) || isSameDay(startDate, today)) {
      return format(startDate, "yyyy-MM-dd");
    }

    let nextDate = startDate;
    while (isAfter(today, nextDate)) {
      switch (frequency) {
        case "daily":
          nextDate = addDays(nextDate, 1);
          break;
        case "weekly":
          nextDate = addWeeks(nextDate, 1);
          break;
        case "monthly":
          nextDate = addMonths(nextDate, 1);
          break;
        case "yearly":
          nextDate = addYears(nextDate, 1);
          break;
        default:
          return startDateStr;
      }
    }
    return format(nextDate, "yyyy-MM-dd");
  };

  const getCategoryDisplay = (id?: string) => {
    if (!id) return "-";
    const cat = categories?.find((c) => c.id === id);
    if (!cat) return "-";
    const IconComp = cat.icon ? getIconComponent(cat.icon) : null;
    return (
      <div className="flex items-center gap-2">
        <div
          className="h-4 w-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: cat.color }}
        >
          {IconComp && <IconComp className="h-3 w-3 text-white" />}
        </div>
        {cat.name}
      </div>
    );
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
                toast.success(t("recurring_expenses_added", { count, defaultValue: "{{count}} recurring expenses added" }));
              } else {
                toast.info(t("no_expenses_to_load", { defaultValue: "No expenses to load" }));
              }
            }}
            size="icon"
            className="md:w-auto md:px-4 md:h-10"
          >
            <Play className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t("run_now")}</span>
          </Button>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openNew}
                size="icon"
                className="md:w-auto md:px-4 md:h-10"
              >
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">{t("add_recurring")}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] rounded-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? t("edit_recurring") : t("add_recurring")}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {editingId
                    ? t("edit_recurring_description") ||
                    "Edit recurring transaction details"
                    : t("add_recurring_description") ||
                    "Add a new recurring transaction"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Accordion
                  type="single"
                  collapsible
                  value={activeSection}
                  onValueChange={(value) => setActiveSection(value || "main")}
                  className="w-full"
                >
                  <AccordionItem value="main" className="border-b-0">
                    <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <ListFilter className="h-4 w-4" />
                        {t("transaction_details") || "Details"}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2 px-1">
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
                        <label className="text-sm font-medium">
                          {t("frequency")}
                        </label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={formData.frequency}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              frequency: e.target.value as any,
                            })
                          }
                        >
                          <option value="daily">{t("daily")}</option>
                          <option value="weekly">{t("weekly")}</option>
                          <option value="monthly">{t("monthly")}</option>
                          <option value="yearly">{t("yearly")}</option>
                        </select>
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
                        <label className="text-sm font-medium">
                          {t("start_date")}
                        </label>
                        <Input
                          type="date"
                          value={formData.start_date}
                          onChange={(e) =>
                            setFormData({ ...formData, start_date: e.target.value })
                          }
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
                          groupId={formData.group_id || null}
                          modal
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
                    </AccordionContent>
                  </AccordionItem>

                  {(groups.length > 0 || (contexts && contexts.length > 0)) && (
                    <AccordionItem value="more" className="border-b-0 border-t">
                      <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <SlidersHorizontal className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {t("more_options") || "More"}
                          </span>
                          {(formData.group_id || formData.context_id) && (
                            <Badge className="ml-2">
                              {
                                [formData.group_id, formData.context_id].filter(
                                  Boolean
                                ).length
                              }
                            </Badge>
                          )}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2 px-1">
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
                                    paid_by_member_id:
                                      value === "none"
                                        ? ""
                                        : (() => {
                                          // Default to me (my member ID)
                                          const group = groups.find(g => g.id === value);
                                          const member = group?.members.find(m => m.user_id === user?.id);
                                          return member?.id || "";
                                        })(),
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
                                    formData.paid_by_member_id || ""
                                  }
                                  onValueChange={(value) =>
                                    setFormData({
                                      ...formData,
                                      paid_by_member_id: value,
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
                                          value={member.id}
                                        >
                                          {member.is_guest
                                            ? (member.guest_name || "Guest")
                                            : (member.user_id === user?.id
                                              ? t("me")
                                              : member.displayName || member.user_id?.substring(0, 8))}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </>
                        )}

                        {/* Context Selection */}
                        {contexts && contexts.length > 0 && (
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
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>

                <Button type="submit" className="w-full" autoFocus>
                  {t("save")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("category")}</TableHead>
              <TableHead>{t("frequency")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead className="text-right">{t("amount")}</TableHead>
              <TableHead>{t("next_occurrence") || "Next Occurrence"}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recurringTransactions?.map((t_item) => (
              <TableRow key={t_item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getCategoryDisplay(t_item.category_id)}
                    <SyncStatusBadge isPending={t_item.pendingSync === 1} />
                  </div>
                </TableCell>
                <TableCell className="capitalize">
                  {t(t_item.frequency)}
                </TableCell>
                <TableCell className="capitalize">{t(t_item.type)}</TableCell>
                <TableCell className="text-right">
                  €{t_item.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  {getNextOccurrence(t_item.start_date, t_item.frequency)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(t_item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(t_item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
