import { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryBudgets } from "@/hooks/useCategoryBudgets";
import { useGroups } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, EyeOff, Eye, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { CategoryDetailDrawer } from "@/components/CategoryDetailDrawer";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import type { Category } from "@/lib/db";

// Extracted components
import { CategoryFormDialog } from "@/components/categories/CategoryFormDialog";
import { CategoryMobileList } from "@/components/categories/CategoryMobileList";
import { CategoryDesktopTable } from "@/components/categories/CategoryDesktopTable";
import { CategoryBudgetDialog } from "@/components/categories/CategoryBudgetDialog";
import { CategoryMigrationDialog } from "@/components/categories/CategoryMigrationDialog";

export function CategoriesPage() {
  const { t } = useTranslation();

  // Filter State - must be defined before hook calls
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<
    string | null | undefined
  >(null);

  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reparentChildren,
    migrateTransactions,
  } = useCategories(selectedGroupFilter);

  const { groups } = useGroups();
  const {
    budgetsWithSpent,
    setCategoryBudget,
    removeCategoryBudget,
    getBudgetForCategory,
  } = useCategoryBudgets();
  const { user } = useAuth();

  // Fetch all transactions and recurring transactions to check for associations
  const transactions = useLiveQuery(async () => {
    const { db } = await import("@/lib/db");
    return db.transactions.toArray();
  });

  const recurringTransactions = useLiveQuery(async () => {
    const { db } = await import("@/lib/db");
    return db.recurring_transactions.toArray();
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Budget Dialog State
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [budgetCategoryId, setBudgetCategoryId] = useState<string | null>(null);
  const [budgetAmount, setBudgetAmount] = useState<string>("");

  // Category Detail Sheet State
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  // Filter State
  const [showInactive, setShowInactive] = useState(false);

  // Expanded categories state for mobile collapse/expand
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(
    new Set()
  );

  // Conflict Resolution State
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{
    action: "delete" | "deactivate";
    targetId: string;
    childrenCount: number;
    parentName?: string;
  } | null>(null);

  const [activeSection, setActiveSection] = useState("main");

  const [formData, setFormData] = useState({
    name: "",
    color: "#000000",
    type: "expense" as "income" | "expense" | "investment",
    icon: "",
    parent_id: "",
    active: true,
    budget: "",
    group_id: "",
  });

  // Reset parent_id when group_id changes
  useEffect(() => {
    if (formData.name || formData.icon) {
      setFormData((prev) => ({
        ...prev,
        parent_id: "",
      }));
    }
  }, [formData.group_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.icon) {
      alert(t("icon_required"));
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
          return;
        }
      }

      await updateCategory(editingId, {
        name: formData.name,
        color: formData.color,
        type: formData.type,
        icon: formData.icon,
        parent_id: formData.parent_id || undefined,
        active: formData.active ? 1 : 0,
        group_id: formData.group_id || undefined,
      });

      if (formData.type === "expense" && formData.budget) {
        await setCategoryBudget(editingId, parseFloat(formData.budget));
      } else if (formData.type === "expense" && !formData.budget) {
        await removeCategoryBudget(editingId);
      }
    } else {
      const newCategoryId = crypto.randomUUID();

      await addCategory({
        ...({
          id: newCategoryId,
          user_id: user.id,
          name: formData.name,
          color: formData.color,
          type: formData.type,
          icon: formData.icon,
          parent_id: formData.parent_id || undefined,
          active: formData.active ? 1 : 0,
          group_id: formData.group_id || undefined,
        } as any),
      });

      if (formData.type === "expense" && formData.budget) {
        await setCategoryBudget(newCategoryId, parseFloat(formData.budget));
      }
    }
    setIsOpen(false);
    setEditingId(null);
    resetFormData();
  };

  const resetFormData = () => {
    setFormData({
      name: "",
      color: "#000000",
      type: "expense",
      icon: "",
      parent_id: "",
      active: true,
      budget: "",
      group_id: "",
    });
  };

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    const categoryBudget =
      category.type === "expense" ? getBudgetForCategory(category.id) : null;

    setFormData({
      name: category.name,
      color: category.color,
      type: category.type,
      icon: category.icon || "",
      parent_id: category.parent_id || "",
      active: category.active !== 0,
      budget: categoryBudget ? categoryBudget.amount.toString() : "",
      group_id: category.group_id || "",
    });

    if (
      !!category.group_id ||
      (categoryBudget && categoryBudget.amount > 0) ||
      category.active === 0
    ) {
      setActiveSection("more");
    } else {
      setActiveSection("main");
    }
    setIsOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    resetFormData();
    setActiveSection("main");
    setIsOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    const associatedTransactions = transactions?.filter(
      (t) => t.category_id === id && !t.deleted_at
    );
    const transactionCount = associatedTransactions?.length || 0;

    const hasChildren = categories?.some(
      (c) => c.parent_id === id && !c.deleted_at
    );

    const category = categories?.find((c) => c.id === id);
    const isGroupCategory = !!category?.group_id;

    const associatedRecurring = recurringTransactions?.filter(
      (r) => r.category_id === id && !r.deleted_at
    );
    const recurringCount = associatedRecurring?.length || 0;

    if (transactionCount > 0 || recurringCount > 0) {
      setMigrationData({
        oldCategoryId: id,
        transactionCount,
        recurringCount,
      });
      setMigrationDialogOpen(true);
      return;
    }

    if (isGroupCategory) {
      alert(t("group_category_delete_warning"));
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

    await reparentChildren(conflictData.targetId, newParentId);

    if (conflictData.action === "delete") {
      await deleteCategory(conflictData.targetId);
    } else if (conflictData.action === "deactivate") {
      await updateCategory(conflictData.targetId, {
        name: formData.name,
        color: formData.color,
        type: formData.type,
        icon: formData.icon,
        parent_id: formData.parent_id || undefined,
        active: 0,
      });
      setIsOpen(false);
      setEditingId(null);
      resetFormData();
    }

    setConflictDialogOpen(false);
    setConflictData(null);
  };

  // Migration State
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  const [migrationData, setMigrationData] = useState<{
    oldCategoryId: string;
    transactionCount: number;
    recurringCount: number;
  } | null>(null);
  const [migrationTargetId, setMigrationTargetId] = useState<string>("");

  const handleMigrationResolve = async () => {
    if (!migrationData || !migrationTargetId) return;

    await migrateTransactions(migrationData.oldCategoryId, migrationTargetId);
    await deleteCategory(migrationData.oldCategoryId);

    setMigrationDialogOpen(false);
    setMigrationData(null);
    setMigrationTargetId("");
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

  const getCategoryBudgetInfo = (categoryId: string) => {
    return budgetsWithSpent?.find((b) => b.category_id === categoryId);
  };

  // Filter categories based on showInactive state
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (showInactive) return categories;
    return categories.filter((c) => c.active !== 0);
  }, [categories, showInactive]);

  // Sort categories: Active first, then Alphabetical
  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => {
      // 1. Sort by Active status (Active=1 first, Inactive=0 last)
      if (a.active !== b.active) {
        return b.active - a.active;
      }
      // 2. Sort by Name
      return a.name.localeCompare(b.name);
    });
  }, [filteredCategories]);

  // Build a map of parent_id -> children for quick lookup
  const childrenMap = useMemo(() => {
    if (!sortedCategories.length) return new Map<string, Category[]>();

    const map = new Map<string | undefined, Category[]>();

    sortedCategories.forEach((cat) => {
      const parentId = cat.parent_id || undefined;
      const siblings = map.get(parentId) || [];
      siblings.push(cat);
      map.set(parentId, siblings);
    });

    return map;
  }, [sortedCategories]);

  const rootCategories = useMemo(() => {
    const roots: Category[] = [];
    const visibleIds = new Set(sortedCategories.map((c) => c.id));

    sortedCategories.forEach((c) => {
      // It is a root if:
      // 1. No parent_id
      // 2. OR parent_id exists but parent is NOT in the visible set (Orphan)
      //    (This happens if parent is deleted, or filtered out e.g. by group)
      const isOrphan = c.parent_id && !visibleIds.has(c.parent_id);

      if (!c.parent_id || isOrphan) {
        roots.push(c);
      }
    });

    return roots;
  }, [sortedCategories]);

  const getChildren = (categoryId: string) => {
    return childrenMap.get(categoryId) || [];
  };

  const hasChildren = (categoryId: string) => {
    return getChildren(categoryId).length > 0;
  };

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    setDetailSheetOpen(true);
  };

  const getParentCategory = (parentId?: string) => {
    if (!parentId) return null;
    return categories?.find((c) => c.id === parentId) || null;
  };

  const getChildrenCount = (categoryId: string) => {
    return getChildren(categoryId).length;
  };

  const isLoading = !categories;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t("categories")}</h1>
        <div className="flex items-center gap-2">
          {/* Show Inactive Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowInactive(!showInactive)}
            className={`transition-colors md:w-auto md:px-4 md:h-10 ${showInactive
              ? "bg-primary/10 text-primary border-primary/20"
              : ""
              }`}
          >
            {showInactive ? (
              <Eye className="h-4 w-4 md:mr-2" />
            ) : (
              <EyeOff className="h-4 w-4 md:mr-2" />
            )}
            <span className="hidden md:inline">
              {t("show_inactive")}
            </span>
          </Button>

          {/* Group Filter Dropdown */}
          {groups.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-2 px-3">
                  <Users className="h-4 w-4" />
                  <span className="hidden md:inline">
                    {selectedGroupFilter === undefined
                      ? t("all_categories")
                      : selectedGroupFilter === null
                        ? t("personal_categories")
                        : groups.find((g) => g.id === selectedGroupFilter)
                          ?.name || t("group")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>{t("filter_by")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={
                    selectedGroupFilter === undefined
                      ? "all"
                      : selectedGroupFilter === null
                        ? "personal"
                        : selectedGroupFilter
                  }
                  onValueChange={(value) =>
                    setSelectedGroupFilter(
                      value === "all"
                        ? undefined
                        : value === "personal"
                          ? null
                          : value
                    )
                  }
                >
                  <DropdownMenuRadioItem value="all">
                    {t("all_categories")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="personal">
                    {t("personal_categories")}
                  </DropdownMenuRadioItem>
                  {groups.map((group) => (
                    <DropdownMenuRadioItem key={group.id} value={group.id}>
                      {group.name}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            onClick={openNew}
            size="icon"
            className="md:w-auto md:px-4 md:h-10"
          >
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t("add_category")}</span>
          </Button>
        </div>
      </div>

      {/* Mobile View */}
      <CategoryMobileList
        categories={categories}
        filteredCategories={filteredCategories}
        expandedCategoryIds={expandedCategoryIds}
        setExpandedCategoryIds={setExpandedCategoryIds}
        groups={groups}
        getBudgetForCategory={getBudgetForCategory}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onCategoryClick={handleCategoryClick}
        isLoading={isLoading}
      />

      {/* Desktop View */}
      <CategoryDesktopTable
        rootCategories={rootCategories}
        getChildren={getChildren}
        hasChildren={hasChildren}
        expandedCategories={expandedCategories}
        toggleCategory={toggleCategory}
        onCategoryClick={handleCategoryClick}
        groups={groups}
        isLoading={isLoading}
        t={t}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* Form Dialog */}
      <CategoryFormDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        editingId={editingId}
        formData={formData}
        setFormData={setFormData}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        groups={groups}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={t("confirm_delete_category")}
        description={t("confirm_delete_category_description")}
      />

      <AlertDialog
        open={conflictDialogOpen}
        onOpenChange={setConflictDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("warning_subcategories")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("subcategory_conflict_description", {
                count: conflictData?.childrenCount,
                parentName: conflictData?.parentName || t("root_category"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConflictResolve}>
              {t("move_children_and_proceed")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Budget Dialog */}
      <CategoryBudgetDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        budgetAmount={budgetAmount}
        setBudgetAmount={setBudgetAmount}
        hasExistingBudget={!!getBudgetForCategory(budgetCategoryId || "")}
        onSave={handleSaveBudget}
        onRemove={handleRemoveBudget}
      />

      {/* Category Detail Drawer */}
      <CategoryDetailDrawer
        category={selectedCategory}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        budgetInfo={
          selectedCategory?.type === "expense" && selectedCategory
            ? getCategoryBudgetInfo(selectedCategory.id)
            : null
        }
        parentCategory={getParentCategory(selectedCategory?.parent_id)}
        childrenCount={
          selectedCategory ? getChildrenCount(selectedCategory.id) : 0
        }
        groupName={
          selectedCategory?.group_id
            ? groups.find((g) => g.id === selectedCategory.group_id)?.name
            : undefined
        }
        onEdit={() => selectedCategory && handleEdit(selectedCategory)}
        onDelete={() =>
          selectedCategory && handleDeleteClick(selectedCategory.id)
        }
        onSetBudget={() =>
          selectedCategory && handleOpenBudgetDialog(selectedCategory.id)
        }
      />

      {/* Migration Dialog */}
      <CategoryMigrationDialog
        open={migrationDialogOpen}
        onOpenChange={setMigrationDialogOpen}
        migrationData={migrationData}
        migrationTargetId={migrationTargetId}
        setMigrationTargetId={setMigrationTargetId}
        categories={categories}
        onResolve={handleMigrationResolve}
      />
    </div>
  );
}
