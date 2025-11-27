import * as React from "react";
import { Check, ChevronsUpDown, ChevronRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCategories } from "@/hooks/useCategories";
import { Category } from "@/lib/db";
import { getIconComponent } from "@/lib/icons";
import { useTranslation } from "react-i18next";

interface CategorySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  type?: "income" | "expense" | "investment";
  excludeId?: string;
  modal?: boolean;
}

interface CategoryNode extends Category {
  children: CategoryNode[];
  level: number;
}

export function CategorySelector({
  value,
  onChange,
  type,
  excludeId,
  modal = false,
}: CategorySelectorProps) {
  const { categories } = useCategories();
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Navigation state (used for both mobile and desktop)
  const [navigationPath, setNavigationPath] = React.useState<CategoryNode[]>(
    []
  );

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reset navigation when selector closes
  React.useEffect(() => {
    if (!open) {
      setNavigationPath([]);
    }
  }, [open]);

  const buildTree = React.useCallback(
    (
      cats: Category[],
      parentId: string | undefined = undefined,
      level = 0
    ): CategoryNode[] => {
      return cats
        .filter((c) => {
          // Root categories: parent_id is null, undefined, or empty string
          if (parentId === undefined) {
            return !c.parent_id || c.parent_id === "";
          }
          return c.parent_id === parentId;
        })
        .map((c) => ({
          ...c,
          level,
          children: buildTree(cats, c.id, level + 1),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    []
  );

  // Get all descendant IDs of a category (to prevent circular references)
  const getDescendantIds = React.useCallback(
    (categoryId: string, cats: Category[]): string[] => {
      const children = cats.filter((c) => c.parent_id === categoryId);
      const descendantIds = children.map((c) => c.id);
      children.forEach((child) => {
        descendantIds.push(...getDescendantIds(child.id, cats));
      });
      return descendantIds;
    },
    []
  );

  const filteredCategories = React.useMemo(() => {
    if (!categories) return [];
    let cats = categories.filter((c) => c.active !== 0);
    if (type) {
      cats = cats.filter((c) => c.type === type);
    }
    // Exclude the editing category and all its descendants
    if (excludeId) {
      const excludeIds = [excludeId, ...getDescendantIds(excludeId, cats)];
      cats = cats.filter((c) => !excludeIds.includes(c.id));
    }
    return cats;
  }, [categories, type, excludeId, getDescendantIds]);

  const categoryTree = React.useMemo(() => {
    return buildTree(filteredCategories);
  }, [filteredCategories, buildTree]);

  const selectedCategory = categories?.find((c) => c.id === value);

  const handleSelect = (category: CategoryNode | null) => {
    if (!category) {
      // Selecting "No Parent"
      onChange("");
      setOpen(false);
      setNavigationPath([]);
      return;
    }

    // Always allow selection, even if category has children
    onChange(category.id);
    setOpen(false);
    setNavigationPath([]);
  };

  const handleNavigate = (category: CategoryNode) => {
    // Navigate into category's children
    if (category.children.length > 0) {
      setNavigationPath([...navigationPath, category]);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    // Navigate back to that level (-1 means root)
    if (index === -1) {
      setNavigationPath([]);
    } else {
      setNavigationPath(navigationPath.slice(0, index + 1));
    }
  };

  const renderCategoryIcon = (iconName: string, color: string) => {
    const Icon = getIconComponent(iconName);
    return (
      <div
        className="flex h-6 w-6 items-center justify-center rounded-full mr-2"
        style={{ backgroundColor: color }}
      >
        {Icon && <Icon className="h-3 w-3 text-white" />}
      </div>
    );
  };

  // Get current level categories based on navigation path
  const getCurrentLevelCategories = () => {
    if (navigationPath.length === 0) {
      return categoryTree;
    }
    const currentParent = navigationPath[navigationPath.length - 1];
    return currentParent.children;
  };

  const currentLevelCategories = getCurrentLevelCategories();
  const currentParent =
    navigationPath.length > 0
      ? navigationPath[navigationPath.length - 1]
      : null;

  // Desktop View: Breadcrumb navigation
  const DesktopContent = (
    <div className="w-full">
      {/* Breadcrumb */}
      {navigationPath.length > 0 && (
        <div className="border-b p-3">
          <Breadcrumb>
            <BreadcrumbList>
              {/* Always show root */}
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="cursor-pointer"
                  onClick={() => handleBreadcrumbClick(-1)}
                >
                  {t("categories")}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />

              {navigationPath.length <= 2 ? (
                // Short path: show all items
                navigationPath.map((cat, index) => (
                  <React.Fragment key={cat.id}>
                    <BreadcrumbItem>
                      {index === navigationPath.length - 1 ? (
                        <BreadcrumbPage>{cat.name}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink
                          className="cursor-pointer"
                          onClick={() => handleBreadcrumbClick(index)}
                        >
                          {cat.name}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < navigationPath.length - 1 && (
                      <BreadcrumbSeparator />
                    )}
                  </React.Fragment>
                ))
              ) : (
                // Long path: show first, ellipsis with dropdown, and last
                <>
                  {/* First item */}
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      className="cursor-pointer"
                      onClick={() => handleBreadcrumbClick(0)}
                    >
                      {navigationPath[0].name}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />

                  {/* Ellipsis with dropdown for middle items */}
                  <BreadcrumbItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center gap-1">
                        <BreadcrumbEllipsis className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {navigationPath.slice(1, -1).map((cat, index) => (
                          <DropdownMenuItem
                            key={cat.id}
                            onClick={() => handleBreadcrumbClick(index + 1)}
                          >
                            {cat.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />

                  {/* Last item */}
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {navigationPath[navigationPath.length - 1].name}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      )}

      {/* Category List */}
      <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
        {/* No Parent option when selecting parent category */}
        {excludeId && navigationPath.length === 0 && (
          <div
            className={cn(
              "flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer",
              value === "" && "bg-accent"
            )}
            onClick={() => handleSelect(null)}
          >
            <span className="italic text-muted-foreground">
              {t("no_parent") || "No Parent"}
            </span>
            {value === "" && <Check className="h-4 w-4" />}
          </div>
        )}

        {currentLevelCategories.map((category) => (
          <div
            key={category.id}
            className={cn(
              "flex items-center justify-between p-2 rounded-md hover:bg-accent",
              value === category.id && "bg-accent"
            )}
          >
            <div
              className="flex items-center flex-1 cursor-pointer"
              onClick={() => handleSelect(category)}
            >
              {renderCategoryIcon(category.icon, category.color)}
              <span>{category.name}</span>
            </div>
            <div className="flex items-center gap-1">
              {value === category.id && <Check className="h-4 w-4" />}
              {category.children.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate(category);
                  }}
                  className="p-1 hover:bg-accent-foreground/10 rounded"
                  aria-label={
                    t("show_subcategories") ||
                    `Show subcategories of ${category.name}`
                  }
                >
                  <ChevronRight
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>
          </div>
        ))}

        {currentLevelCategories.length === 0 &&
          navigationPath.length === 0 &&
          !excludeId && (
            <div className="text-center text-muted-foreground py-8">
              {t("no_categories")}
            </div>
          )}
      </div>
    </div>
  );

  // Mobile View: Drill-down Sheet
  const MobileContent = (
    <div className="flex flex-col h-full">
      {navigationPath.length > 0 && (
        <div className="flex items-center p-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (navigationPath.length === 1) {
                setNavigationPath([]);
              } else {
                setNavigationPath(navigationPath.slice(0, -1));
              }
            }}
            aria-label={t("back")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("back")}
          </Button>
          <span className="ml-2 font-semibold" aria-current="location">
            {currentParent?.name}
          </span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* No Parent option when selecting parent category */}
        {excludeId && navigationPath.length === 0 && (
          <div
            className={cn(
              "flex items-center p-3 rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer",
              value === "" && "border-primary"
            )}
            onClick={() => handleSelect(null)}
          >
            <span className="flex-1 font-medium italic text-muted-foreground">
              {t("no_parent") || "No Parent"}
            </span>
            {value === "" && <Check className="h-4 w-4 text-primary" />}
          </div>
        )}

        {currentLevelCategories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm"
          >
            <div
              className="flex items-center flex-1 cursor-pointer"
              onClick={() => handleSelect(category)}
            >
              {renderCategoryIcon(category.icon, category.color)}
              <span className="font-medium">{category.name}</span>
            </div>

            <div className="flex items-center gap-2">
              {value === category.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
              {category.children.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate(category);
                  }}
                  aria-label={
                    t("show_subcategories") ||
                    `Show subcategories of ${category.name}`
                  }
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {currentLevelCategories.length === 0 &&
          navigationPath.length === 0 &&
          !excludeId && (
            <div className="text-center text-muted-foreground py-8">
              {t("no_categories")}
            </div>
          )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedCategory ? (
              <div className="flex items-center">
                {renderCategoryIcon(
                  selectedCategory.icon,
                  selectedCategory.color
                )}
                {selectedCategory.name}
              </div>
            ) : (
              t("select_category")
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>{t("select_category")}</SheetTitle>
          </SheetHeader>
          {MobileContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedCategory ? (
            <div className="flex items-center">
              {renderCategoryIcon(
                selectedCategory.icon,
                selectedCategory.color
              )}
              {selectedCategory.name}
            </div>
          ) : (
            t("select_category")
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        {DesktopContent}
      </PopoverContent>
    </Popover>
  );
}
