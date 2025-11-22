import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactions } from '@/hooks/useTransactions';
import { useStatistics } from '@/hooks/useStatistics';
import { useTranslation } from 'react-i18next';
import { TransactionList } from '@/components/TransactionList';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

export function Dashboard() {
    const { transactions } = useTransactions();
    const { t } = useTranslation();
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');

    // Get current month statistics
    const { monthlyStats, dailyCumulativeExpenses } = useStatistics({ selectedMonth: currentMonth });

    const totalIncome = monthlyStats.income;
    const totalExpense = monthlyStats.expense;
    const balance = totalIncome - totalExpense;

    const chartConfig = {
        cumulative: {
            label: t('cumulative_expenses'),
            color: "hsl(var(--chart-1))",
        },
        projection: {
            label: t('projection'),
            color: "hsl(var(--chart-2))",
        },
    } satisfies ChartConfig;

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">{t('dashboard')}</h1>

            {/* Chart and Summary Cards Layout */}
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                {/* Cumulative Expenses Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('monthly_expenses_trend')}</CardTitle>
                        <CardDescription>
                            {t('cumulative_daily_expenses')} - {format(now, 'MMMM yyyy')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {dailyCumulativeExpenses.length > 0 ? (
                            <ChartContainer config={chartConfig}>
                                <AreaChart
                                    accessibilityLayer
                                    data={dailyCumulativeExpenses}
                                    margin={{
                                        left: 12,
                                        right: 12,
                                    }}
                                >
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="day"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent indicator="line" />}
                                    />
                                    <Area
                                        dataKey="cumulative"
                                        type="monotone"
                                        fill="var(--color-cumulative)"
                                        fillOpacity={0.4}
                                        stroke="var(--color-cumulative)"
                                    />
                                    <Area
                                        dataKey="projection"
                                        type="monotone"
                                        fill="var(--color-projection)"
                                        fillOpacity={0.2}
                                        stroke="var(--color-projection)"
                                        strokeDasharray="5 5"
                                    />
                                </AreaChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                                {t('no_data')}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <div className="flex w-full items-start gap-2 text-sm">
                            <div className="grid gap-2">
                                <div className="flex items-center gap-2 font-medium leading-none">
                                    {t('total_expenses_this_month')} <TrendingUp className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-2 leading-none text-muted-foreground">
                                    €{totalExpense.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </CardFooter>
                </Card>

                {/* Summary Cards - Hidden on mobile, stacked vertically on desktop */}
                <div className="hidden md:flex md:flex-col gap-4 md:min-w-[280px]">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('total_balance')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                €{balance.toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('total_income')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                +€{totalIncome.toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('total_expenses')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                -€{totalExpense.toFixed(2)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="grid gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('recent_transactions')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionList
                            transactions={transactions?.filter(t => !t.deleted_at).slice(0, 5)}
                            showActions={false}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}