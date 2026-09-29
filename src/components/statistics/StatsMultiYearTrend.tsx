import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
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
import { MultiYearPoint } from "@/types/worker";

interface StatsMultiYearTrendProps {
  data: MultiYearPoint[];
  isLoading?: boolean;
}

export function StatsMultiYearTrend({ data, isLoading }: StatsMultiYearTrendProps) {
  const { t } = useTranslation();

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: d.period,
      })),
    [data]
  );

  const hasData = chartData.some((d) => d.expense > 0);
  const chartConfig: ChartConfig = {
    expense: { label: t("expense"), color: "hsl(var(--chart-1))" },
    ma3: { label: t("ma3"), color: "hsl(var(--chart-2))" },
    ma6: { label: t("ma6"), color: "hsl(var(--chart-3))" },
    ma12: { label: t("ma12"), color: "hsl(var(--chart-4))" },
  };

  if (isLoading || !hasData) return null;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("multi_year_trend")}</CardTitle>
        <CardDescription>{t("multi_year_trend_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LazyChart>
            <LineChart data={chartData} margin={{ left: -2, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
                minTickGap={28}
                tickFormatter={(v: string) => v.slice(2)} // "24-03"
              />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
              <ChartTooltip
                content={<ChartTooltipContent className="w-[160px]" />}
                labelFormatter={(label) => String(label)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={false}
                name={t("expense")}
              />
              <Line
                type="monotone"
                dataKey="ma3"
                stroke="hsl(var(--chart-2))"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                name={t("ma3")}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="ma6"
                stroke="hsl(var(--chart-3))"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                dot={false}
                name={t("ma6")}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="ma12"
                stroke="hsl(var(--chart-4))"
                strokeWidth={1.5}
                dot={false}
                name={t("ma12")}
                connectNulls
              />
            </LineChart>
          </LazyChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
