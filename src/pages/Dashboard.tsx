import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactions } from '@/hooks/useTransactions';
import { useStatistics } from '@/hooks/useStatistics';
import { useTranslation } from 'react-i18next';
import { TransactionList } from '@/components/TransactionList';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategorySelector } from '@/components/CategorySelector';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Dashboard() {
    const { transactions, addTransaction } = useTransactions();
    const { user } = useAuth();
    const { t } = useTranslation();
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');

    // Get current month statistics
    const { monthlyStats, dailyCumulativeExpenses } = useStatistics({ selectedMonth: currentMonth });

    const totalIncome = monthlyStats.income;
    const totalExpense = monthlyStats.expense;
    const balance = totalIncome - totalExpense;

    // Transaction dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        type: 'expense' as 'income' | 'expense' | 'investment',
        category_id: '',
        date: new Date().toISOString().split('T')[0],
    });

    // Reset category when type changes
    useEffect(() => {
        setFormData(prev => ({ ...prev, category_id: '' }));
    }, [formData.type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!formData.category_id) {
            alert(t('select_category_required'));
            return;
        }

        await addTransaction({
            user_id: user.id,
            amount: parseFloat(formData.amount),
            description: formData.description,
            type: formData.type,
            category_id: formData.category_id,
            date: formData.date,
            year_month: formData.date.substring(0, 7),
        });

        setIsDialogOpen(false);
        setFormData({
            amount: '',
            description: '',
            category_id: '',
            type: 'expense',
            date: new Date().toISOString().split('T')[0],
        });
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'expense': return 'bg-red-500 hover:bg-red-600 text-white';
            case 'income': return 'bg-green-500 hover:bg-green-600 text-white';
            case 'investment': return 'bg-blue-500 hover:bg-blue-600 text-white';
            default: return '';
        }
    };

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
                            <ChartContainer config={chartConfig} className="h-[180px] w-full md:h-auto">
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
                <div className="hidden md:flex md:flex-col gap-4">
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
                        <ScrollArea className="h-[250px] pr-4 md:h-[300px]">
                            <TransactionList
                                transactions={transactions?.filter(t => !t.deleted_at).slice(0, 5)}
                                showActions={false}
                            />
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Floating Action Button - Mobile Only */}
            <Button
                onClick={() => setIsDialogOpen(true)}
                className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
                size="icon"
            >
                <Plus className="h-6 w-6" />
            </Button>

            {/* Add Transaction Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-lg">
                    <DialogHeader>
                        <DialogTitle>{t('add_transaction')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('type')}</label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={`w-full ${formData.type === 'expense' ? getTypeColor('expense') : ''}`}
                                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                                >
                                    {t('expense')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={`w-full ${formData.type === 'income' ? getTypeColor('income') : ''}`}
                                    onClick={() => setFormData({ ...formData, type: 'income' })}
                                >
                                    {t('income')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={`w-full ${formData.type === 'investment' ? getTypeColor('investment') : ''}`}
                                    onClick={() => setFormData({ ...formData, type: 'investment' })}
                                >
                                    {t('investment')}
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('category')}</label>
                            <CategorySelector
                                value={formData.category_id}
                                onChange={(value) => setFormData({ ...formData, category_id: value })}
                                type={formData.type}
                                modal
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('amount')}</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('date')}</label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('description')}</label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full">{t('save')}</Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}