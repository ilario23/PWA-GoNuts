import { useTranslation } from "react-i18next";
import { GroupWithMembers } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Crown,
  Trash2,
  Edit,
  ExternalLink,
  Users,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { SwipeableItem } from "@/components/ui/SwipeableItem";

interface GroupCardProps {
  group: GroupWithMembers;
  onEdit: (group: GroupWithMembers) => void;
  onDelete: (group: GroupWithMembers) => void;
  onView: (group: GroupWithMembers) => void;
  onBalance: (group: GroupWithMembers) => void;
  onMembers: (group: GroupWithMembers) => void;
  onStatistics?: (group: GroupWithMembers) => void;
}

export function GroupCard({
  group,
  onEdit,
  onDelete,
  onView,
  onBalance,
  onMembers,
  onStatistics,
}: GroupCardProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const enabled = isMobile && group.isCreator;

  return (
    <SwipeableItem
      onEdit={() => onEdit(group)}
      onDelete={() => onDelete(group)}
      enabled={enabled}
      className="rounded-xl h-full"
    >
      <div className="relative bg-card rounded-xl border shadow-sm h-full flex flex-col transition-all hover:-translate-y-1 active:scale-[0.98]">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2">
                {group.name}
                {group.isCreator && (
                  <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                )}
              </CardTitle>
              {group.description && (
                <CardDescription className="truncate">
                  {group.description}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Desktop Edit/Delete buttons */}
              {group.isCreator && (
                <div className="hidden sm:flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(group);
                    }}
                    title={t("edit")}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(group);
                    }}
                    title={t("delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <Badge variant="secondary">
                {group.members.length} {t("members")}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("your_share")}</span>
              <span className="font-medium">{group.myShare}%</span>
            </div>
            <Separator />

            {/* Action Buttons - Now with text for both mobile and desktop */}
            {/* Desktop Actions */}
            <div className="hidden sm:flex flex-wrap items-center gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => onView(group)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("view")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBalance(group)}
              >
                <ArrowUpRight className="h-4 w-4 mr-2 text-green-500" />
                {t("balance")}
              </Button>
              {group.isCreator && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMembers(group)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {t("members")}
                </Button>
              )}
              {onStatistics && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatistics(group)}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {t("statistics")}
                </Button>
              )}
            </div>

            {/* Mobile Actions - Dropdown */}
            <div className="sm:hidden pt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t("actions")}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => onView(group)}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t("view")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBalance(group)}>
                    <ArrowUpRight className="h-4 w-4 mr-2 text-green-500" />
                    {t("balance")}
                  </DropdownMenuItem>
                  {group.isCreator && (
                    <DropdownMenuItem onClick={() => onMembers(group)}>
                      <Users className="h-4 w-4 mr-2" />
                      {t("members")}
                    </DropdownMenuItem>
                  )}
                  {onStatistics && (
                    <DropdownMenuItem onClick={() => onStatistics(group)}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {t("statistics")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </div>
    </SwipeableItem>
  );
}
