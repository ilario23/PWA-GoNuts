import { SettlementHistoryEntry } from "@/hooks/useGroups";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SettlementHistoryProps {
  entries: SettlementHistoryEntry[];
  onUndoSettlement?: (settlementPaymentId: string) => void;
}

export function SettlementHistory({
  entries,
  onUndoSettlement,
}: SettlementHistoryProps) {
  const { t } = useTranslation();

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <Card key={entry.id} className="bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {entry.fromDisplayName} → {entry.toDisplayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.date}
                  {entry.note ? ` • ${entry.note}` : ""}
                </p>
              </div>
              <p className="text-sm font-semibold shrink-0">
                €{entry.amount.toFixed(2)}
              </p>
            </div>

            {entry.canUndo && onUndoSettlement && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full"
                onClick={() => onUndoSettlement(entry.id)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("undo_settlement")}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function EmptySettlementHistory() {
  const { t } = useTranslation();
  return (
    <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground flex items-center gap-2">
      <History className="h-4 w-4" />
      {t("no_settlement_history")}
    </div>
  );
}
