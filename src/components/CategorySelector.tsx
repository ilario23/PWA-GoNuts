import * as React from "react";
import { Check, ChevronsUpDown, ChevronRight, ArrowLeft, ListFilter } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/drawer";
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
import { UNCATEGORIZED_CATEGORY } from "@/lib/constants";

interface CategorySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  type?: "income" | "expense" | "investment";
  excludeId?: string;
  modal?: boolean;
  groupId?: string | null; // Filter by group
  triggerClassName?: string;
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
  groupId,
  triggerClassName,
}: CategorySelectorProps) {
  const { categories } = useCategories(groupId);
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
    // Use strict check for active status to ensure inactive categories (0) are excluded
    let cats = categories.filter((c) => c.active === 1);

    // Exclude the local-only "Uncategorized" placeholder category
    cats = cats.filter((c) => c.id !== UNCATEGORIZED_CATEGORY.ID);

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

  // Mobile View: Drill-down Sheet with Animations
  const [direction, setDirection] = React.useState(0);

  const handleMobileNavigate = (category: CategoryNode) => {
    setDirection(1);
    handleNavigate(category);
  };

  const handleMobileBack = () => {
    setDirection(-1);
    if (navigationPath.length === 1) {
      setNavigationPath([]);
    } else {
      setNavigationPath(navigationPath.slice(0, -1));
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
    }),
  };

  const MobileContent = (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Header only shown when navigating deep */}
      {navigationPath.length > 0 && (
        <div className="flex items-center p-4 border-b shrink-0 bg-background z-10 transition-all duration-300 ease-in-out">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMobileBack}
            className="p-0 hover:bg-transparent"
            aria-label={t("back_to_parent") || "Back to parent category"}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
          </Button>
          <span className="flex-1 text-center font-semibold text-lg" role="heading" aria-level={2}>
            {currentParent?.name}
          </span>
          <div className="w-5" /> {/* Spacer for alignment */}
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentParent ? currentParent.id : "root"}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 overflow-y-auto p-4 space-y-2"
          >
            {/* "Select This Category" option (only when deep in hierarchy) */}
            {currentParent && (
              <div
                role="button"
                tabIndex={0}
                aria-label={t("select_category_name", { name: currentParent.name })}
                className={cn(
                  "flex items-center p-3 rounded-lg border-2 border-dashed border-muted bg-muted/20 cursor-pointer mb-4 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  value === currentParent.id && "border-primary bg-primary/10"
                )}
                onClick={() => handleSelect(currentParent)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(currentParent);
                  }
                }}
              >
                <div className="flex items-center flex-1">
                  {renderCategoryIcon(currentParent.icon, currentParent.color)}
                  <span className="font-medium">
                    {t("select_category_name", { name: currentParent.name })}
                  </span>
                </div>
                {value === currentParent.id && <Check className="h-5 w-5 text-primary" />}
              </div>
            )}

            {/* No Parent option (only at root) */}
            {excludeId && navigationPath.length === 0 && (
              <div
                role="button"
                tabIndex={0}
                aria-label={t("no_parent") || "Select no parent category"}
                className={cn(
                  "flex items-center p-3 rounded-lg border bg-card text-card-foreground shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  value === "" && "border-primary"
                )}
                onClick={() => handleSelect(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(null);
                  }
                }}
              >
                <span className="flex-1 font-medium italic text-muted-foreground">
                  {t("no_parent") || "No Parent"}
                </span>
                {value === "" && <Check className="h-5 w-5 text-primary" />}
              </div>
            )}

            {currentLevelCategories.map((category) => {
              const isParent = category.children.length > 0;
              return (
                <div
                  key={category.id}
                  role="button"
                  tabIndex={0}
                  aria-label={isParent ? t("navigate_to_subcategory", { name: category.name }) : t("select_category_name", { name: category.name })}
                  aria-expanded={isParent ? "false" : undefined}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card text-card-foreground shadow-sm active:scale-[0.98] transition-transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={() => {
                    if (isParent) {
                      handleMobileNavigate(category);
                    } else {
                      handleSelect(category);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (isParent) {
                        handleMobileNavigate(category);
                      } else {
                        handleSelect(category);
                      }
                    }
                  }}
                >
                  <div className="flex items-center flex-1">
                    {renderCategoryIcon(category.icon, category.color)}
                    <span className="font-medium text-base">{category.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {value === category.id && !isParent && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                    {isParent && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              )
            })}

            {currentLevelCategories.length === 0 &&
              !currentParent && /* Only show empty state at root if truly empty */
              (
                <div className="text-center text-muted-foreground py-10 flex flex-col items-center gap-2">
                  <div className="p-3 rounded-full bg-muted">
                    <ListFilter className="h-6 w-6 opacity-50" />
                  </div>
                  <p>{t("no_categories")}</p>
                </div>
              )}

            {currentLevelCategories.length === 0 && currentParent && (
              <div className="text-center text-muted-foreground py-4 text-sm">
                {t("no_subcategories")}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
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
        </DrawerTrigger>
        <DrawerContent className="h-[85vh] flex flex-col">
          <DrawerHeader className="border-b px-4 py-3 shrink-0">
            <DrawerTitle>{t("select_category")}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            {MobileContent}
          </div>
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
