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
import {
    Crown,
    Trash2,
    Edit,
    ExternalLink,
    Users,
    ArrowUpRight,
    BarChart3,
} from "lucide-react";

import { SmoothLoader } from "@/components/ui/smooth-loader";
import { ContentLoader } from "@/components/ui/content-loader";
import { GroupWithMembers } from "@/hooks/useGroups";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface GroupDesktopTableProps {
    groups: GroupWithMembers[];
    onEdit: (group: GroupWithMembers) => void;
    onDelete: (group: GroupWithMembers) => void;
    onView: (group: GroupWithMembers) => void;
    onBalance: (group: GroupWithMembers) => void;
    onMembers: (group: GroupWithMembers) => void;
    onStatistics: (group: GroupWithMembers) => void;
    isLoading: boolean;
    t: (key: string) => string;
}

export function GroupDesktopTable({
    groups,
    onEdit,
    onDelete,
    onView,
    onBalance,
    onMembers,
    onStatistics,
    isLoading,
    t,
}: GroupDesktopTableProps) {
    return (
        <SmoothLoader
            isLoading={isLoading}
            skeleton={
                <div className="hidden md:block rounded-xl border p-4">
                    <ContentLoader variant="table-row" count={5} />
                </div>
            }
            className="hidden md:block rounded-xl border bg-card text-card-foreground shadow-sm"
        >
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("group_name")}</TableHead>
                        <TableHead>{t("members")}</TableHead>
                        <TableHead>{t("my_share")}</TableHead>
                        <TableHead>{t("role")}</TableHead>

                        <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {groups.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                {t("no_groups")}
                            </TableCell>
                        </TableRow>
                    ) : (
                        groups.map((group) => (
                            <TableRow
                                key={group.id}
                                className="hover:bg-muted/50 transition-colors"
                                onClick={() => onView(group)}
                            >
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span className="flex items-center gap-2 text-base">
                                            {group.name}
                                            {group.isCreator && (
                                                <Crown className="h-3 w-3 text-yellow-500" />
                                            )}
                                        </span>
                                        {group.description && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                {group.description}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{group.members.length}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-mono">
                                        {group.myShare}%
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {group.isCreator ? (
                                        <Badge variant="default" className="text-xs">
                                            {t("admin")}
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-xs">
                                            {t("member")}
                                        </Badge>
                                    )}
                                </TableCell>

                                <TableCell className="text-right">
                                    <div
                                        className="flex items-center justify-end gap-1"
                                        onClick={(e) => e.stopPropagation()} // Prevent row click
                                    >
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        onClick={() => onView(group)}
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t("view")}</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-green-600"
                                                        onClick={() => onBalance(group)}
                                                    >
                                                        <ArrowUpRight className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t("balance")}</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => onStatistics(group)}
                                                    >
                                                        <BarChart3 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t("statistics")}</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            {group.isCreator && (
                                                <>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={() => onMembers(group)}
                                                            >
                                                                <Users className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{t("members")}</p>
                                                        </TooltipContent>
                                                    </Tooltip>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={() => onEdit(group)}
                                                            >
                                                                <Edit className="h-4 w-4" />
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
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                onClick={() => onDelete(group)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{t("delete")}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </TooltipProvider>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </SmoothLoader>
    );
}
