import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { MerchantStat } from "@/types/worker";

interface StatsTopMerchantsProps {
  data: MerchantStat[];
  isLoading?: boolean;
}

export function StatsTopMerchants({ data, isLoading }: StatsTopMerchantsProps) {
  const { t } = useTranslation();

  const top = useMemo(() => data.slice(0, 10), [data]);
  const max = top[0]?.total ?? 1;
  const grandTotal = top.reduce((s, m) => s + m.total, 0) || 1;

  if (isLoading || top.length === 0) return null;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("top_merchants")}</CardTitle>
        <CardDescription>{t("top_merchants_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {top.map((m, i) => (
            <div key={`${m.name}-${i}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("transactions_count", { count: m.count })}
                    {" · "}
                    {t("avg_per_tx", { amount: `€${m.avg.toFixed(0)}` })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="num text-sm font-bold">€{m.total.toFixed(0)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {((m.total / grandTotal) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-chart-1 transition-all"
                  style={{ width: `${Math.min(100, (m.total / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
