import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGroups, GroupWithMembers, calculateSettlement } from "@/hooks/useGroups";
import { useAuth } from "@/hooks/useAuth";
import { useSync } from "@/hooks/useSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Users,
  Crown,
  UserPlus,
  UserMinus,
  Check,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  IdCard,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { GroupCard } from "@/components/GroupCard";
import { UserAvatar } from "@/components/UserAvatar";
import { BalanceStatusCard } from "@/components/BalanceStatusCard";
import { SettlementPlan } from "@/components/SettlementPlan";
import { BalanceChart } from "@/components/BalanceChart";

import { supabase } from "@/lib/supabase";

interface GroupFormData {
  name: string;
  description: string;
}

interface MemberFormData {
  userId: string;
  share: number;
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
    addMember,
    removeMember,
    updateAllShares,
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
  const [managingGroupId, setManagingGroupId] =
    useState<string | null>(null);
  const [viewingBalance, setViewingBalance] = useState<GroupWithMembers | null>(
    null
  );
  const [balanceData, setBalanceData] = useState<Awaited<
    ReturnType<typeof getGroupBalance>
  > | null>(null);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [balanceTab, setBalanceTab] = useState("settlement");

  const [formData, setFormData] = useState<GroupFormData>({
    name: "",
    description: "",
  });
  const [newMemberData, setNewMemberData] = useState<MemberFormData>({
    userId: "",
    share: 0,
  });
  const [memberShares, setMemberShares] = useState<Record<string, number>>({});

  // Derive managingGroup from groups list to ensure reactivity
  const managingGroup = useMemo(() => {
    return groups?.find((g) => g.id === managingGroupId) || null;
  }, [groups, managingGroupId]);

  // Calculate total share
  const totalShare = useMemo(() => {
    return Object.values(memberShares).reduce((sum, share) => sum + share, 0);
  }, [memberShares]);

  const isShareValid = Math.abs(totalShare - 100) < 0.01;

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

  const handleAddMember = async () => {
    if (!managingGroup || !newMemberData.userId.trim()) {
      toast.error(t("user_id_required"));
      return;
    }

    // Check if user is already a member
    if (
      managingGroup.members.some(
        (m) => m.user_id === newMemberData.userId.trim()
      )
    ) {
      toast.error(t("user_already_member"));
      return;
    }

    // Check if user exists
    try {
      const { data: exists, error } = await supabase.rpc("check_user_exists", {
        user_id: newMemberData.userId.trim(),
      });

      if (error) {
        console.error("Error checking user existence:", error);
        toast.error(t("error_checking_user"));
        return;
      }

      if (!exists) {
        toast.error(t("user_not_found"));
        return;
      }
    } catch (err) {
      console.error("Unexpected error checking user:", err);
      toast.error(t("error_checking_user"));
      return;
    }

    await addMember(
      managingGroup.id,
      newMemberData.userId.trim(),
      0
    );
    setNewMemberData({ userId: "", share: 0 });
    toast.success(t("member_added"));
  };

  const handleRemoveMember = async (memberId: string) => {
    await removeMember(memberId);
    toast.success(t("member_removed"));
  };

  const handleSaveShares = async () => {
    if (!managingGroup) return;
    if (!isShareValid) {
      toast.error(t("shares_must_equal_100"));
      return;
    }

    const shares = Object.entries(memberShares).map(([memberId, share]) => ({
      memberId,
      share,
    }));

    await updateAllShares(managingGroup.id, shares);
    setManagingGroupId(null);
    toast.success(t("shares_updated"));
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
    const shares: Record<string, number> = {};
    group.members.forEach((m) => {
      shares[m.user_id] = m.share;
    });
    setMemberShares(shares);
    setManagingGroupId(group.id);
  };

  const handleViewStatistics = (group: GroupWithMembers) => {
    navigate(`/statistics?group=${group.id}`);
  };

  if (!groups) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
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
            <RefreshCw className={`h-4 w-4 md:mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isSyncing ? t("syncing") || "Syncing..." : t("sync_now") || "Sync"}</span>
          </Button>
          <Button variant="outline" size="icon" onClick={copyUserId} className="md:w-auto md:px-4 md:h-10">
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

      {/* Manage Members Dialog */}
      <Dialog
        open={!!managingGroup}
        onOpenChange={(open) => !open && setManagingGroupId(null)}
      >
        <DialogContent
          className="max-w-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("manage_members")}</DialogTitle>
            <DialogDescription>{t("manage_members_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Add Member */}
            <div className="space-y-2">
              <Label>{t("add_member")}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={t("enter_user_id")}
                  value={newMemberData.userId}
                  onChange={(e) =>
                    setNewMemberData({
                      ...newMemberData,
                      userId: e.target.value,
                    })
                  }
                  className="flex-1"
                />
                <Button onClick={handleAddMember} size="icon">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Members List with Shares */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("member_shares")}</Label>
                <Badge variant={isShareValid ? "default" : "destructive"}>
                  {t("total")}: {totalShare.toFixed(1)}%
                </Badge>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {managingGroup?.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted"
                    >
                      <div className="flex-1 flex items-center gap-2 overflow-hidden">
                        <UserAvatar userId={member.user_id} showName className="min-w-0" />
                        {member.user_id === user?.id && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            ({t("you")})
                          </span>
                        )}
                        {managingGroup.created_by === member.user_id && (
                          <Crown className="h-3 w-3 text-yellow-500 shrink-0" />
                        )}
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={memberShares[member.id] ?? member.share}
                        onChange={(e) =>
                          setMemberShares({
                            ...memberShares,
                            [member.id]: Number(e.target.value),
                          })
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                      {member.user_id !== user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              {!isShareValid && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {t("shares_must_equal_100")}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagingGroupId(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSaveShares} disabled={!isShareValid}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Balance Dialog */}
      <Dialog
        open={!!viewingBalance}
        onOpenChange={(open) => {
          if (!open) {
            setViewingBalance(null);
            setBalanceTab("settlement"); // Reset to default tab
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("group_balance")}</DialogTitle>
          </DialogHeader>

          {balanceData && user && viewingBalance && (() => {
            // Calculate settlements
            const settlements = calculateSettlement(balanceData.balances);
            const myBalance = balanceData.balances[user.id];
            const netBalance = myBalance?.balance || 0;

            return (
              <div className="space-y-6 py-4">
                {/* Hero Status Card */}
                <BalanceStatusCard
                  netBalance={netBalance}
                  groupName={viewingBalance.name}
                  totalExpenses={balanceData.totalExpenses}
                  settlementsCount={settlements.filter(
                    (s) => s.from === user.id || s.to === user.id
                  ).length}
                  onViewPlan={() => setBalanceTab("settlement")}
                />

                {/* Tabs */}
                <Tabs value={balanceTab} onValueChange={setBalanceTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="settlement">
                      {t("settlement_plan")}
                    </TabsTrigger>
                    <TabsTrigger value="visual">
                      {t("visual_breakdown")}
                    </TabsTrigger>
                    <TabsTrigger value="details">
                      {t("member_details")}
                    </TabsTrigger>
                  </TabsList>

                  {/* Settlement Plan Tab */}
                  <TabsContent value="settlement" className="mt-4">
                    <SettlementPlan
                      settlements={settlements}
                      balances={balanceData.balances}
                      currentUserId={user.id}
                      groupName={viewingBalance.name}
                      totalExpenses={balanceData.totalExpenses}
                    />
                  </TabsContent>

                  {/* Visual Breakdown Tab */}
                  <TabsContent value="visual" className="mt-4">
                    <BalanceChart
                      balances={balanceData.balances}
                      currentUserId={user.id}
                    />
                  </TabsContent>

                  {/* Member Details Tab */}
                  <TabsContent value="details" className="mt-4 space-y-3">
                    {Object.values(balanceData.balances).map((balance) => (
                      <Card key={balance.userId}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <UserAvatar userId={balance.userId} />
                              <div>
                                <span className="font-medium">
                                  {balance.userId === user.id ? (
                                    t("you")
                                  ) : (
                                    <span className="font-mono text-xs">
                                      {balance.userId.slice(0, 8)}...
                                    </span>
                                  )}
                                </span>
                                <Badge className="ml-2">{balance.share}%</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">
                                {t("should_pay")}
                              </p>
                              <p className="font-medium">
                                €{balance.shouldPay.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">
                                {t("has_paid")}
                              </p>
                              <p className="font-medium">
                                €{balance.hasPaid.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">
                                {t("balance")}
                              </p>
                              <p
                                className={`font-bold flex items-center gap-1 ${balance.balance >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                                  }`}
                              >
                                {balance.balance >= 0 ? (
                                  <ArrowUpRight className="h-4 w-4" />
                                ) : (
                                  <ArrowDownRight className="h-4 w-4" />
                                )}
                                €{Math.abs(balance.balance).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}

          <DialogFooter>
            <Button onClick={() => setViewingBalance(null)}>
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
