import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useTranslation } from "react-i18next";
import { LazyChart } from "@/components/LazyChart";
import { RecurringSplit } from "@/types/worker";

interface StatsRecurringSplitProps {
  data: RecurringSplit;
  monthNames: string[];
  isLoading?: boolean;
}

export function StatsRecurringSplit({ data, monthNames, isLoading }: StatsRecurringSplitProps) {
  const { t } = useTranslation();

  const hasData = data.recurringTotal + data.oneOffTotal > 0;
  const pieData = useMemo(
    () => [
      { name: t("recurring"), value: data.recurringTotal, fill: "hsl(var(--chart-1))" },
      { name: t("one_off"), value: data.oneOffTotal, fill: "hsl(var(--chart-3))" },
    ],
    [data.recurringTotal, data.oneOffTotal, t]
  );

  const chartConfig: ChartConfig = {
    recurring: { label: t("recurring"), color: "hsl(var(--chart-1))" },
    oneOff: { label: t("one_off"), color: "hsl(var(--chart-3))" },
  };

  const monthlyData = useMemo(
    () =>
      (data.monthly ?? []).map((m) => ({
        period: monthNames[m.monthIndex] ?? String(m.monthIndex + 1),
        recurring: Math.round(m.recurring),
        oneOff: Math.round(m.oneOff),
      })),
    [data.monthly, monthNames]
  );

  if (isLoading || !hasData) return null;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("recurring_vs_one_off")}</CardTitle>
        <CardDescription>
          {t("recurring_share", { percent: data.recurringPct.toFixed(0) })} ·{" "}
          {t("recurring_vs_one_off_desc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {monthlyData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <LazyChart>
              <BarChart data={monthlyData} margin={{ left: -2, right: 0, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
                <ChartTooltip content={<ChartTooltipContent className="w-[160px]" />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="recurring" stackId="a" fill="var(--color-recurring)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="oneOff" stackId="a" fill="var(--color-oneOff)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </LazyChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ChartContainer config={chartConfig} className="h-[180px] w-[180px] shrink-0">
              <LazyChart>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </LazyChart>
            </ChartContainer>
            <div className="flex-1 w-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("recurring")}</span>
                <span className="num font-bold text-sm">€{data.recurringTotal.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("one_off")}</span>
                <span className="num font-bold text-sm">€{data.oneOffTotal.toFixed(0)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {t("transactions_count", {
                  count: data.recurringCount + data.oneOffCount,
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
