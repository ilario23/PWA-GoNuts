import { useState, useMemo } from "react";
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

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthProvider";
import { CategoryDetailDrawer } from "@/components/CategoryDetailDrawer";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { CategoryFormDialog } from "@/components/categories/CategoryFormDialog";
import { CategoryMobileList } from "@/components/categories/CategoryMobileList";
import { CategoryDesktopTable } from "@/components/categories/CategoryDesktopTable";
import { CategoryBudgetDialog } from "@/components/categories/CategoryBudgetDialog";
import { CategoryMigrationDialog } from "@/components/categories/CategoryMigrationDialog";

import { CategoryFormValues } from "@/lib/schemas";
import type { Category } from "@/lib/db";

export function CategoriesPage() {
  const { t } = useTranslation();

  // Filter State - must be defined before hook calls
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<
    string | null | undefined
  >(undefined); // Default to undefined (All) instead of null (Personal) to match other filters

  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reparentChildren,
    migrateTransactions,
    deleteCategoryTransactions,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Expanded categories state for mobile collapse/expand
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(
    new Set()
  );

  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{
    action: "delete" | "deactivate";
    targetId: string;
    childrenCount: number;
    parentName?: string;
    pendingData?: CategoryFormValues;
  } | null>(null);

  const [initialData, setInitialData] = useState<CategoryFormValues | null>(null);

  const handleSubmit = async (data: CategoryFormValues) => {
    if (!user) return;

    if (editingId) {
      // Check for deactivation conflict
      if (!data.active) {
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
            pendingData: data,
          });
          setConflictDialogOpen(true);
          // Keep form open
          return;
        }
      }

      await updateCategory(editingId, {
        name: data.name,
        color: data.color || "#000000",
        type: data.type,
        icon: data.icon || "",
        parent_id: data.parent_id || undefined,
        active: data.active ? 1 : 0,
        group_id: data.group_id || undefined,
      });

      if (data.type === "expense" && data.budget) {
        // Budget comes as number from schema (coerced) but might be undefined/0
        await setCategoryBudget(editingId, data.budget);
      } else if (data.type === "expense" && !data.budget) {
        await removeCategoryBudget(editingId);
      }
    } else {
      const newCategoryId = crypto.randomUUID();

      await addCategory({
        ...({
          id: newCategoryId,
          user_id: user.id,
          name: data.name,
          color: data.color || "#000000",
          type: data.type,
          icon: data.icon || "",
          parent_id: data.parent_id || undefined,
          active: data.active ? 1 : 0,
          group_id: data.group_id || undefined,
        } as any),
      });

      if (data.type === "expense" && data.budget) {
        await setCategoryBudget(newCategoryId, data.budget);
      }
    }
    setIsOpen(false);
    setEditingId(null);
    setInitialData(null);
  };

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    const categoryBudget =
      category.type === "expense" ? getBudgetForCategory(category.id) : null;

    setInitialData({
      name: category.name,
      color: category.color,
      type: category.type,
      icon: category.icon || "",
      parent_id: category.parent_id || null, // Ensure null if undefined/empty
      active: category.active !== 0,
      budget: categoryBudget ? categoryBudget.amount : undefined,
      group_id: category.group_id || null,
    });
    setIsOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setInitialData(null);
    setIsOpen(true);
  };

  const checkChildrenAndProceedDelete = (id: string) => {
    const hasChildren = categories?.some(
      (c) => c.parent_id === id && !c.deleted_at
    );

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

  const handleDeleteClick = (id: string) => {
    const associatedTransactions = transactions?.filter(
      (t) => t.category_id === id && !t.deleted_at
    );
    const transactionCount = associatedTransactions?.length || 0;

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

    checkChildrenAndProceedDelete(id);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      deleteCategory(deletingId);
      setDeletingId(null);
    }
  };

  const handleConflictResolve = async () => {
    if (!conflictData) return;

    if (conflictData.action === "delete") {
      const targetCategory = categories?.find(
        (c) => c.id === conflictData.targetId
      );
      const newParentId = targetCategory?.parent_id;

      await reparentChildren(conflictData.targetId, newParentId);
      await deleteCategory(conflictData.targetId);

      setIsOpen(false);
      setEditingId(null);
      setInitialData(null);
    } else if (conflictData.action === "deactivate") {
      // Use pendingData if available, otherwise fallback (though pendingData should be there)
      const dataToSave = conflictData.pendingData;
      if (dataToSave) {
        await updateCategory(conflictData.targetId, {
          name: dataToSave.name,
          color: dataToSave.color || "#000000",
          type: dataToSave.type,
          icon: dataToSave.icon || "",
          parent_id: dataToSave.parent_id || undefined,
          active: 0, // Force deactivation
          group_id: dataToSave.group_id || undefined,
        });

        if (dataToSave.type === "expense" && dataToSave.budget) {
          await setCategoryBudget(conflictData.targetId, dataToSave.budget);
        }
      } else {
        const targetCategory = categories?.find(
          (c) => c.id === conflictData.targetId
        );
        if (targetCategory) {
          await updateCategory(conflictData.targetId, {
            name: targetCategory.name,
            color: targetCategory.color,
            type: targetCategory.type,
            icon: targetCategory.icon,
            parent_id: targetCategory.parent_id || undefined,
            active: 0, // Force deactivation
            group_id: targetCategory.group_id || undefined,
          });
        }
      }

      setIsOpen(false);
      setEditingId(null);
      setInitialData(null);
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

    setMigrationDialogOpen(false);
    setMigrationData(null);
    setMigrationTargetId("");

    // Resume to check for children
    checkChildrenAndProceedDelete(migrationData.oldCategoryId);
  };

  const handleMigrationDeleteAll = async () => {
    if (!migrationData) return;
    await deleteCategoryTransactions(migrationData.oldCategoryId);

    setMigrationDialogOpen(false);
    setMigrationData(null);
    setMigrationTargetId("");

    // Resume to check for children
    checkChildrenAndProceedDelete(migrationData.oldCategoryId);
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

    return categories.filter((c) => {
      // Search filter
      const matchesSearch = searchQuery && c.name.toLowerCase().includes(searchQuery.toLowerCase());

      // If not searching AND not showing inactive, hide inactive categories
      if (!searchQuery && !showInactive && c.active === 0) return false;

      // search check
      if (searchQuery && !matchesSearch) {
        return false;
      }

      // type check
      if (typeFilter !== "all" && c.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [categories, searchQuery, typeFilter, showInactive]);

  // Sort categories: Group (Personal first), then Active, then Alphabetical
  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => {
      // 1. Sort by Group
      const aGroupId = a.group_id;
      const bGroupId = b.group_id;

      if (aGroupId !== bGroupId) {
        // Personal categories (no group_id) come first
        if (!aGroupId) return -1;
        if (!bGroupId) return 1;

        // Both belong to groups, sort by Group Name
        const groupA = groups.find((g) => g.id === aGroupId);
        const groupB = groups.find((g) => g.id === bGroupId);
        const nameA = groupA?.name || "";
        const nameB = groupB?.name || "";

        return nameA.localeCompare(nameB);
      }

      // 2. Sort by Active status (Active=1 first, Inactive=0 last)
      if (a.active !== b.active) {
        return b.active - a.active;
      }
      // 3. Sort by Name
      return a.name.localeCompare(b.name);
    });
  }, [filteredCategories, groups]);

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

  const handleResetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSelectedGroupFilter(undefined);
    setShowInactive(false);
  };

  const FilterContent = () => (
    <div className="space-y-4 py-4 px-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("type")}</label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
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
            value={selectedGroupFilter === undefined ? "all" : selectedGroupFilter === null ? "personal" : selectedGroupFilter}
            onValueChange={(val) => setSelectedGroupFilter(val === "all" ? undefined : val === "personal" ? null : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("group")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all_categories")}</SelectItem>
              <SelectItem value="personal">{t("personal_categories")}</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between">
        <label htmlFor="show-inactive" className="text-sm font-medium cursor-pointer">
          {t("show_inactive")}
        </label>
        <Switch
          id="show-inactive"
          checked={showInactive}
          onCheckedChange={setShowInactive}
        />
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

  const isLoading = !categories;

  return (
    <div className="space-y-4">
      {/* Top Bar with Title, Count, Filters, Add Button */}
      <div className="flex flex-col gap-4">
        {/* Row 1: Title and Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{t("categories")}</h1>
            <Badge variant="secondary" className="px-2 py-0.5 h-6">
              {filteredCategories.length}
            </Badge>
          </div>

          <div className="flex gap-2">
            {/* Desktop Search */}
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search_categories") || "Search..."}
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
      </div>

      {/* Mobile Search Row */}
      <div className="flex gap-2 md:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search_categories") || "Search..."}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* Mobile Filter Sheet Trigger */}
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



      {/* Active Filters Summary */}
      {(typeFilter !== "all" || selectedGroupFilter !== undefined || showInactive || searchQuery) && (
        <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
          <span>{t("active_filters")}:</span>
          {searchQuery && (
            <span className="bg-muted px-2 py-1 rounded-md">
              "{searchQuery}"
            </span>
          )}
          {typeFilter !== "all" && (
            <span className="bg-muted px-2 py-1 rounded-md capitalize">
              {t(typeFilter)}
            </span>
          )}
          {selectedGroupFilter !== undefined && (
            <span className="bg-muted px-2 py-1 rounded-md">
              {selectedGroupFilter === null
                ? t("personal")
                : groups.find((g) => g.id === selectedGroupFilter)?.name ||
                t("group")}
            </span>
          )}
          {showInactive && (
            <span className="bg-muted px-2 py-1 rounded-md text-amber-600 dark:text-amber-400">
              {t("show_inactive")}
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

      {/* Mobile View */}
      <CategoryMobileList
        categories={categories}
        filteredCategories={sortedCategories}
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
        initialData={initialData}
        groups={groups}
        onSubmit={handleSubmit}
        isUsed={(() => {
          if (!editingId) return false;
          // Check usage
          const txCount = transactions?.filter(t => t.category_id === editingId && !t.deleted_at).length || 0;
          const recCount = recurringTransactions?.filter(r => r.category_id === editingId && !r.deleted_at).length || 0;
          return txCount > 0 || recCount > 0;
        })()}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={t("confirm_delete_category")}
        description={
          deletingId && categories?.find(c => c.id === deletingId)?.group_id
            ? t("group_category_delete_warning_confirm", "This is a shared group category. Deleting it will remove it for all members.")
            : t("confirm_delete_category_description")
        }
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
                action: t(conflictData?.action || "delete"),
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
        onDeleteAll={handleMigrationDeleteAll}
      />
    </div>
  );
}
