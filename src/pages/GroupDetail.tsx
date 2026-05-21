import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGroups, calculateSettlement } from "@/hooks/useGroups";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/contexts/AuthProvider";
import { useSync } from "@/hooks/useSync";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  RefreshCw,
  ArrowRight,
  CheckCircle2,
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

  const group = useMemo(() => {
    if (groups && groupId) {
      return groups.find((g) => g.id === groupId) || null;
    }
    return null;
  }, [groups, groupId]);

  const [balance, setBalance] = useState<Awaited<
    ReturnType<typeof getGroupBalance>
  > | null>(null);

  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState<
    string | null
  >(null);

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

  // Compute settle-up suggestions
  const settlements = useMemo(() => {
    if (!balance) return [];
    return calculateSettlement(
      Object.fromEntries(
        Object.values(balance.balances).map((b) => [
          b.memberId,
          {
            userId: b.memberId,
            share: b.share,
            shouldPay: b.shouldPay,
            hasPaid: b.hasPaid,
            balance: b.balance,
          } as { userId: string; share: number; shouldPay: number; hasPaid: number; balance: number },
        ])
      )
    );
  }, [balance]);

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
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/groups")}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-tight truncate">{group.name}</h1>
          {group.description && (
            <p className="text-xs text-muted-foreground truncate">{group.description}</p>
          )}
        </div>
        <Button
          onClick={() => sync()}
          disabled={isSyncing}
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground shrink-0"
          title={t("sync_now") || "Sync now"}
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        </Button>
        <Button
          size="sm"
          className="gap-1.5 bg-[hsl(var(--gonuts-orange))] hover:bg-[hsl(var(--gonuts-orange))]/90 text-white shrink-0"
          onClick={() => {
            setEditingTransaction(null);
            setIsTxDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("add_transaction")}</span>
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

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
              {t("total_expenses")}
            </p>
            <p className="num text-xl font-bold">
              €{Math.round(balance?.totalExpenses || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
              {t("your_share")}
            </p>
            <p className="num text-xl font-bold">{group.myShare}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              €{(myBalance?.shouldPay || 0).toFixed(0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
              {t("balance")}
            </p>
            <p
              className={`num text-xl font-bold ${
                (myBalance?.balance || 0) >= 0
                  ? "text-[hsl(var(--gonuts-good))]"
                  : "text-[hsl(var(--gonuts-bad))]"
              }`}
            >
              {(myBalance?.balance || 0) >= 0 ? "+" : ""}
              €{Math.abs(myBalance?.balance || 0).toFixed(0)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {t("has_paid_amount", { amount: (myBalance?.hasPaid || 0).toFixed(0) })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Settle-up suggestions */}
      {balance && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              {t("settlement_plan")}
            </p>
            {settlements.length === 0 ? (
              <div className="flex items-center gap-2 text-[hsl(var(--gonuts-good))]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <p className="text-sm font-medium">{t("no_payments_needed")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {settlements.map((s, i) => {
                  const fromEntry = Object.values(balance.balances).find(
                    (b) => b.memberId === s.from
                  );
                  const toEntry = Object.values(balance.balances).find(
                    (b) => b.memberId === s.to
                  );
                  const fromName = fromEntry?.displayName ?? t("unknown");
                  const toName = toEntry?.displayName ?? t("unknown");
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 py-1.5 px-3 rounded-[var(--radius-sm)] bg-muted/50"
                    >
                      <span className="text-sm font-medium min-w-0 truncate flex-1">
                        {fromName}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="num text-sm font-bold text-[hsl(var(--gonuts-orange))]">
                          €{s.amount.toFixed(2)}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium min-w-0 truncate flex-1 text-right">
                        {toName}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 dark:bg-primary/20">
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
