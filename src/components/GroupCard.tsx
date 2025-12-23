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

} from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { SwipeableItem } from "@/components/ui/SwipeableItem";
import { SyncStatusBadge } from "@/components/SyncStatus";

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
      onClick={() => onView(group)}
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
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
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
              <SyncStatusBadge isPending={group.pendingSync === 1} />
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

            {/* Mobile Actions - Action Strip */}
            <div className="sm:hidden flex items-center justify-between gap-1 mt-3 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 flex flex-col gap-1 h-auto py-2 hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  onBalance(group);
                }}
              >
                <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-[10px] uppercase tracking-wide font-medium">{t("balance")}</span>
              </Button>

              {onStatistics && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 flex flex-col gap-1 h-auto py-2 hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatistics(group);
                  }}
                >
                  <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-[10px] uppercase tracking-wide font-medium">{t("statistics")}</span>
                </Button>
              )}

              {group.isCreator && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 flex flex-col gap-1 h-auto py-2 hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMembers(group);
                  }}
                >
                  <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-[10px] uppercase tracking-wide font-medium">{t("members")}</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </SwipeableItem>
  );
}
