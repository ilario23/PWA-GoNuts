import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { UserAvatar } from "@/components/UserAvatar";

interface BalanceChartProps {
    balances: Record<
        string,
        {
            userId: string;
            share: number;
            shouldPay: number;
            hasPaid: number;
            balance: number;
            displayName: string;
        }
    >;
    currentUserId: string;
}

/**
 * Visual representation of group member balances using a bar chart.
 * Shows "Should Pay" vs "Has Paid" for each member with color coding.
 */
// Custom tooltip component defined outside
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
    const { t } = useTranslation();
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <Card>
                <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <UserAvatar userId={data.userId} className="w-8 h-8" />
                        <p className="font-semibold">{data.name}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">{t("should_pay")}:</span>
                            <span className="font-medium">€{data.shouldPay.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">{t("has_paid")}:</span>
                            <span className="font-medium">€{data.hasPaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4 pt-1 border-t">
                            <span className="text-muted-foreground">{t("balance")}:</span>
                            <span
                                className={`font-bold ${data.balance >= 0 ? "text-green-600" : "text-red-600"
                                    }`}
                            >
                                {data.balance >= 0 ? "+" : ""}€{data.balance.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }
    return null;
};

// Custom label for bars defined outside
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
        <text
            x={x + width / 2}
            y={y - 5}
            fill="currentColor"
            className="text-xs fill-muted-foreground"
            textAnchor="middle"
        >
            €{value.toFixed(0)}
        </text>
    );
};

/**
 * Visual representation of group member balances using a bar chart.
 * Shows "Should Pay" vs "Has Paid" for each member with color coding.
 */
export function BalanceChart({ balances, currentUserId }: BalanceChartProps) {
    const { t } = useTranslation();

    // Transform data for chart
    const chartData = Object.values(balances)
        .map((balance) => ({
            userId: balance.userId,
            name:
                balance.userId === currentUserId
                    ? t("you")
                    : balance.displayName || balance.userId.slice(0, 8) + "...",
            shouldPay: balance.shouldPay,
            hasPaid: balance.hasPaid,
            balance: balance.balance,
            isCurrentUser: balance.userId === currentUserId,
        }))
        .sort((a, b) => {
            // Sort: current user first, then by balance descending
            if (a.isCurrentUser) return -1;
            if (b.isCurrentUser) return 1;
            return b.balance - a.balance;
        });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base font-medium">
                    {t("visual_breakdown")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    {t("should_pay")}{t("vs")}{t("has_paid")}
                </p>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="name"
                            className="text-xs"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                        />
                        <YAxis
                            className="text-xs"
                            tick={{ fontSize: 12 }}
                            tickLine={false}
                            tickFormatter={(value) => `€${value}`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                        <Legend
                            wrapperStyle={{ fontSize: "14px" }}
                            iconType="rect"
                            iconSize={12}
                        />
                        <Bar
                            dataKey="shouldPay"
                            name={t("should_pay")}
                            fill="hsl(var(--muted-foreground))"
                            radius={[4, 4, 0, 0]}
                            label={<CustomLabel />}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`should-${index}`}
                                    fill={
                                        entry.isCurrentUser
                                            ? "hsl(var(--primary))"
                                            : "hsl(var(--muted-foreground))"
                                    }
                                    fillOpacity={0.6}
                                />
                            ))}
                        </Bar>
                        <Bar
                            dataKey="hasPaid"
                            name={t("has_paid")}
                            radius={[4, 4, 0, 0]}
                            label={<CustomLabel />}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`paid-${index}`}
                                    fill={
                                        entry.balance >= 0
                                            ? "hsl(142 76% 36%)" // green-600
                                            : "hsl(0 84% 60%)" // red-500
                                    }
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                {/* Legend explanation */}
                <div className="mt-4 pt-4 border-t space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-green-600" />
                        <span>{t("balance")} {t("balance_ge_zero")} {t("owed_to_you")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-red-500" />
                        <span>{t("balance")} {t("balance_lt_zero")} {t("you_owe")}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
