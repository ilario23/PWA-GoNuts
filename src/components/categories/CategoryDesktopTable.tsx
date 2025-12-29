import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Edit, Trash2 } from "lucide-react";
import { getIconComponent } from "@/lib/icons";
import { SyncStatusBadge } from "@/components/SyncStatus";
import { SmoothLoader } from "@/components/ui/smooth-loader";
import { ContentLoader } from "@/components/ui/content-loader";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Category, Group } from "@/lib/db";

interface CategoryListProps {
    categories: Category[];
    depth: number;
    getChildren: (id: string) => Category[];
    hasChildren: (id: string) => boolean;
    expandedCategories: Set<string>;
    toggleCategory: (id: string) => void;
    onCategoryClick: (category: Category) => void;
    t: (key: string) => string;
    groups: Group[];
    onEdit: (category: Category) => void;
    onDelete: (id: string) => void;
}

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
    onEdit,
    onDelete,
}: CategoryListProps) {
    const maxDepth = 10; // Prevent infinite recursion

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
                                } cursor-pointer hover:bg-muted/50 ${!isRoot ? "bg-muted/20" : ""} ${isInactive ? "opacity-50" : ""
                                }`}
                            style={
                                isRoot && index < 20
                                    ? { animationDelay: `${index * 0.03}s` }
                                    : !isRoot
                                        ? { animationDelay: `${index * 0.03}s` }
                                        : {}
                            }
                            onClick={() => onCategoryClick(c)}
                        >
                            <TableCell className="w-8">
                                {children.length > 0 ? (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleCategory(c.id);
                                        }}
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
                                        <div className="absolute top-0 bottom-1/2 left-0 w-4 border-l-2 border-muted-foreground/30 -ml-4" />
                                    )}
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
                                    <TooltipProvider delayDuration={300}>
                                        {c.pendingSync === 1 && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="cursor-help">
                                                        <SyncStatusBadge isPending={true} />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t("changes_pending_sync")}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                    </TooltipProvider>
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
                                        {t("inactive")}
                                    </Badge>
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className={`text-green-600 border-green-600 ${isRoot ? "" : "text-xs"
                                            }`}
                                    >
                                        {t("active")}
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                    <TooltipProvider delayDuration={300}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={isRoot ? "h-8 w-8" : "h-7 w-7"}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEdit(c);
                                                    }}
                                                    data-testid="edit-category-button"
                                                >
                                                    <Edit className={isRoot ? "h-4 w-4" : "h-3 w-3"} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{t("edit")}</p>
                                            </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={isRoot ? "h-8 w-8" : "h-7 w-7"}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(c.id);
                                                    }}
                                                >
                                                    <Trash2 className={`${isRoot ? "h-4 w-4" : "h-3 w-3"} text-destructive`} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{t("delete")}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
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
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
}

interface CategoryDesktopTableProps {
    rootCategories: Category[];
    getChildren: (id: string) => Category[];
    hasChildren: (id: string) => boolean;
    expandedCategories: Set<string>;
    toggleCategory: (id: string) => void;
    onCategoryClick: (category: Category) => void;
    groups: Group[];
    isLoading: boolean;
    t: (key: string) => string;
    onEdit: (category: Category) => void;
    onDelete: (id: string) => void;
}

export function CategoryDesktopTable({
    rootCategories,
    getChildren,
    hasChildren,
    expandedCategories,
    toggleCategory,
    onCategoryClick,
    groups,
    isLoading,
    t,
    onEdit,
    onDelete,
}: CategoryDesktopTableProps) {
    return (
        <SmoothLoader
            isLoading={isLoading}
            skeleton={
                <div className="hidden md:block rounded-md border p-4">
                    <ContentLoader variant="category-desktop" count={5} />
                </div>
            }
            className="hidden md:block rounded-md border"
        >
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>{t("name")}</TableHead>
                        <TableHead>{t("type")}</TableHead>
                        <TableHead>{t("sync_short")}</TableHead>
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
                        onCategoryClick={onCategoryClick}
                        t={t}
                        groups={groups}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                </TableBody>
            </Table>
        </SmoothLoader>
    );
}
