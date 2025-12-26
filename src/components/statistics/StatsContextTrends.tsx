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
import { Context } from "@/lib/db";
import { LazyChart } from "@/components/LazyChart";

interface StatsContextTrendsProps {
    data: any[];
    contexts: Context[] | undefined;
    isLoading?: boolean;
}

export function StatsContextTrends({
    data,
    contexts,
    isLoading,
}: StatsContextTrendsProps) {
    const { t } = useTranslation();

    const chartConfig = useMemo(() => {
        const config: ChartConfig = {};
        if (!contexts) return config;

        contexts.forEach((context, index) => {
            config[context.id] = {
                label: context.name,
                color: `hsl(var(--chart-${(index % 5) + 1}))`,
            };
        });
        return config;
    }, [contexts]);

    if (!contexts || contexts.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("context_trends")}</CardTitle>
                <CardDescription>{t("context_trends_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <LazyChart>
                            <AreaChart
                                data={data}
                                margin={{
                                    left: -2,
                                    right: 0,
                                    top: 12,
                                    bottom: 12,
                                }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="period"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickFormatter={(value) => value.slice(0, 3)}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `€${value}`}
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            className="w-[150px]"
                                            nameKey="views"
                                            labelFormatter={(value) => value}
                                        />
                                    }
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                {contexts.map((context) => (
                                    <Area
                                        key={context.id}
                                        type="monotone"
                                        dataKey={context.id}
                                        stackId="1"
                                        stroke={`var(--color-${context.id})`}
                                        fill={`var(--color-${context.id})`}
                                    />
                                ))}
                            </AreaChart>
                        </LazyChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
