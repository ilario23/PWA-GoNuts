import React from "react";
import { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { useCategories } from "@/hooks/useCategories";
import { useCategoryBudgets } from "@/hooks/useCategoryBudgets";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  X,
  ChevronRight,
  MoreVertical,
  EyeOff,
  Eye,
  Users,
  ListFilter,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { CategoryDetailDrawer } from "@/components/CategoryDetailDrawer";
import { getIconComponent } from "@/lib/icons";
import { SyncStatusBadge } from "@/components/SyncStatus";
import { CategorySelector } from "@/components/CategorySelector";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ContentLoader } from "@/components/ui/content-loader";
import { SmoothLoader } from "@/components/ui/smooth-loader";
import type { Category } from "@/lib/db";
import { MobileCategoryRow } from "@/components/MobileCategoryRow";
import { motion, AnimatePresence } from "framer-motion";
import { IconSelector } from "@/components/IconSelector";

// Types for recursive components
interface CategoryListProps {
  categories: Category[];
  depth: number;
  getChildren: (id: string) => Category[];
  hasChildren: (id: string) => boolean;
  expandedCategories: Set<string>;
  toggleCategory: (id: string) => void;
  onCategoryClick: (category: Category) => void;
  t: (key: string) => string;
  groups: any[]; // Groups array for displaying group names
}

// Deleted the old MobileCategoryList component since mobile rendering is handled
// by a separate, inlined `renderCategory` implementation below.

// Recursive Desktop Category Rows Component
function DesktopCategoryRows({
  categories,
  depth,
  getChildren,
  hasChildren,
  expandedCategories,
  toggleCategory,
  onCategoryClick,
  t,
  groups,
}: CategoryListProps) {
  const maxDepth = 5; // Prevent infinite recursion

  if (depth > maxDepth) return null;

  return (
    <>
      {categories.map((c, index) => {
        const children = getChildren(c.id);
        const isExpanded = expandedCategories.has(c.id);
        const isRoot = depth === 0;
        const indentPx = depth * 24; // 24px per level
        const isInactive = c.active === 0;

        return (
          <React.Fragment key={c.id}>
            <TableRow
              className={`${isRoot && index < 20
                ? "animate-slide-in-up opacity-0 fill-mode-forwards"
                : !isRoot
                  ? "animate-fade-in"
                  : ""
                } ${children.length > 0 ? "cursor-pointer hover:bg-muted/50" : ""
                } ${!isRoot ? "bg-muted/20" : ""} ${isInactive ? "opacity-50" : ""
                }`}
              style={
                isRoot && index < 20
                  ? { animationDelay: `${index * 0.03}s` }
                  : !isRoot
                    ? { animationDelay: `${index * 0.03}s` }
                    : {}
              }
            >
              <TableCell className="w-8">
                {children.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => toggleCategory(c.id)}
                  >
                    <ChevronRight
                      className="h-4 w-4 transition-transform duration-200 ease-out"
                      style={{
                        transform: isExpanded
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                      }}
                    />
                  </Button>
                ) : null}
              </TableCell>
              <TableCell>
                <div
                  className="flex items-center gap-2"
                  style={{ paddingLeft: `${indentPx}px` }}
                >
                  {!isRoot && (
                    <div className="w-4 h-4 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl shrink-0" />
                  )}
                  <div
                    className={`${isRoot ? "h-4 w-4" : "h-3 w-3"
                      } rounded-full shrink-0 ${isInactive ? "grayscale" : ""}`}
                    style={{ backgroundColor: c.color }}
                  />
                  {c.icon &&
                    (() => {
                      const IconComp = getIconComponent(c.icon);
                      return IconComp ? (
                        <IconComp className={isRoot ? "h-4 w-4" : "h-3 w-3"} />
                      ) : null;
                    })()}
                  <span className={isRoot ? "" : "text-sm"}>{c.name}</span>
                  {c.group_id && (
                    <Badge
                      variant="outline"
                      className="text-xs ml-1 border-primary/50 text-primary"
                    >
                      {groups?.find((g) => g.id === c.group_id)?.name ||
                        t("group")}
                    </Badge>
                  )}
                  {children.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      {children.length}
                    </Badge>
                  )}
                  <SyncStatusBadge isPending={c.pendingSync === 1} />
                </div>
              </TableCell>
              <TableCell className={`capitalize ${isRoot ? "" : "text-sm"}`}>
                {t(c.type)}
              </TableCell>
              <TableCell>
                {c.active === 0 ? (
                  <Badge
                    variant="secondary"
                    className={isRoot ? "" : "text-xs"}
                  >
                    {t("inactive") || "Inactive"}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-green-600 border-green-600 ${isRoot ? "" : "text-xs"
                      }`}
                  >
                    {t("active") || "Active"}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className={isRoot ? "" : "h-7 w-7"}
                  onClick={() => onCategoryClick(c)}
                >
                  <MoreVertical className={isRoot ? "h-4 w-4" : "h-3 w-3"} />
                </Button>
              </TableCell>
            </TableRow>

            {/* Children rows - recursive */}
            {children.length > 0 && isExpanded && (
              <DesktopCategoryRows
                categories={children}
                depth={depth + 1}
                getChildren={getChildren}
                hasChildren={hasChildren}
                expandedCategories={expandedCategories}
                toggleCategory={toggleCategory}
                onCategoryClick={onCategoryClick}
                t={t}
                groups={groups}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

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
    budget: "", // Budget amount for expense categories
    group_id: "", // Group ID for group categories
  });

  // Reset parent_id when group_id changes to prevent cross-group parent-child relationships
  useEffect(() => {
    // Only reset if we're actively editing the form (not on initial mount)
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
        group_id: formData.group_id || undefined,
      });

      // Handle budget for expense categories
      if (formData.type === "expense" && formData.budget) {
        await setCategoryBudget(editingId, parseFloat(formData.budget));
      } else if (formData.type === "expense" && !formData.budget) {
        // Remove budget if field is empty
        await removeCategoryBudget(editingId);
      }
    } else {
      // Generate ID upfront so we can use it for budget
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

      // Handle budget for expense categories
      if (formData.type === "expense" && formData.budget) {
        await setCategoryBudget(newCategoryId, parseFloat(formData.budget));
      }
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
      budget: "",
      group_id: "",
    });
  };

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    // Get budget for this category if it's an expense
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

    // Auto-open 'more' if advanced fields are present
    if (!!category.group_id || (categoryBudget && categoryBudget.amount > 0) || category.active === 0) {
      setActiveSection("more");
    } else {
      setActiveSection("main");
    }
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
      budget: "",
      group_id: "",
    });
    // Default to main section for new categories
    setActiveSection("main");
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

    // Check if it's a group category
    const category = categories?.find((c) => c.id === id);
    const isGroupCategory = !!category?.group_id;

    // Check for associated recurring transactions
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
      // Show warning about group category
      alert(
        t("group_category_delete_warning") ||
        "This is a group category. Deleting it will affect all group members."
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
        budget: "",
        group_id: "",
      });
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

    // 1. Migrate transactions
    await migrateTransactions(migrationData.oldCategoryId, migrationTargetId);

    // 2. Delete the category
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

  // Helper function to get budget info for a category
  const getCategoryBudgetInfo = (categoryId: string) => {
    return budgetsWithSpent?.find((b) => b.category_id === categoryId);
  };

  // Filter categories based on showInactive state
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (showInactive) return categories;
    return categories.filter((c) => c.active !== 0);
  }, [categories, showInactive]);

  // Build a map of parent_id -> children for quick lookup
  const childrenMap = useMemo(() => {
    if (!filteredCategories.length) return new Map<string, Category[]>();

    const map = new Map<string | undefined, Category[]>();

    filteredCategories.forEach((cat) => {
      const parentId = cat.parent_id || undefined;
      const siblings = map.get(parentId) || [];
      siblings.push(cat);
      map.set(parentId, siblings);
    });

    return map;
  }, [filteredCategories]);

  // Get root categories (no parent)
  const rootCategories = useMemo(() => {
    return childrenMap.get(undefined) || [];
  }, [childrenMap]);

  // Get children of a category
  const getChildren = (categoryId: string) => {
    return childrenMap.get(categoryId) || [];
  };

  // Check if a category has children
  const hasChildren = (categoryId: string) => {
    return getChildren(categoryId).length > 0;
  };

  // Get the depth/level of a category (for indentation)
  const getCategoryDepth = (categoryId: string): number => {
    const category = categories?.find((c) => c.id === categoryId);
    if (!category?.parent_id) return 0;
    return 1 + getCategoryDepth(category.parent_id);
  };

  // Track which categories are expanded (for desktop tree view)
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

  // Handle category click to open detail sheet
  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    setDetailSheetOpen(true);
  };

  // Get parent category for detail sheet
  const getParentCategory = (parentId?: string) => {
    if (!parentId) return null;
    return categories?.find((c) => c.id === parentId) || null;
  };

  // Get children count for a category
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
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${showInactive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50"
              }`}
          >
            {showInactive ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {t("show_inactive") || "Inactive"}
            </span>
          </button>

          {/* Group Filter Dropdown */}
          {groups.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-2 px-3">
                  <Users className="h-4 w-4" />
                  <span className="hidden md:inline">
                    {selectedGroupFilter === undefined
                      ? t("all_categories") || "All Categories"
                      : selectedGroupFilter === null
                        ? t("personal_categories") || "Personal"
                        : groups.find((g) => g.id === selectedGroupFilter)
                          ?.name || t("group")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>
                  {t("filter_by") || "Filter by"}
                </DropdownMenuLabel>
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
                    {t("all_categories") || "All Categories"}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="personal">
                    {t("personal_categories") || "Personal"}
                  </DropdownMenuRadioItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
                <DialogDescription className="sr-only">
                  {editingId
                    ? t("edit_category_description") || "Edit category details"
                    : t("add_category_description") || "Add a new category"}
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
                        {t("category_details") || "Category Details"}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2 px-1">
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
                            className={`w-full ${formData.type === "expense"
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
                            className={`w-full ${formData.type === "income"
                              ? "bg-green-500 hover:bg-green-600 text-white"
                              : ""
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
                        <IconSelector
                          value={formData.icon}
                          onChange={(icon) => setFormData({ ...formData, icon })}
                        />
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
                          groupId={formData.group_id || null}
                          modal
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="more" className="border-b-0 border-t">
                    <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
                      <span className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {t("more_options") || "More"}
                        </span>
                        {(formData.group_id ||
                          (formData.budget &&
                            parseFloat(formData.budget) > 0) ||
                          !formData.active) && (
                            <Badge className="ml-2">
                              {[
                                formData.group_id ? 1 : 0,
                                formData.budget && parseFloat(formData.budget) > 0
                                  ? 1
                                  : 0,
                                !formData.active ? 1 : 0,
                              ].reduce((a, b) => a + b, 0)}
                            </Badge>
                          )}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2 px-1">
                      {/* Group Selection */}
                      {groups.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            {t("group") || "Group"}
                          </label>
                          <Select
                            value={formData.group_id || "none"}
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                group_id: value === "none" ? "" : value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t("select_group") || "Select Group"}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                {t("personal_category") || "Personal Category"}
                              </SelectItem>
                              {groups.map((group) => (
                                <SelectItem key={group.id} value={group.id}>
                                  {group.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Budget and Active fields */}
                      <div className="space-y-4">
                        {/* Budget field - only for expense categories */}
                        {formData.type === "expense" && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              {t("budget")}
                            </label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.budget}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  budget: e.target.value,
                                })
                              }
                              placeholder="0.00"
                            />
                          </div>
                        )}

                        {/* Active toggle */}
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <label
                              htmlFor="active-mode"
                              className="text-sm font-medium"
                            >
                              {t("active") || "Active"}
                            </label>
                            <div className="text-[0.8rem] text-muted-foreground">
                              {t("active_description") || "Enable or disable this category"}
                            </div>
                          </div>
                          <Switch
                            id="active-mode"
                            checked={formData.active}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, active: checked })
                            }
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Button type="submit" className="w-full" autoFocus>
                  {t("save")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mobile View: Grouped by Type */}
      <div className="space-y-3 md:hidden">
        <SmoothLoader
          isLoading={isLoading}
          skeleton={<ContentLoader variant="category-mobile" count={5} />}
        >
          {categories && categories.length === 0 ? (
            <div className="text-muted-foreground text-center py-8">
              {t("no_categories") || "No categories"}
            </div>
          ) : (
            <div className="pb-20">
              {/* Render each type group */}
              {["expense", "income", "investment"].map((type) => {
                const categoriesOfType = filteredCategories.filter(
                  (c) => c.type === type
                );
                if (categoriesOfType.length === 0) return null;

                // Toggle function using component-level state
                const toggleExpand = (categoryId: string) => {
                  setExpandedCategoryIds((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(categoryId)) {
                      newSet.delete(categoryId);
                    } else {
                      newSet.add(categoryId);
                    }
                    return newSet;
                  });
                };

                // Recursive function to render a category and its children
                const renderCategory = (
                  category: Category,
                  depth: number = 0,
                  index: number = 0
                ): React.ReactNode => {
                  const children = categoriesOfType.filter(
                    (c) => c.parent_id === category.id
                  );
                  const budget =
                    category.type === "expense"
                      ? getBudgetForCategory(category.id)
                      : null;
                  const isExpanded = expandedCategoryIds.has(category.id);

                  return (
                    <motion.div
                      key={category.id}
                      className={depth > 0 ? "mt-1" : ""}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{
                        duration: 0.2,
                        delay: depth === 0 ? index * 0.05 : 0, // Stagger only for root categories
                      }}
                    >
                      <div
                        style={{
                          marginLeft: depth > 0 ? `${depth * 16}px` : "0",
                          paddingLeft: depth > 0 ? "8px" : "0",
                          borderLeft:
                            depth > 0 ? "2px solid hsl(var(--muted))" : "none",
                        }}
                      >
                        <MobileCategoryRow
                          category={category}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                          onClick={handleCategoryClick}
                          childCount={children.length}
                          budgetAmount={budget?.amount}
                          isExpanded={isExpanded}
                          groupName={
                            category.group_id
                              ? groups?.find((g) => g.id === category.group_id)
                                ?.name
                              : undefined
                          }
                          onToggleExpand={
                            children.length > 0
                              ? () => toggleExpand(category.id)
                              : undefined
                          }
                        />
                      </div>

                      {/* Recursively render children - only if expanded - with AnimatePresence */}
                      <AnimatePresence>
                        {children.length > 0 && isExpanded && (
                          <motion.div
                            className="space-y-1 overflow-hidden"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                          >
                            {children.map((child, childIndex) =>
                              renderCategory(child, depth + 1, childIndex)
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                };

                // Get root categories (no parent) for this type
                const rootCategories = categoriesOfType.filter(
                  (c) => !c.parent_id
                );

                return (
                  <div key={type} className="mb-6">
                    {/* Type header */}
                    <h3 className="font-semibold text-sm text-muted-foreground mb-3 px-1 sticky top-0 bg-background/95 backdrop-blur z-10 py-2 uppercase tracking-wider">
                      {t(type)}
                    </h3>

                    <div className="space-y-4">
                      {rootCategories.map((category, index) =>
                        renderCategory(category, 0, index)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SmoothLoader>
      </div>

      {/* Desktop View: Table with Collapsible */}
      < SmoothLoader
        isLoading={isLoading}
        skeleton={
          < div className="hidden md:block rounded-md border p-4" >
            <ContentLoader variant="category-desktop" count={5} />
          </div >
        }
        className="hidden md:block rounded-md border"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>{t("name")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("status") || "Status"}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <DesktopCategoryRows
              categories={rootCategories}
              depth={0}
              getChildren={getChildren}
              hasChildren={hasChildren}
              expandedCategories={expandedCategories}
              toggleCategory={toggleCategory}
              onCategoryClick={handleCategoryClick}
              t={t}
              groups={groups}
            />
          </TableBody>
        </Table>
      </SmoothLoader >

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
                `This category has ${conflictData?.childrenCount
                } subcategories. ${conflictData?.action === "delete"
                  ? "Deleting"
                  : "Deactivating"
                } it will make them inaccessible. Do you want to move them to the parent category (${conflictData?.parentName || "Root"
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
            <DialogDescription className="sr-only">
              {t("set_budget_description") ||
                "Set a monthly budget for this category"}
            </DialogDescription>
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
      <Dialog open={migrationDialogOpen} onOpenChange={setMigrationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("delete_category_with_data") || "Delete Category with Data"}
            </DialogTitle>
            <DialogDescription>
              {t("category_has_data_warning", {
                transactions: migrationData?.transactionCount || 0,
                recurring: migrationData?.recurringCount || 0,
              }) ||
                `This category is used by ${migrationData?.transactionCount || 0
                } transactions and ${migrationData?.recurringCount || 0
                } recurring templates. Please select a new category to move them to.`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              {t("select_new_category") || "Select New Category"}
            </label>
            <CategorySelector
              value={migrationTargetId}
              onChange={setMigrationTargetId}
              excludeId={migrationData?.oldCategoryId}
              type={
                categories?.find((c) => c.id === migrationData?.oldCategoryId)
                  ?.type
              }
              groupId={
                categories?.find((c) => c.id === migrationData?.oldCategoryId)
                  ?.group_id
              }
              modal
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setMigrationDialogOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleMigrationResolve}
              disabled={!migrationTargetId}
            >
              {t("migrate_and_delete") || "Migrate & Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
