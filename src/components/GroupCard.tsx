import { useTranslation } from "react-i18next";
import { GroupWithMembers } from "@/hooks/useGroups";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Users, ArrowUpRight, BarChart3, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface GroupCardProps {
  group: GroupWithMembers;
  onEdit: (group: GroupWithMembers) => void;
  onDelete: (group: GroupWithMembers) => void;
  onView: (group: GroupWithMembers) => void;
  onBalance: (group: GroupWithMembers) => void;
  onMembers: (group: GroupWithMembers) => void;
  onStatistics?: (group: GroupWithMembers) => void;
  /** My monetary balance: positive = owed to me, negative = I owe, 0 = settled, undefined = loading */
  myBalance?: number;
}

export function GroupCard({
  group,
  onEdit,
  onDelete,
  onView,
  onBalance,
  onMembers,
  onStatistics,
  myBalance,
}: GroupCardProps) {
  const { t } = useTranslation();

  const isOwed = myBalance !== undefined && myBalance > 0.005;
  const isOwing = myBalance !== undefined && myBalance < -0.005;
  const isSettled = myBalance !== undefined && !isOwed && !isOwing;

  const actions = [
    {
      icon: ArrowUpRight,
      label: t("balance"),
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onBalance(group);
      },
    },
    ...(onStatistics
      ? [
          {
            icon: BarChart3,
            label: t("statistics"),
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onStatistics(group);
            },
          },
        ]
      : []),
    {
      icon: Users,
      label: t("members"),
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onMembers(group);
      },
    },
  ];

  return (
      <Card
        role="button"
        tabIndex={0}
        className="overflow-hidden cursor-pointer transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => onView(group)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onView(group);
          }
        }}
      >
        <CardContent className="p-0">
          {/* Main body */}
          <div className="p-4 pb-3">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-base leading-tight truncate">
                    {group.name}
                  </p>
                  {group.isCreator && (
                    <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  )}
                </div>
                {group.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {group.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{group.members.length}</span>
                </div>
                {group.isCreator && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      onClick={(e) => e.stopPropagation()}
                      aria-label={t("actions")}
                      className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onSelect={() => onEdit(group)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t("edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => onDelete(group)}
                        className="text-[hsl(var(--gonuts-bad))] focus:text-[hsl(var(--gonuts-bad))] focus:bg-[hsl(var(--gonuts-bad))]/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Balance */}
            <div className="mt-4">
              {myBalance === undefined ? (
                <div className="space-y-1.5">
                  <div className="h-2.5 w-16 bg-muted animate-pulse rounded" />
                  <div className="h-7 w-24 bg-muted animate-pulse rounded" />
                </div>
              ) : isSettled ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">
                    {t("all_settled")}
                  </p>
                  <p className="num text-2xl font-bold text-muted-foreground">
                    €0
                  </p>
                </div>
              ) : isOwed ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-[hsl(var(--gonuts-good))] mb-0.5">
                    {t("owed_to_you")}
                  </p>
                  <p className="num text-2xl font-bold text-[hsl(var(--gonuts-good))]">
                    €{Math.abs(myBalance).toFixed(2)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-[hsl(var(--gonuts-bad))] mb-0.5">
                    {t("you_owe")}
                  </p>
                  <p className="num text-2xl font-bold text-[hsl(var(--gonuts-bad))]">
                    €{Math.abs(myBalance).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action strip */}
          <div className="border-t flex divide-x">
            {actions.map(({ icon: Icon, label, onClick }) => (
              <button
                key={label}
                className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-muted-foreground hover:bg-muted/50 active:bg-muted transition-colors"
                onClick={onClick}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] uppercase tracking-wide font-medium">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
  );
}
