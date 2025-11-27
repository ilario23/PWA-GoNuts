import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryBudgets } from "@/hooks/useCategoryBudgets";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Target, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AVAILABLE_ICONS, getIconComponent } from "@/lib/icons";
import { SyncStatusBadge } from "@/components/SyncStatus";
import { CategorySelector } from "@/components/CategorySelector";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

export function CategoriesPage() {
  const { t } = useTranslation();
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reparentChildren,
  } = useCategories();
  const {
    budgetsWithSpent,
    setCategoryBudget,
    removeCategoryBudget,
    getBudgetForCategory,
  } = useCategoryBudgets();
  const { user } = useAuth();

  // Fetch all transactions to check for associations
  const transactions = useLiveQuery(async () => {
    const { db } = await import("@/lib/db");
    return db.transactions.toArray();
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Budget Dialog State
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetCategoryId, setBudgetCategoryId] = useState<string | null>(null);
  const [budgetAmount, setBudgetAmount] = useState<string>("");

  // Conflict Resolution State
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{
    action: "delete" | "deactivate";
    targetId: string;
    childrenCount: number;
    parentName?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    color: "#000000",
    type: "expense" as "income" | "expense" | "investment",
    icon: "",
    parent_id: "",
    active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.icon) {
      alert(t("icon_required") || "Please select an icon");
      return;
    }

    if (editingId) {
      // Check for deactivation conflict
      if (!formData.active) {
        const hasChildren = categories?.some(
          (c) => c.parent_id === editingId && !c.deleted_at
        );
        if (hasChildren) {
          const currentCategory = categories?.find((c) => c.id === editingId);
          const parentCategory = currentCategory?.parent_id
            ? categories?.find((c) => c.id === currentCategory.parent_id)
            : null;

          setConflictData({
            action: "deactivate",
            targetId: editingId,
            childrenCount:
              categories?.filter(
                (c) => c.parent_id === editingId && !c.deleted_at
              ).length || 0,
            parentName: parentCategory?.name,
          });
          setConflictDialogOpen(true);
          return; // Stop here, wait for conflict resolution
        }
      }

      await updateCategory(editingId, {
        name: formData.name,
        color: formData.color,
        type: formData.type,
        icon: formData.icon,
        parent_id: formData.parent_id || undefined,
        active: formData.active ? 1 : 0,
      });
    } else {
      await addCategory({
        user_id: user.id,
        name: formData.name,
        color: formData.color,
        type: formData.type,
        icon: formData.icon,
        parent_id: formData.parent_id || undefined,
        active: formData.active ? 1 : 0,
      });
    }
    setIsOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      color: "#000000",
      type: "expense",
      icon: "",
      parent_id: "",
      active: true,
    });
  };

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      color: category.color,
      type: category.type,
      icon: category.icon || "",
      parent_id: category.parent_id || "",
      active: category.active !== 0,
    });
    setIsOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({
      name: "",
      color: "#000000",
      type: "expense",
      icon: "",
      parent_id: "",
      active: true,
    });
    setIsOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    // Check for associated transactions
    const associatedTransactions = transactions?.filter(
      (t) => t.category_id === id && !t.deleted_at
    );
    const transactionCount = associatedTransactions?.length || 0;

    // Check for children
    const hasChildren = categories?.some(
      (c) => c.parent_id === id && !c.deleted_at
    );

    if (transactionCount > 0) {
      // Show warning about transactions
      alert(
        t("category_has_transactions_warning", { count: transactionCount }) ||
          `Warning: This category has ${transactionCount} associated transaction(s). Deleting it will leave these transactions without a category.`
      );
    }

    if (hasChildren) {
      const currentCategory = categories?.find((c) => c.id === id);
      const parentCategory = currentCategory?.parent_id
        ? categories?.find((c) => c.id === currentCategory.parent_id)
        : null;

      setConflictData({
        action: "delete",
        targetId: id,
        childrenCount:
          categories?.filter((c) => c.parent_id === id && !c.deleted_at)
            .length || 0,
        parentName: parentCategory?.name,
      });
      setConflictDialogOpen(true);
      return;
    }

    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      deleteCategory(deletingId);
      setDeletingId(null);
    }
  };

  const handleConflictResolve = async () => {
    if (!conflictData) return;

    const targetCategory = categories?.find(
      (c) => c.id === conflictData.targetId
    );
    const newParentId = targetCategory?.parent_id;

    // 1. Reparent children
    await reparentChildren(conflictData.targetId, newParentId);

    // 2. Perform original action
    if (conflictData.action === "delete") {
      await deleteCategory(conflictData.targetId);
    } else if (conflictData.action === "deactivate") {
      await updateCategory(conflictData.targetId, {
        name: formData.name,
        color: formData.color,
        type: formData.type,
        icon: formData.icon,
        parent_id: formData.parent_id || undefined,
        active: 0, // Force inactive
      });
      setIsOpen(false);
      setEditingId(null);
      setFormData({
        name: "",
        color: "#000000",
        type: "expense",
        icon: "",
        parent_id: "",
        active: true,
      });
    }

    setConflictDialogOpen(false);
    setConflictData(null);
  };

  // Budget handlers
  const handleOpenBudgetDialog = (categoryId: string) => {
    const existingBudget = getBudgetForCategory(categoryId);
    setBudgetCategoryId(categoryId);
    setBudgetAmount(existingBudget ? existingBudget.amount.toString() : "");
    setBudgetDialogOpen(true);
  };

  const handleSaveBudget = async () => {
    if (!budgetCategoryId || !budgetAmount) return;
    await setCategoryBudget(budgetCategoryId, parseFloat(budgetAmount));
    setBudgetDialogOpen(false);
    setBudgetCategoryId(null);
    setBudgetAmount("");
  };

  const handleRemoveBudget = async () => {
    if (!budgetCategoryId) return;
    await removeCategoryBudget(budgetCategoryId);
    setBudgetDialogOpen(false);
    setBudgetCategoryId(null);
    setBudgetAmount("");
  };

  // Helper function to get budget info for a category
  const getCategoryBudgetInfo = (categoryId: string) => {
    return budgetsWithSpent?.find((b) => b.category_id === categoryId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("categories")}</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openNew}
              size="icon"
              className="md:w-auto md:px-4 md:h-10"
            >
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t("add_category")}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md w-[95vw] rounded-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? t("edit_category") : t("add_category")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("name")}</label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("color")}</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="h-10 w-20 p-1"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("type")}</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className={`w-full ${
                      formData.type === "expense"
                        ? "bg-red-500 hover:bg-red-600 text-white"
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
                    className={`w-full ${
                      formData.type === "income"
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : ""
                    }`}
                    onClick={() => setFormData({ ...formData, type: "income" })}
                  >
                    {t("income")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={`w-full ${
                      formData.type === "investment"
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
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
                <label className="text-sm font-medium">{t("icon")}</label>
                <div className="grid grid-cols-6 gap-2 p-2 border rounded-md max-h-[200px] overflow-y-auto">
                  {AVAILABLE_ICONS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        className={`p-2 rounded-md flex items-center justify-center hover:bg-accent ${
                          formData.icon === item.name
                            ? "bg-accent ring-2 ring-primary"
                            : ""
                        }`}
                        onClick={() =>
                          setFormData({ ...formData, icon: item.name })
                        }
                        title={item.name}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("parent_category")}
                </label>
                <CategorySelector
                  value={formData.parent_id}
                  onChange={(value) =>
                    setFormData({ ...formData, parent_id: value })
                  }
                  type={formData.type}
                  excludeId={editingId || undefined}
                  modal
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active-mode"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
                <label htmlFor="active-mode" className="text-sm font-medium">
                  {t("active") || "Active"}
                </label>
              </div>
              <Button type="submit" className="w-full">
                {t("save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mobile View: Card Stack */}
      <div className="space-y-4 md:hidden">
        {categories?.map((c) => {
          const budgetInfo =
            c.type === "expense" ? getCategoryBudgetInfo(c.id) : null;
          return (
            <div key={c.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.icon &&
                      (() => {
                        const IconComp = getIconComponent(c.icon);
                        return IconComp ? (
                          <IconComp className="h-4 w-4" />
                        ) : null;
                      })()}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {c.name}
                      <SyncStatusBadge isPending={c.pendingSync === 1} />
                      {c.active === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {t("inactive") || "Inactive"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {t(c.type)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {c.type === "expense" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenBudgetDialog(c.id)}
                    >
                      <Target
                        className={`h-4 w-4 ${
                          budgetInfo ? "text-primary" : ""
                        }`}
                      />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(c)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteClick(c.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {/* Budget progress bar for mobile */}
              {budgetInfo && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {t("budget")}: {budgetInfo.amount.toFixed(2)}
                    </span>
                    <span
                      className={
                        budgetInfo.percentage > 100 ? "text-destructive" : ""
                      }
                    >
                      {budgetInfo.spent.toFixed(2)} (
                      {budgetInfo.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        budgetInfo.percentage > 100
                          ? "bg-destructive"
                          : budgetInfo.percentage > 80
                          ? "bg-yellow-500"
                          : "bg-primary"
                      }`}
                      style={{
                        width: `${Math.min(budgetInfo.percentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("budget")}</TableHead>
              <TableHead>{t("status") || "Status"}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories?.map((c) => {
              const budgetInfo =
                c.type === "expense" ? getCategoryBudgetInfo(c.id) : null;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.icon &&
                        (() => {
                          const IconComp = getIconComponent(c.icon);
                          return IconComp ? (
                            <IconComp className="h-4 w-4" />
                          ) : null;
                        })()}
                      {c.name}
                      <SyncStatusBadge isPending={c.pendingSync === 1} />
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{t(c.type)}</TableCell>
                  <TableCell>
                    {c.type === "expense" ? (
                      budgetInfo ? (
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex justify-between text-xs">
                            <span>
                              {budgetInfo.spent.toFixed(0)} /{" "}
                              {budgetInfo.amount.toFixed(0)}
                            </span>
                            <span
                              className={
                                budgetInfo.percentage > 100
                                  ? "text-destructive"
                                  : ""
                              }
                            >
                              {budgetInfo.percentage.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                budgetInfo.percentage > 100
                                  ? "bg-destructive"
                                  : budgetInfo.percentage > 80
                                  ? "bg-yellow-500"
                                  : "bg-primary"
                              }`}
                              style={{
                                width: `${Math.min(
                                  budgetInfo.percentage,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.active === 0 ? (
                      <Badge variant="secondary">
                        {t("inactive") || "Inactive"}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-600"
                      >
                        {t("active") || "Active"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {c.type === "expense" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenBudgetDialog(c.id)}
                          title={t("set_budget")}
                        >
                          <Target
                            className={`h-4 w-4 ${
                              budgetInfo ? "text-primary" : ""
                            }`}
                          />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(c)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(c.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={t("confirm_delete_category") || t("confirm_delete")}
        description={
          t("confirm_delete_category_description") ||
          t("confirm_delete_description")
        }
      />

      <AlertDialog
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("warning_subcategories") || "Warning: Subcategories Detected"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("subcategory_conflict_description", {
                count: conflictData?.childrenCount,
                parentName:
                  conflictData?.parentName || t("root_category") || "Root",
              }) ||
                `This category has ${
                  conflictData?.childrenCount
                } subcategories. ${
                  conflictData?.action === "delete"
                    ? "Deleting"
                    : "Deactivating"
                } it will make them inaccessible. Do you want to move them to the parent category (${
                  conflictData?.parentName || "Root"
                })?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConflictResolve}>
              {t("move_children_and_proceed") || "Move Children & Proceed"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent className="max-w-sm w-[95vw] rounded-lg">
          <DialogHeader>
            <DialogTitle>{t("set_budget")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("monthly_limit")}
              </label>
              <Input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex gap-2">
              {getBudgetForCategory(budgetCategoryId || "") && (
                <Button
                  variant="destructive"
                  onClick={handleRemoveBudget}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t("remove_budget")}
                </Button>
              )}
              <Button
                onClick={handleSaveBudget}
                disabled={!budgetAmount}
                className="flex-1"
              >
                {t("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
