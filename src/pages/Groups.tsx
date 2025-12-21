import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useGroups,
  GroupWithMembers,
} from "@/hooks/useGroups";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ContentLoader } from "@/components/ui/content-loader";


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
  Plus,
  Users,
  Check,
  AlertTriangle,
  IdCard,
  Search,
  FilterX,
} from "lucide-react";
import { toast } from "sonner";
import { GroupCard } from "@/components/GroupCard";
import { ManageMembersDrawer } from "@/components/ManageMembersDrawer";
import { GroupBalanceDrawer } from "@/components/GroupBalanceDrawer";
import { GroupFormDialog } from "@/components/groups/GroupFormDialog";
import { GroupFormValues } from "@/lib/schemas";





export function GroupsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    groups,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupBalance,
  } = useGroups();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupWithMembers | null>(
    null
  );
  const [deletingGroup, setDeletingGroup] = useState<GroupWithMembers | null>(
    null
  );
  const [deleteTransactions, setDeleteTransactions] = useState(false);
  const [managingGroupId, setManagingGroupId] = useState<string | null>(null);
  const [viewingBalance, setViewingBalance] = useState<GroupWithMembers | null>(
    null
  );
  const [balanceData, setBalanceData] = useState<Awaited<
    ReturnType<typeof getGroupBalance>
  > | null>(null);
  const [copiedUserId, setCopiedUserId] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  // Derive managingGroup from groups list to ensure reactivity
  const managingGroup = useMemo(() => {
    return groups?.find((g) => g.id === managingGroupId) || null;
  }, [groups, managingGroupId]);

  // Auto-refresh balance data when drawer is open and data might have changed
  useEffect(() => {
    if (!viewingBalance) return;

    const refreshBalance = async () => {
      const data = await getGroupBalance(viewingBalance.id);
      setBalanceData(data);
    };

    refreshBalance();
  }, [viewingBalance, groups, getGroupBalance]);


  const handleFormSubmit = async (data: GroupFormValues) => {
    if (editingGroup) {
      await updateGroup(editingGroup.id, {
        name: data.name,
        description: data.description || undefined,
      });
      toast.success(t("group_updated"));
      setEditingGroup(null);
    } else {
      await createGroup(
        data.name,
        data.description || undefined
      );
      toast.success(t("group_created"));
      setIsCreateDialogOpen(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    await deleteGroup(deletingGroup.id, deleteTransactions);
    setDeletingGroup(null);
    setDeleteTransactions(false);
    toast.success(t("group_deleted"));
  };

  const handleViewBalance = async (group: GroupWithMembers) => {
    setViewingBalance(group);
    const data = await getGroupBalance(group.id);
    setBalanceData(data);
  };

  const copyUserId = async () => {
    if (!user) return;
    await navigator.clipboard.writeText(user.id);
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 2000);
    toast.success(t("user_id_copied"));
  };

  const openEditGroup = (group: GroupWithMembers) => {
    setEditingGroup(group);
  };

  const openManageMembers = (group: GroupWithMembers) => {
    setManagingGroupId(group.id);
  };

  const handleViewStatistics = (group: GroupWithMembers) => {
    navigate(`/statistics?group=${group.id}`);
  };

  if (!groups) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center justify-between gap-4">
          <ContentLoader variant="card" count={1} className="flex-1 max-w-xs" />
        </div>
        <ContentLoader variant="group-card" count={3} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" />
      </div>
    );
  }

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!searchQuery) return groups;
    return groups.filter((g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery]);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t("groups")}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={copyUserId}
            className="md:w-auto md:px-4 md:h-10"
          >
            {copiedUserId ? (
              <Check className="h-4 w-4 md:mr-2" />
            ) : (
              <IdCard className="h-4 w-4 md:mr-2" />
            )}
            <span className="hidden md:inline">{t("copy_my_id")}</span>
          </Button>

          <Button
            onClick={() => {
              setEditingGroup(null);
              setIsCreateDialogOpen(true);
            }}
            size="icon"
            className="md:w-auto md:px-4 md:h-10"
          >
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t("add_group")}</span>
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("search_groups") || "Search groups..."}
          className="pl-8 pr-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <FilterX className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{t("no_groups")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("no_groups_desc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onEdit={openEditGroup}
              onDelete={(g) => setDeletingGroup(g)}
              onView={(g) => navigate(`/groups/${g.id}`)}
              onBalance={handleViewBalance}
              onMembers={openManageMembers}
              onStatistics={handleViewStatistics}
            />
          ))}
        </div>
      )}

      {/* Edit/Create Group Dialog */}
      <GroupFormDialog
        open={isCreateDialogOpen || !!editingGroup}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingGroup(null);
          }
        }}
        initialData={editingGroup}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Group Dialog */}
      <AlertDialog
        open={!!deletingGroup}
        onOpenChange={(open) => !open && setDeletingGroup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("confirm_delete_group")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>{t("confirm_delete_group_description")}</p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium">
                  {t("what_to_do_with_transactions")}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant={deleteTransactions ? "outline" : "default"}
                    size="sm"
                    onClick={() => setDeleteTransactions(false)}
                  >
                    {t("keep_transactions")}
                  </Button>
                  <Button
                    variant={deleteTransactions ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setDeleteTransactions(true)}
                  >
                    {t("delete_transactions")}
                  </Button>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive text-destructive-foreground"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManageMembersDrawer
        group={managingGroup}
        open={!!managingGroupId}
        onOpenChange={(open) => !open && setManagingGroupId(null)}
      />

      {/* Group Balance Drawer (Mobile-First) */}
      <GroupBalanceDrawer
        group={viewingBalance}
        balanceData={balanceData}
        open={!!viewingBalance}
        onOpenChange={(open) => {
          if (!open) {
            setViewingBalance(null);
          }
        }}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
