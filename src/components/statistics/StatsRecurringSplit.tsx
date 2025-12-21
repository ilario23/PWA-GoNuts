import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

interface StatsRecurringSplitProps {
    data: any[];
    isLoading?: boolean;
}

export function StatsRecurringSplit({
    data,
    isLoading,
}: StatsRecurringSplitProps) {
    const { t } = useTranslation();

    const chartConfig = {
        recurring: {
            label: t("recurring"),
            color: "hsl(var(--chart-2))",
        },
        oneOff: {
            label: t("onetime_transactions"),
            color: "hsl(var(--chart-1))",
        },
    } satisfies ChartConfig;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("recurring_vs_onetime")}</CardTitle>
                <CardDescription>{t("recurring_vs_onetime_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <LazyChart>
                            <BarChart
                                data={data}
                                margin={{
                                    left: 12,
                                    right: 12,
                                    top: 12,
                                    bottom: 12,
                                }}
                                stackOffset="sign"
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
                                            labelFormatter={(value) => value}
                                        />
                                    }
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar
                                    dataKey="recurring"
                                    stackId="a"
                                    fill="var(--color-recurring)"
                                    radius={[0, 0, 4, 4]}
                                />
                                <Bar
                                    dataKey="oneOff"
                                    stackId="a"
                                    fill="var(--color-oneOff)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </LazyChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
