import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
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
import { WeekdaySeasonality } from "@/types/worker";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

interface StatsWeekdaySeasonalityProps {
  data: WeekdaySeasonality;
  isLoading?: boolean;
}

export function StatsWeekdaySeasonality({ data, isLoading }: StatsWeekdaySeasonalityProps) {
  const { t } = useTranslation();

  const chartData = useMemo(
    () =>
      data.days.map((d) => ({
        day: t(`weekdays_short.${WEEKDAY_KEYS[d.weekday]}`),
        total: Math.round(d.total),
        avg: Math.round(d.avg),
        isWeekend: d.weekday === 0 || d.weekday === 6,
      })),
    [data.days, t]
  );

  const hasData = chartData.some((d) => d.total > 0);
  const chartConfig: ChartConfig = {
    total: { label: t("expense"), color: "hsl(var(--chart-1))" },
  };

  const busiestLabel = t(
    `weekdays_short.${WEEKDAY_KEYS[data.busiestWeekday] ?? "mon"}`
  );

  if (isLoading || !hasData) return null;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("weekday_seasonality")}</CardTitle>
        <CardDescription>
          {t("weekday_seasonality_desc")}
          {" · "}
          {t("weekend_share", { percent: data.weekendPct.toFixed(0) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <LazyChart>
            <BarChart data={chartData} margin={{ left: -2, right: 0, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
              <ChartTooltip content={<ChartTooltipContent className="w-[140px]" />} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {chartData.map((d) => (
                  <Cell
                    key={d.day}
                    fill={d.isWeekend ? "hsl(var(--chart-1))" : "hsl(var(--chart-3))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </LazyChart>
        </ChartContainer>
        <p className="text-xs text-muted-foreground">
          {t("busiest_weekday", { day: busiestLabel })}
        </p>
      </CardContent>
    </Card>
  );
}
