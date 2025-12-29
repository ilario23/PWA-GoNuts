import * as React from "react";
import { Check, ChevronsUpDown, ChevronRight, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerDescription,
} from "@/components/ui/drawer";
import { useCategories } from "@/hooks/useCategories";
import { Category } from "@/lib/db";
import { getIconComponent } from "@/lib/icons";
import { useTranslation } from "react-i18next";
import { UNCATEGORIZED_CATEGORY } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { useGroups } from "@/hooks/useGroups";

interface CategorySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  type?: "income" | "expense" | "investment";
  excludeId?: string;
  modal?: boolean;
  groupId?: string | null; // Kept for API compatibility but ignored for filtering to show all
  triggerClassName?: string;
  showSkipOption?: boolean;
}

// Helper to get descendant IDs (defined outside to avoid recursion issues)
function getDescendantIds(categoryId: string, cats: Category[]): string[] {
  const children = cats.filter((c) => c.parent_id === categoryId);
  const descendantIds = children.map((c) => c.id);
  children.forEach((child) => {
    descendantIds.push(...getDescendantIds(child.id, cats));
  });
  return descendantIds;
}

export function CategorySelector({
  value,
  onChange,
  type,
  excludeId,
  modal = false,
  groupId, // Strict filter: null/undefined = Personal, string = Group
  triggerClassName,
  showSkipOption = false,
}: CategorySelectorProps) {
  // Fetch ALL categories first, then filter strictly in memory for responsiveness
  // Or should we trust the hook? Let's filter in memory to be sure.
  const { categories } = useCategories(undefined);
  const { groups } = useGroups();
  const { t } = useTranslation();

  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [expandedRoots, setExpandedRoots] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const filteredCategories = React.useMemo(() => {
    // 1. Strict Group Filter
    let cats = categories?.filter((c) => {
      if (groupId) {
        return c.group_id === groupId;
      } else {
        return !c.group_id; // Personal categories only
      }
    }) || [];

    // 2. Active Check
    cats = cats.filter((c) => c.active !== 0);

    // 3. Exclude Uncategorized
    cats = cats.filter((c) => c.id !== UNCATEGORIZED_CATEGORY.ID);

    // 4. Filter by Type
    if (type) {
      cats = cats.filter((c) => c.type === type);
    }

    // 5. Exclude editing (for parents)
    if (excludeId) {
      const excludeIds = [excludeId, ...getDescendantIds(excludeId, cats)];
      cats = cats.filter((c) => !excludeIds.includes(c.id));
    }

    // 6. Search Filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      cats = cats.filter(c => c.name.toLowerCase().includes(lowerTerm));
    }

    return cats.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, type, excludeId, searchTerm, groupId]);


  // If searching, we show a flat list. If not, we show tree.
  const isSearching = !!searchTerm;

  const rootCategories = React.useMemo(() => {
    if (isSearching) return filteredCategories; // Flat list for search

    const visibleIds = new Set(filteredCategories.map((c) => c.id));
    return filteredCategories.filter(c => {
      // It is a root if:
      // 1. No parent_id
      // 2. OR parent_id exists but parent is NOT in the visible set (Orphan)
      const isOrphan = c.parent_id && !visibleIds.has(c.parent_id);
      return !c.parent_id || isOrphan;
    });
  }, [filteredCategories, isSearching]);

  const getChildren = (parentId: string) => {
    return filteredCategories.filter(c => c.parent_id === parentId);
  };

  const selectedCategory = categories?.find((c) => c.id === value);
  const selectedGroupName = selectedCategory?.group_id
    ? groups.find(g => g.id === selectedCategory.group_id)?.name
    : null;

  // Auto-expand the parent of the selected category on open
  React.useEffect(() => {
    if (open && selectedCategory && selectedCategory.parent_id) {
      setExpandedRoots(prev => {
        const newSet = new Set(prev);
        newSet.add(selectedCategory.parent_id!);
        return newSet;
      });
    }
  }, [open, selectedCategory]);

  const renderCategoryIcon = (iconName: string, color: string) => {
    const Icon = getIconComponent(iconName);
    return (
      <div
        className="flex h-6 w-6 items-center justify-center rounded-full mr-3 shrink-0"
        style={{ backgroundColor: `${color}20`, color: color }}
      >
        {Icon ? <Icon className="h-3.5 w-3.5" /> : <div className="h-3.5 w-3.5 rounded-full bg-current opacity-50" />}
      </div>
    );
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedRoots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderCategoryNode = (category: Category, depth = 0) => {
    const children = isSearching ? [] : getChildren(category.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedRoots.has(category.id);
    const isSelected = value === category.id;
    const groupName = category.group_id ? groups.find(g => g.id === category.group_id)?.name : null;

    return (
      <div key={category.id} className="mb-px">
        <div
          onClick={(e) => {
            if (hasChildren && !isSearching) {
              // Expand if has children (Drill-down behavior)
              toggleExpand(category.id, e);
            } else {
              // Select if leaf
              handleSelect(category.id);
            }
          }}
          className={cn(
            "flex items-center w-full p-2 rounded-md cursor-pointer transition-colors relative min-h-[48px]",
            isSelected ? "bg-accent/50 text-accent-foreground" : "hover:bg-muted/50 text-foreground"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {/* Expand Toggle */}
          {hasChildren && !isSearching && (
            <div
              className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center z-10"
              onClick={(e) => toggleExpand(category.id, e)}
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-90"
                )}
              />
            </div>
          )}

          {/* Spacer if no children */}
          {(!hasChildren || isSearching) && <div className="w-2" />}
          {hasChildren && !isSearching && <div className="w-6" />}

          {renderCategoryIcon(category.icon, category.color)}

          <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5">
            <span className="truncate font-medium text-sm">{category.name}</span>
            {groupName && (
              <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 flex items-center gap-1 text-muted-foreground">
                <Users className="h-2 w-2" />
                {groupName}
              </Badge>
            )}
            {/* Show parent path in search */}
            {isSearching && category.parent_id && (
              <span className="text-xs text-muted-foreground">{t("in_category_name", { name: categories?.find(c => c.id === category.parent_id)?.name })}</span>
            )}
          </div>

          {isSelected && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />}
        </div>

        {/* Children and Parent Selection */}
        {hasChildren && isExpanded && !isSearching && (
          <div className="flex flex-col relative border-l border-border/40 ml-[19px] my-1 space-y-1">
            {/* Option to select the parent itself */}
            <div
              onClick={() => handleSelect(category.id)}
              className={cn(
                "flex items-center w-full p-2 rounded-md cursor-pointer transition-colors h-10 bg-muted/30 SelectParentOption",
                "hover:bg-accent hover:text-accent-foreground",
                value === category.id ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
              )}
            >
              <div className="flex items-center min-w-0 flex-1">
                <div className="w-5 mr-3 flex justify-center">
                  <Check
                    className={cn(
                      "h-3 w-3",
                      value === category.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </div>
                <span className="truncate italic text-sm">{t("select_category_name", { name: category.name })}</span>
              </div>
            </div>

            {children.map(child => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const Content = (
    <div className="flex flex-col h-full bg-background w-full">
      <div className="flex items-center px-3 py-2 border-b gap-2">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          placeholder={t("search_categories")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 shadow-none focus-visible:ring-0 px-0 h-9"
          data-testid="category-search"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 w-full">
        {showSkipOption && !isSearching && (
          <div className="mb-1 pb-1 border-b border-border/40">
            <div
              onClick={() => handleSelect('SKIP')}
              className={cn(
                "flex items-center w-full p-2 rounded-md cursor-pointer transition-colors relative min-h-[48px]",
                value === 'SKIP' ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" : "hover:bg-muted/50 text-foreground"
              )}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full mr-3 shrink-0 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                <div className="h-2 w-3 bg-current rounded-sm" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5">
                <span className="truncate font-medium text-sm">{t("import.skip_ignore", "⛔ Ignore / Skip")}</span>
                <span className="text-[10px] text-muted-foreground">{t("import.skip_desc", "Transaction will be skipped")}</span>
              </div>
              {value === 'SKIP' && <Check className="ml-auto h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />}
            </div>
          </div>
        )}

        {/* No filtered results */}
        {rootCategories.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t("no_categories_found")}
          </div>
        )}

        {/* List */}
        <div className="space-y-1">
          {rootCategories.map(root => renderCategoryNode(root))}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", triggerClassName)}
            data-testid="category-trigger"
          >
            {value === 'SKIP' ? (
              <div className="flex items-center min-w-0 text-red-600 dark:text-red-400">
                <div className="flex h-6 w-6 items-center justify-center rounded-full mr-3 shrink-0 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                  <div className="h-2 w-3 bg-current rounded-sm" />
                </div>
                <div className="flex flex-col items-start text-left min-w-0 flex-1">
                  <span className="truncate leading-none">{t("import.skip_ignore", "Ignore / Skip")}</span>
                </div>
              </div>
            ) : selectedCategory ? (
              <div className="flex items-center min-w-0">
                {renderCategoryIcon(
                  selectedCategory.icon,
                  selectedCategory.color
                )}
                <div className="flex flex-col items-start text-left min-w-0 flex-1">
                  <span className="truncate leading-none">{selectedCategory.name}</span>
                  {selectedGroupName && (
                    <span className="text-[10px] text-muted-foreground leading-none mt-1">{selectedGroupName}</span>
                  )}
                </div>
              </div>
            ) : (
              t("select_category")
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="h-[85vh] flex flex-col fixed bottom-0 left-0 right-0 z-50">
          <DrawerHeader className="border-b px-4 py-3 shrink-0 text-left">
            <DrawerTitle>{t("select_category")}</DrawerTitle>
            <DrawerDescription className="sr-only">
              {t("select_category")}
            </DrawerDescription>
          </DrawerHeader>
          {Content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", triggerClassName)}
          data-testid="category-trigger"
        >
          {value === 'SKIP' ? (
            <div className="flex items-center min-w-0 text-red-600 dark:text-red-400">
              <div className="flex h-6 w-6 items-center justify-center rounded-full mr-3 shrink-0 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                <div className="h-2 w-3 bg-current rounded-sm" />
              </div>
              <span className="truncate">{t("import.skip_ignore", "Ignore / Skip")}</span>
            </div>
          ) : selectedCategory ? (
            <div className="flex items-center min-w-0">
              {renderCategoryIcon(
                selectedCategory.icon,
                selectedCategory.color
              )}
              <span className="truncate">{selectedCategory.name}</span>
            </div>
          ) : (
            t("select_category")
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 shadow-xl" align="start">
        <div className="h-[400px] flex flex-col">
          {Content}
        </div>
      </PopoverContent>
    </Popover>
  );
}
