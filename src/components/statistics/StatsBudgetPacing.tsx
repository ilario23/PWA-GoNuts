import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
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
import { BudgetPacing } from "@/types/worker";

interface StatsBudgetPacingProps {
  data: BudgetPacing;
  monthNames: string[];
  isLoading?: boolean;
}

export function StatsBudgetPacing({ data, monthNames, isLoading }: StatsBudgetPacingProps) {
  const { t } = useTranslation();

  const chartData = useMemo(
    () =>
      data.points.map((p) => ({
        period: monthNames[p.monthIndex] ?? String(p.monthIndex + 1),
        actual: Math.round(p.actual),
        budget: Math.round(p.budget),
      })),
    [data.points, monthNames]
  );

  const hasData = data.monthlyBudget > 0 || chartData.some((d) => d.actual > 0);
  const overBudget = data.ytdActual > data.ytdBudget && data.ytdBudget > 0;

  const chartConfig: ChartConfig = {
    actual: { label: t("expense"), color: "hsl(var(--chart-1))" },
    budget: { label: t("budget"), color: "hsl(var(--chart-5))" },
  };

  if (isLoading || !hasData) return null;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("budget_pacing")}</CardTitle>
        <CardDescription>{t("budget_pacing_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[14px] bg-muted/50 px-3 py-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("projected_year_end")}
            </div>
            <div className="num text-lg font-bold">
              €{data.projectedYearEnd.toFixed(0)}
            </div>
          </div>
          <div className="rounded-[14px] bg-muted/50 px-3 py-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("ytd_vs_budget")}
            </div>
            <div
              className={`num text-lg font-bold ${
                overBudget ? "text-gonuts-bad" : "text-gonuts-good"
              }`}
            >
              €{data.ytdActual.toFixed(0)}
              <span className="text-xs text-muted-foreground font-normal">
                {" "}/ €{data.ytdBudget.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <LazyChart>
            <BarChart data={chartData} margin={{ left: -2, right: 0, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} />
              <ChartTooltip content={<ChartTooltipContent className="w-[150px]" />} />
              <ReferenceLine
                y={data.monthlyBudget}
                stroke="hsl(var(--chart-5))"
                strokeDasharray="4 3"
              />
              <Bar dataKey="actual" radius={[6, 6, 0, 0]} fill="hsl(var(--chart-1))" />
            </BarChart>
          </LazyChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
