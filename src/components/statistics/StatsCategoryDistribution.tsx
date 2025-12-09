import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell } from "recharts";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { LazyChart } from "@/components/LazyChart";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CategoryData {
    name: string;
    value: number;      // percentage
    amount: number;     // actual € amount
    fill: string;       // color
    [key: string]: string | number; // Index signature for Recharts compatibility
}

interface StatsCategoryDistributionProps {
    categoryData: CategoryData[];
    isLoading?: boolean;
}

// Fixed colors for the donut chart segments
const CHART_COLORS = [
    "hsl(262.1 83.3% 57.8%)",   // Purple
    "hsl(173.4 80.4% 40%)",     // Teal
    "hsl(47.9 95.8% 53.1%)",    // Yellow
    "hsl(221.2 83.2% 53.3%)",   // Blue
    "hsl(339.2 90.4% 51.2%)",   // Pink
    "hsl(var(--muted-foreground))", // Others - gray
];

export function StatsCategoryDistribution({
    categoryData,
    isLoading = false,
}: StatsCategoryDistributionProps) {
    const { t } = useTranslation();

    // Process data: top 5 + "Others"
    const { donutData, listData } = useMemo(() => {
        if (!categoryData || categoryData.length === 0) {
            return { donutData: [], listData: [] };
        }

        // Sort by amount descending
        const sorted = [...categoryData].sort((a, b) => b.amount - a.amount);

        // Take top 5
        const top5 = sorted.slice(0, 5);

        // Group the rest into "Others"
        const others = sorted.slice(5);
        const othersAmount = others.reduce((sum, cat) => sum + cat.amount, 0);
        const othersPercentage = others.reduce((sum, cat) => sum + cat.value, 0);

        // Prepare donut data with assigned colors
        const donut: CategoryData[] = top5.map((cat, index) => ({
            ...cat,
            fill: CHART_COLORS[index],
        }));

        if (othersAmount > 0) {
            donut.push({
                name: t("others"),
                value: othersPercentage,
                amount: othersAmount,
                fill: CHART_COLORS[5],
            });
        }

        // Full list for scrollable area (all categories sorted by amount)
        const list = sorted.map((cat, index) => ({
            ...cat,
            // Use category's original color or assign from chart colors
            displayColor: index < 5 ? CHART_COLORS[index] : cat.fill,
        }));

        return { donutData: donut, listData: list };
    }, [categoryData, t]);

    // Chart config for tooltip
    const chartConfig = useMemo(() => {
        const config: Record<string, { label: string; color: string }> = {};
        donutData.forEach((item) => {
            config[item.name] = {
                label: item.name,
                color: item.fill,
            };
        });
        return config;
    }, [donutData]);

    if (categoryData.length === 0 && !isLoading) {
        return (
            <Card className="flex flex-col min-w-0">
                <CardHeader className="items-center pb-0">
                    <CardTitle>{t("category_distribution")}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-0 min-w-0">
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                        {t("no_data")}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="flex flex-col min-w-0">
            <CardHeader className="items-center pb-2">
                <CardTitle>{t("category_distribution")}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-4 min-w-0">
                {/* Compact Donut Chart */}
                <LazyChart height={180} isLoading={isLoading}>
                    <ChartContainer
                        config={chartConfig}
                        className="mx-auto aspect-square max-w-[180px] h-[180px]"
                    >
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        formatter={(value, name, props) => (
                                            <span>
                                                {name}: €{props.payload.amount?.toFixed(2)} ({value}%)
                                            </span>
                                        )}
                                    />
                                }
                            />
                            <Pie
                                data={donutData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={50}
                                outerRadius={75}
                                strokeWidth={2}
                                stroke="hsl(var(--background))"
                            >
                                {donutData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                </LazyChart>

                {/* Category List */}
                <div className="mt-4">
                    <div className="text-xs text-muted-foreground mb-2 px-1">
                        {t("all_categories")} ({listData.length})
                    </div>
                    <ScrollArea className="h-[200px] pr-2">
                        <div className="space-y-2">
                            {listData.map((category, index) => (
                                <div
                                    key={category.name}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    {/* Color indicator */}
                                    <div
                                        className="w-3 h-3 rounded-full shrink-0"
                                        style={{
                                            backgroundColor: index < 5 ? CHART_COLORS[index] : category.fill,
                                        }}
                                    />

                                    {/* Category info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium truncate">
                                                {category.name}
                                            </span>
                                            <span className="text-sm font-semibold ml-2 shrink-0">
                                                €{category.amount.toFixed(2)}
                                            </span>
                                        </div>

                                        {/* Progress bar */}
                                        <div className="w-full bg-muted rounded-full h-1.5">
                                            <div
                                                className="h-1.5 rounded-full transition-all duration-300"
                                                style={{
                                                    width: `${Math.max(category.value, 1)}%`,
                                                    backgroundColor: index < 5 ? CHART_COLORS[index] : category.fill,
                                                }}
                                            />
                                        </div>

                                        {/* Percentage */}
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {category.value}%
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}
