import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine, Cell } from "recharts";
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
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { GroupBalance } from "@/types/worker";

interface StatsGroupBalancesProps {
    data: GroupBalance[];
    isLoading?: boolean;
}

export function StatsGroupBalances({
    data,
    isLoading
}: StatsGroupBalancesProps) {
    const { t } = useTranslation();

    // We need to resolve names for members if not guests
    const profiles = useLiveQuery(() => db.profiles.toArray());

    const chartData = data.map(d => {
        let name = d.guestName || "Unknown";
        if (d.userId && profiles) {
            const profile = profiles.find(p => p.id === d.userId);
            if (profile?.full_name) name = profile.full_name;
            else if (profile?.email) name = profile.email.split('@')[0];
        }
        return {
            ...d,
            name: name
        };
    });

    const chartConfig = {
        balance: {
            label: t("balance"),
            color: "hsl(var(--primary))",
        },
    } satisfies ChartConfig;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("group_balances")}</CardTitle>
                <CardDescription>{t("group_balances_desc")}</CardDescription>
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
                                data={chartData}
                                layout="vertical"
                                margin={{
                                    left: 20,
                                    right: 20,
                                    top: 12,
                                    bottom: 12,
                                }}
                            >
                                <CartesianGrid horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tickLine={false}
                                    axisLine={false}
                                    width={100}
                                />
                                <ChartTooltip
                                    cursor={{ fill: 'transparent' }}
                                    content={
                                        <ChartTooltipContent
                                            hideLabel
                                            valueFormatter={(value) => `€${Number(value).toFixed(2)}`}
                                        />
                                    }
                                />
                                <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" />
                                <Bar dataKey="balance" radius={4}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.balance >= 0 ? "hsl(142.1 70.6% 45.3%)" : "hsl(0 84.2% 60.2%)"}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </LazyChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
