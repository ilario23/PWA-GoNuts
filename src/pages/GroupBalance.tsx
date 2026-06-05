import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useGroups, calculateSettlement } from "@/hooks/useGroups";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserAvatar } from "@/components/UserAvatar";
import { SettlementHistory } from "@/components/groups/SettlementHistory";
import { generateSettlementShareText } from "@/lib/settlements";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  ListOrdered,
  Users,
  History,
  Share2,
  HandCoins,
} from "lucide-react";

export function GroupBalancePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { groups, getGroupBalance } = useGroups();
  const { recordPairSettlement, undoSettlementPayment } = useTransactions();

  const group = groups?.find((g) => g.id === groupId) || null;
  const [balance, setBalance] = useState<Awaited<
    ReturnType<typeof getGroupBalance>
  > | null>(null);

  // Payment dialog state — shared by "Mark as paid" (prefilled) and "Record a payment" (manual)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [payFrom, setPayFrom] = useState("");
  const [payTo, setPayTo] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [suggestedAmount, setSuggestedAmount] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<"mark" | "manual">("manual");
  const [isSaving, setIsSaving] = useState(false);

  const refresh = async () => {
    if (!groupId) return;
    const data = await getGroupBalance(groupId);
    setBalance(data);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, getGroupBalance]);

  // Suggested settlements, computed by member id (matches recordPairSettlement input)
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
          },
        ])
      )
    );
  }, [balance]);

  if (!group || !balance) {
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
          {t("loading")}
        </div>
      </div>
    );
  }

  const memberOptions = Object.values(balance.balances);
  const nameByMemberId = (memberId: string) =>
    memberOptions.find((b) => b.memberId === memberId)?.displayName ??
    t("unknown");

  const myBalance = balance.balances[user?.id || ""];
  const myMemberId = myBalance?.memberId;
  const netBalance = myBalance?.balance ?? 0;
  const isSettled = Math.abs(netBalance) < 0.01;
  const isOwed = netBalance > 0.01;

  const openMarkPaid = (from: string, to: string, amount: number) => {
    setPayFrom(from);
    setPayTo(to);
    setPayAmount(amount.toFixed(2));
    setPayNote("");
    setSuggestedAmount(amount);
    setPaymentMode("mark");
    setIsPaymentOpen(true);
  };

  const openManual = () => {
    // Seed from the most relevant suggested settlement so fields aren't blank.
    const seed =
      settlements.find((s) => s.from === myMemberId || s.to === myMemberId) ??
      settlements[0];
    if (seed) {
      setPayFrom(seed.from);
      setPayTo(seed.to);
      setPayAmount(seed.amount.toFixed(2));
      setSuggestedAmount(seed.amount);
    } else {
      // Everything is settled — default to me paying the first other member.
      const other = memberOptions.find((b) => b.memberId !== myMemberId);
      setPayFrom(myMemberId || "");
      setPayTo(other?.memberId || "");
      setPayAmount("");
      setSuggestedAmount(null);
    }
    setPayNote("");
    setPaymentMode("manual");
    setIsPaymentOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!user || !groupId) return;
    if (!payFrom || !payTo) {
      toast.error(t("select_member"));
      return;
    }
    if (payFrom === payTo) {
      toast.error(t("payer_receiver_same"));
      return;
    }
    const parsed = Number(payAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error(t("invalid_amount"));
      return;
    }

    setIsSaving(true);
    try {
      await recordPairSettlement({
        userId: user.id,
        groupId,
        fromMemberId: payFrom,
        toMemberId: payTo,
        amount: parsed,
        note: payNote.trim() || undefined,
      });
      await refresh();
      setIsPaymentOpen(false);
      toast.success(t("payment_marked_paid_success"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUndo = async (settlementPaymentId: string) => {
    await undoSettlementPayment(settlementPaymentId);
    await refresh();
    toast.success(t("settlement_undo_success"));
  };

  const handleShare = async () => {
    if (settlements.length === 0) return;
    const text = generateSettlementShareText({
      groupName: group.name,
      totalExpenses: balance.totalExpenses,
      settlements,
      balances: Object.fromEntries(
        memberOptions.map((b) => [b.memberId, { displayName: b.displayName }])
      ),
      currentUserId: myMemberId || "",
      t,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t("settlement_plan")} - ${group.name}`,
          text,
        });
        toast.success(t("plan_shared"));
        return;
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("plan_copied"));
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error(t("export_error"));
    }
  };

  const balanceColor = isSettled
    ? "text-muted-foreground"
    : isOwed
    ? "text-[hsl(var(--gonuts-good))]"
    : "text-[hsl(var(--gonuts-bad))]";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/groups/${group.id}`)}
          className="h-9 w-9 shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-tight truncate">
            {t("group_balance")}
          </h1>
          <p className="text-xs text-muted-foreground truncate">{group.name}</p>
        </div>
      </div>

      {/* Hero net balance */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("total_expenses")}:{" "}
              <span className="num font-medium text-foreground">
                €{balance.totalExpenses.toFixed(2)}
              </span>
            </p>
            <Badge variant={isSettled ? "secondary" : isOwed ? "default" : "destructive"}>
              {isSettled ? t("all_settled") : isOwed ? t("owed_to_you") : t("you_owe")}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className={`rounded-full p-3 bg-muted ${balanceColor}`}>
              {isSettled ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : isOwed ? (
                <ArrowUpRight className="h-7 w-7" />
              ) : (
                <ArrowDownRight className="h-7 w-7" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground mb-1">
                {t("net_balance")}
              </p>
              <p className={`num text-4xl font-bold ${balanceColor}`}>
                {isSettled ? "€0.00" : `${isOwed ? "+" : ""}€${Math.abs(netBalance).toFixed(2)}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1 gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white"
          onClick={openManual}
        >
          <HandCoins className="h-4 w-4" />
          {t("record_payment")}
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={handleShare}
          disabled={settlements.length === 0}
        >
          <Share2 className="h-4 w-4" />
          {t("share_plan")}
        </Button>
      </div>

      {/* Settlement plan */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <ListOrdered className="h-3.5 w-3.5" />
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
                const iAmPayer = s.from === myMemberId;
                return (
                  <div
                    key={i}
                    className="rounded-[var(--radius-sm)] bg-muted/50 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium min-w-0 truncate flex-1">
                        {s.from === myMemberId ? t("you") : nameByMemberId(s.from)}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="num text-sm font-bold text-[hsl(var(--primary))]">
                          €{s.amount.toFixed(2)}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium min-w-0 truncate flex-1 text-right">
                        {s.to === myMemberId ? t("you") : nameByMemberId(s.to)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={iAmPayer ? "default" : "outline"}
                      className="w-full gap-2"
                      onClick={() => openMarkPaid(s.from, s.to, s.amount)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {t("mark_as_paid")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member details + history */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="members" className="border rounded-[var(--radius-md)] px-4">
          <AccordionTrigger className="py-3 hover:no-underline text-sm font-medium">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("member_details")}
              <Badge className="ml-1">{memberOptions.length}</Badge>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-2 pb-3">
            {memberOptions.map((b) => (
              <Card key={b.memberId} className="bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <UserAvatar userId={b.userId} className="h-10 w-10" />
                    <div className="min-w-0">
                      <span className="font-medium text-sm">
                        {b.userId === user?.id ? t("you") : b.displayName}
                      </span>
                      <Badge className="ml-2 h-5 text-xs">{b.share}%</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">{t("should_pay")}</p>
                      <p className="num font-medium">€{b.shouldPay.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">{t("has_paid")}</p>
                      <p className="num font-medium">€{b.hasPaid.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">{t("balance")}</p>
                      <p
                        className={`num font-bold flex items-center gap-1 ${
                          b.balance >= 0
                            ? "text-[hsl(var(--gonuts-good))]"
                            : "text-[hsl(var(--gonuts-bad))]"
                        }`}
                      >
                        {b.balance >= 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        €{Math.abs(b.balance).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </AccordionContent>
        </AccordionItem>

        {balance.settlementHistory && balance.settlementHistory.length > 0 && (
          <AccordionItem
            value="history"
            className="border rounded-[var(--radius-md)] px-4 mt-2"
          >
            <AccordionTrigger className="py-3 hover:no-underline text-sm font-medium">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                {t("settlement_history")}
                <Badge className="ml-1">{balance.settlementHistory.length}</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <SettlementHistory
                entries={balance.settlementHistory}
                onUndoSettlement={handleUndo}
              />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Payment dialog (mark-as-paid + manual) */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {paymentMode === "mark" ? t("mark_as_paid") : t("record_payment")}
            </DialogTitle>
            <DialogDescription>{t("record_payment_description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("who_paid")}</Label>
              <Select value={payFrom} onValueChange={setPayFrom}>
                <SelectTrigger>
                  <SelectValue placeholder={t("select_member")} />
                </SelectTrigger>
                <SelectContent>
                  {memberOptions.map((b) => (
                    <SelectItem key={b.memberId} value={b.memberId}>
                      {b.userId === user?.id ? t("you") : b.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("who_received")}</Label>
              <Select value={payTo} onValueChange={setPayTo}>
                <SelectTrigger>
                  <SelectValue placeholder={t("select_member")} />
                </SelectTrigger>
                <SelectContent>
                  {memberOptions.map((b) => (
                    <SelectItem key={b.memberId} value={b.memberId}>
                      {b.userId === user?.id ? t("you") : b.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-amount">{t("amount")}</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
              />
              {suggestedAmount !== null && (
                <p className="text-xs text-muted-foreground">
                  {t("custom_amount_hint")}
                </p>
              )}
              {suggestedAmount !== null &&
                Number(payAmount) > suggestedAmount * 10 && (
                  <p className="text-xs text-amber-600">
                    {t("settlement_amount_high_warning")}
                  </p>
                )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-note">{t("settlement_note_label")}</Label>
              <Input
                id="pay-note"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder={t("settlement_note_placeholder")}
                maxLength={200}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentOpen(false)}
              disabled={isSaving}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleConfirmPayment} disabled={isSaving}>
              {isSaving ? t("saving") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
