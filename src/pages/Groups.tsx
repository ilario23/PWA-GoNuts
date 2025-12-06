import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useGroups,
  GroupWithMembers,
} from "@/hooks/useGroups";
import { useAuth } from "@/contexts/AuthProvider";
import { useSync } from "@/hooks/useSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ContentLoader } from "@/components/ui/content-loader";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plus,
  Users,
  Check,
  AlertTriangle,
  IdCard,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { GroupCard } from "@/components/GroupCard";
import { ManageMembersDrawer } from "@/components/ManageMembersDrawer";
import { GroupBalanceDrawer } from "@/components/GroupBalanceDrawer";

interface GroupFormData {
  name: string;
  description: string;
}



export function GroupsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sync, isSyncing } = useSync();
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
  // balanceTab removed - GroupBalanceDrawer uses Accordion instead of Tabs

  const [formData, setFormData] = useState<GroupFormData>({
    name: "",
    description: "",
  });
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


  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      toast.error(t("name_required"));
      return;
    }
    await createGroup(
      formData.name.trim(),
      formData.description.trim() || undefined
    );
    setFormData({ name: "", description: "" });
    setIsCreateDialogOpen(false);
    toast.success(t("group_created"));
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !formData.name.trim()) return;
    await updateGroup(editingGroup.id, {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
    });
    setEditingGroup(null);
    setFormData({ name: "", description: "" });
    toast.success(t("group_updated"));
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
    setFormData({ name: group.name, description: group.description || "" });
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

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t("groups")}</h2>
        <div className="flex gap-2">
          {/* Refresh Button */}
          <Button
            onClick={() => sync()}
            disabled={isSyncing}
            variant="outline"
            size="icon"
            className="md:w-auto md:px-4 md:h-10"
            title={t("sync_now") || "Sync now"}
          >
            <RefreshCw
              className={`h-4 w-4 md:mr-2 ${isSyncing ? "animate-spin" : ""}`}
            />
            <span className="hidden md:inline">
              {isSyncing
                ? t("syncing") || "Syncing..."
                : t("sync_now") || "Sync"}
            </span>
          </Button>
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
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="icon" className="md:w-auto md:px-4 md:h-10">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">{t("add_group")}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("add_group")}</DialogTitle>
                <DialogDescription>{t("add_group_desc")}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t("name")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t("group_name_placeholder")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">{t("description")}</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder={t("group_description_placeholder")}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button onClick={handleCreateGroup}>{t("save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
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
          {groups.map((group) => (
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

      {/* Edit Group Dialog */}
      <Dialog
        open={!!editingGroup}
        onOpenChange={(open) => !open && setEditingGroup(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit_group")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t("name")}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">{t("description")}</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleUpdateGroup}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
