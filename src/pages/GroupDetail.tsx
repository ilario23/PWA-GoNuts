import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGroups, GroupWithMembers } from "@/hooks/useGroups";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/contexts/AuthProvider";
import { useSync } from "@/hooks/useSync";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  Plus,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { TransactionList } from "@/components/TransactionList";
import { getIconComponent } from "@/lib/icons";
import {
  TransactionDialog,
  TransactionFormData,
} from "@/components/TransactionDialog";
import { Transaction } from "@/lib/db";

export function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { sync, isSyncing } = useSync();
  const { groups, getGroupBalance } = useGroups();
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions(undefined, undefined, groupId);
  const { categories } = useCategories(groupId);

  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [balance, setBalance] = useState<{
    totalExpenses: number;
    balances: Record<
      string,
      {
        userId: string;
        share: number;
        shouldPay: number;
        hasPaid: number;
        balance: number;
      }
    >;
    members: any[];
  } | null>(null);

  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<
    string | null
  >(null);

  // Find the group
  useEffect(() => {
    if (groups && groupId) {
      const foundGroup = groups.find((g) => g.id === groupId);
      setGroup(foundGroup || null);
    }
  }, [groups, groupId]);

  // Load balance
  useEffect(() => {
    const loadBalance = async () => {
      if (groupId) {
        const bal = await getGroupBalance(groupId);
        setBalance(bal);
      }
    };
    loadBalance();
  }, [groupId, getGroupBalance, transactions]);

  // Filter transactions for this group only
  const groupTransactions = useMemo(() => {
    return (
      transactions?.filter((t) => t.group_id === groupId && !t.deleted_at) || []
    );
  }, [transactions, groupId]);

  // Filter categories for this group
  const groupCategories = useMemo(() => {
    return (
      categories?.filter((c) => c.group_id === groupId && !c.deleted_at) || []
    );
  }, [categories, groupId]);

  const handleSaveTransaction = async (data: TransactionFormData) => {
    if (!user || !groupId) return;

    // paid_by_member_id is required for group transactions (database constraint: paid_by_logic)
    const paidByMemberId = data.paid_by_member_id || null;

    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, {
        amount: data.amount,
        description: data.description || "",
        type: data.type,
        category_id: data.category_id,
        date: data.date,
        year_month: data.date.substring(0, 7),
        group_id: groupId,
        paid_by_member_id: paidByMemberId,
      });
    } else {
      await addTransaction({
        user_id: user.id,
        amount: data.amount,
        description: data.description || "",
        type: data.type,
        category_id: data.category_id,
        date: data.date,
        year_month: data.date.substring(0, 7),
        group_id: groupId,
        paid_by_member_id: paidByMemberId,
      });
    }

    setIsTxDialogOpen(false);
    setEditingTransaction(null);
  };

  const handleDeleteConfirm = async () => {
    if (deletingTransactionId) {
      await deleteTransaction(deletingTransactionId);
      setDeletingTransactionId(null);
    }
  };

  const myBalance = balance?.balances[user?.id || ""];

  if (!group) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/groups")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("groups")}
        </Button>
        <div className="text-center text-muted-foreground py-8">
          {t("loading")}...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          {group.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
        </div>
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
            {isSyncing ? t("syncing") || "Syncing..." : t("sync_now") || "Sync"}
          </span>
        </Button>
        <Button
          size="icon"
          className="md:w-auto md:px-4 md:h-10"
          onClick={() => {
            setEditingTransaction(null);
            setIsTxDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">{t("add_transaction")}</span>
        </Button>
        <TransactionDialog
          open={isTxDialogOpen}
          onOpenChange={(open) => {
            setIsTxDialogOpen(open);
            if (!open) {
              setEditingTransaction(null);
            }
          }}
          onSubmit={handleSaveTransaction}
          defaultGroupId={groupId}
          editingTransaction={editingTransaction}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("total_expenses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{(balance?.totalExpenses || 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("your_share")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{group.myShare}%</div>
            <p className="text-xs text-muted-foreground">
              {t("should_pay")}: €{(myBalance?.shouldPay || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("balance")}
            </CardTitle>
            {(myBalance?.balance || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${(myBalance?.balance || 0) >= 0
                ? "text-green-600"
                : "text-red-600"
                }`}
            >
              {(myBalance?.balance || 0) >= 0 ? "+" : ""}€
              {(myBalance?.balance || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("has_paid")}: €{(myBalance?.hasPaid || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">{t("transactions")}</TabsTrigger>
          <TabsTrigger value="categories">{t("categories")}</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <TransactionList
            transactions={groupTransactions}
            categories={categories}
            groups={group ? [group] : []}
            onEdit={(transaction) => {
              setEditingTransaction(transaction);
              setIsTxDialogOpen(true);
            }}
            onDelete={(id) => setDeletingTransactionId(id)}
            isLoading={transactions === undefined}
          />
        </TabsContent>


        <TabsContent value="categories" className="space-y-4">
          {groupCategories.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("no_categories")}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groupCategories.map((category) => {
                const IconComp = category.icon
                  ? getIconComponent(category.icon)
                  : null;
                return (
                  <Card key={category.id}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: category.color }}
                      >
                        {IconComp && (
                          <IconComp className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {t(category.type)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={!!deletingTransactionId}
        onOpenChange={(open) => !open && setDeletingTransactionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm_delete_transaction")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm_delete_transaction_description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
