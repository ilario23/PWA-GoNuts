import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { RootCategoryTrend } from "@/types/worker";

interface StatsRootCategoryTrendProps {
  data: RootCategoryTrend;
  isLoading?: boolean;
}

export function StatsRootCategoryTrend({ data, isLoading }: StatsRootCategoryTrendProps) {
  const { t } = useTranslation();

  const cats = useMemo(() => data.categories.slice(0, 6), [data.categories]);

  const chartData = useMemo(
    () =>
      data.points.map((p) => {
        const row: Record<string, number | string> = {
          period: p.period.slice(5), // "MM"
        };
        cats.forEach((c) => {
          row[c.name] = Math.round(p.values[c.name] ?? 0);
        });
        return row;
      }),
    [data.points, cats]
  );

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    cats.forEach((c, i) => {
      config[c.name] = {
        label: c.name,
        color: c.color || `hsl(var(--chart-${(i % 5) + 1}))`,
      };
    });
    return config;
  }, [cats]);

  const hasData = chartData.some((row) =>
    cats.some((c) => Number(row[c.name] ?? 0) > 0)
  );

  if (isLoading || !hasData || cats.length === 0) return null;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("root_category_trend")}</CardTitle>
        <CardDescription>{t("root_category_trend_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <LazyChart>
            <AreaChart data={chartData} margin={{ left: -2, right: 0, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
              <ChartTooltip content={<ChartTooltipContent className="w-[180px]" />} />
              <ChartLegend content={<ChartLegendContent />} />
              {cats.map((c) => (
                <Area
                  key={c.name}
                  type="monotone"
                  dataKey={c.name}
                  stackId="1"
                  stroke={c.color || "var(--color-chart-1)"}
                  fill={c.color || "var(--color-chart-1)"}
                  fillOpacity={0.55}
                />
              ))}
            </AreaChart>
          </LazyChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
