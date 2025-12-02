import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Share2, ArrowRight, ArrowDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettlementTransaction } from "@/hooks/useGroups";
import { toast } from "sonner";

interface SettlementPlanProps {
  settlements: SettlementTransaction[];
  balances: Record<string, { displayName: string; avatarUrl?: string }>;
  currentUserId: string;
  groupName: string;
  totalExpenses: number;
  onMarkPaid?: (settlement: SettlementTransaction) => void;
}

/**
 * Displays an optimized settlement plan showing who needs to pay whom.
 * Highlights transactions involving the current user and provides share functionality.
 */
export function SettlementPlan({
  settlements,
  balances,
  currentUserId,
  groupName,
  totalExpenses,
  onMarkPaid,
}: SettlementPlanProps) {
  const { t } = useTranslation();

  // Filter settlements involving current user
  const mySettlements = settlements.filter(
    (s) => s.from === currentUserId || s.to === currentUserId
  );
  const otherSettlements = settlements.filter(
    (s) => s.from !== currentUserId && s.to !== currentUserId
  );

  const handleShare = async () => {
    // Generate shareable text
    const text = generateShareText();

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t("settlement_plan")} - ${groupName}`,
          text: text,
        });
        toast.success(t("plan_shared"));
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to clipboard
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("plan_copied"));
    } catch (err) {
      console.error("Copy failed:", err);
      toast.error(t("export_error"));
    }
  };

  const generateShareText = () => {
    const lines = [
      `${t("settlement_plan")} - ${groupName}`,
      `${t("total_expenses")}: €${totalExpenses.toFixed(2)}`,
      "",
      t("payments_needed") + ":",
    ];

    settlements.forEach((settlement, index) => {
      const fromName = balances[settlement.from]?.displayName || "Unknown";
      const toName = balances[settlement.to]?.displayName || "Unknown";

      const fromLabel = settlement.from === currentUserId ? t("you") : fromName;
      const toLabel = settlement.to === currentUserId ? t("you") : toName;
      lines.push(
        `${index + 1}. ${fromLabel} → €${settlement.amount.toFixed(
          2
        )} → ${toLabel}`
      );
    });

    lines.push("");
    lines.push(`${t("generated_by")} ${t("app_title")}`);

    return lines.join("\n");
  };

  const handleMarkPaid = (settlement: SettlementTransaction) => {
    // Placeholder for future implementation
    toast.info(t("payment_marked_paid"));
    onMarkPaid?.(settlement);
  };

  if (settlements.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("all_settled")}</h3>
          <p className="text-muted-foreground text-sm text-center">
            {t("no_payments_needed")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-medium">
            {t("settlement_plan")}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("share_plan")}</span>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {settlements.length === 1
              ? t("payment_needed")
              : `${settlements.length} ${t("payments_needed")}`}
          </p>
        </CardContent>
      </Card>

      {/* My Settlements */}
      {mySettlements.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">
            {t("you")}
          </h3>
          {mySettlements.map((settlement, index) => (
            <SettlementItem
              key={`my-${index}`}
              settlement={settlement}
              fromName={balances[settlement.from]?.displayName}
              toName={balances[settlement.to]?.displayName}
              currentUserId={currentUserId}
              onMarkPaid={handleMarkPaid}
              highlighted
            />
          ))}
        </div>
      )}

      {/* Other Settlements */}
      {otherSettlements.length > 0 && (
        <>
          {mySettlements.length > 0 && <Separator />}
          <div className="space-y-2">
            {mySettlements.length > 0 && (
              <h3 className="text-sm font-medium text-muted-foreground px-1">
                {t("others")}
              </h3>
            )}
            {otherSettlements.map((settlement, index) => (
              <SettlementItem
                key={`other-${index}`}
                settlement={settlement}
                fromName={balances[settlement.from]?.displayName}
                toName={balances[settlement.to]?.displayName}
                currentUserId={currentUserId}
                onMarkPaid={handleMarkPaid}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface SettlementItemProps {
  settlement: SettlementTransaction;
  fromName?: string;
  toName?: string;
  currentUserId: string;
  onMarkPaid: (settlement: SettlementTransaction) => void;
  highlighted?: boolean;
}

function SettlementItem({
  settlement,
  fromName = "Unknown",
  toName = "Unknown",
  currentUserId,
  onMarkPaid,
  highlighted = false,
}: SettlementItemProps) {
  const { t } = useTranslation();
  const isMyPayment = settlement.from === currentUserId;

  return (
    <Card
      className={highlighted ? "border-primary bg-primary/5" : "bg-muted/50"}
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* From User */}
          <div className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto sm:flex-1 min-w-0">
            <span className="text-sm font-medium truncate">
              {settlement.from === currentUserId ? t("you") : fromName}
            </span>
          </div>

          {/* Amount */}
          <div className="flex items-center gap-2 shrink-0 py-1 sm:py-0">
            <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground" />
            <ArrowDown className="sm:hidden h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary" className="font-mono">
              €{settlement.amount.toFixed(2)}
            </Badge>
            <ArrowRight className="hidden sm:block h-4 w-4 text-muted-foreground" />
            <ArrowDown className="sm:hidden h-4 w-4 text-muted-foreground" />
          </div>

          {/* To User */}
          <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto sm:flex-1 min-w-0">
            <span className="text-sm font-medium truncate order-1 sm:order-none">
              {settlement.to === currentUserId ? t("you") : toName}
            </span>
          </div>
        </div>

        {/* Mark as Paid Button (only for current user's payments) */}
        {isMyPayment && (
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkPaid(settlement)}
              className="w-full gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t("mark_as_paid")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
