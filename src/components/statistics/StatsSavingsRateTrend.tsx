import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useTranslation } from "react-i18next";
import { LazyChart } from "@/components/LazyChart";
import { SavingsRatePoint } from "@/types/worker";

interface StatsSavingsRateTrendProps {
  data: SavingsRatePoint[];
  monthNames: string[];
  isLoading?: boolean;
}

export function StatsSavingsRateTrend({ data, monthNames, isLoading }: StatsSavingsRateTrendProps) {
  const { t } = useTranslation();

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        period: monthNames[d.monthIndex] ?? String(d.monthIndex + 1),
        savingsRate: Math.round(d.savingsRate * 10) / 10,
      })),
    [data, monthNames]
  );

  const hasData = chartData.some((d) => d.savingsRate !== 0);
  const chartConfig: ChartConfig = {
    savingsRate: { label: t("saving_rate"), color: "hsl(var(--chart-2))" },
  };

  if (isLoading || !hasData) return null;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("savings_rate_trend")}</CardTitle>
        <CardDescription>{t("savings_rate_trend_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <LazyChart>
            <AreaChart data={chartData} margin={{ left: -2, right: 0, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    formatter={(value) => `${Number(value).toFixed(1)}%`}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="savingsRate"
                stroke="hsl(var(--chart-2))"
                fill="hsl(var(--chart-2))"
                fillOpacity={0.18}
                strokeWidth={2}
              />
            </AreaChart>
          </LazyChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
