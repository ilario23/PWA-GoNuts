import { useState } from 'react';
import { useStatistics } from '@/hooks/useStatistics';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Label, RadialBarChart, RadialBar, PolarGrid, LabelList, Radar, RadarChart, PolarAngleAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

export function StatisticsPage() {
    const { t } = useTranslation();
    const now = new Date();

    // State for filters
    const [selectedMonth, setSelectedMonth] = useState(format(now, 'yyyy-MM'));
    const [selectedYear, setSelectedYear] = useState(format(now, 'yyyy'));
    const [activeTab, setActiveTab] = useState<'monthly' | 'yearly'>('monthly');

    // Get statistics based on current selection
    const {
        monthlyStats,
        monthlyNetBalance,
        monthlyCategoryPercentages,
        yearlyStats,
        yearlyNetBalance,
        yearlyCategoryPercentages,
        monthlyExpenses,
        monthlyIncome,
        monthlyInvestments,
    } = useStatistics({ selectedMonth, selectedYear });

    // Determine which stats to display based on active tab
    const currentStats = activeTab === 'monthly' ? monthlyStats : yearlyStats;
    const currentNetBalance = activeTab === 'monthly' ? monthlyNetBalance : yearlyNetBalance;
    const currentCategoryPercentages = activeTab === 'monthly' ? monthlyCategoryPercentages : yearlyCategoryPercentages;

    const chartConfig = {
        income: {
            label: t('income'),
            color: "hsl(var(--chart-2))",
        },
        expense: {
            label: t('expense'),
            color: "hsl(var(--chart-1))",
        },
        investment: {
            label: t('investment'),
            color: "hsl(var(--chart-3))",
        },
    } satisfies ChartConfig;

    // Pie chart data
    const pieData = [
        { name: "income", value: currentStats.income, fill: "var(--color-income)" },
        { name: "expense", value: currentStats.expense, fill: "var(--color-expense)" },
        { name: "investment", value: currentStats.investment, fill: "var(--color-investment)" },
    ].filter(item => item.value > 0);

    // Bar chart data
    const barData = currentStats.byCategory.map((item, index) => ({
        ...item,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));

    const sortedBarData = [...barData].sort((a, b) => b.value - a.value);

    // Generate years for selector (last 5 years + current + next)
    const currentYearNum = new Date().getFullYear();
    const years = Array.from({ length: 7 }, (_, i) => (currentYearNum - 5 + i).toString());

    // Generate months
    const months = [
        { value: '01', label: t('january') },
        { value: '02', label: t('february') },
        { value: '03', label: t('march') },
        { value: '04', label: t('april') },
        { value: '05', label: t('may') },
        { value: '06', label: t('june') },
        { value: '07', label: t('july') },
        { value: '08', label: t('august') },
        { value: '09', label: t('september') },
        { value: '10', label: t('october') },
        { value: '11', label: t('november') },
        { value: '12', label: t('december') },
    ];

    const handleMonthChange = (monthValue: string) => {
        setSelectedMonth(`${selectedYear}-${monthValue}`);
    };

    const handleYearChange = (year: string) => {
        setSelectedYear(year);
        if (activeTab === 'monthly') {
            const currentMonthPart = selectedMonth.split('-')[1];
            setSelectedMonth(`${year}-${currentMonthPart}`);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">{t('statistics')}</h1>

            {/* Tabs and filters always visible at the top */}
            <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'monthly' | 'yearly')}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="monthly">{t('monthly_statistics')}</TabsTrigger>
                    <TabsTrigger value="yearly">{t('yearly_statistics')}</TabsTrigger>
                </TabsList>

                {/* Filters - Always visible based on selected tab */}
                {activeTab === 'monthly' ? (
                    <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex flex-col gap-2 min-w-[180px]">
                            <label className="text-sm font-medium">{t('select_month')}</label>
                            <Select value={selectedMonth.split('-')[1]} onValueChange={handleMonthChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(month => (
                                        <SelectItem key={month.value} value={month.value}>
                                            {month.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[140px]">
                            <label className="text-sm font-medium">{t('select_year')}</label>
                            <Select value={selectedYear} onValueChange={handleYearChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={year}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-4 mb-6">
                        <div className="flex flex-col gap-2 min-w-[140px]">
                            <label className="text-sm font-medium">{t('select_year')}</label>
                            <Select value={selectedYear} onValueChange={handleYearChange}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={year}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </Tabs>

            {/* Summary Cards - Always visible, dynamic content based on selected tab */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('total_income')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-500">+€{currentStats.income.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('total_expenses')}</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">-€{currentStats.expense.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('investment')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-500">€{currentStats.investment.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('net_balance')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${currentNetBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {currentNetBalance >= 0 ? '+' : ''}€{currentNetBalance.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts based on selected tab */}
            {activeTab === 'monthly' ? (
                <div className="space-y-4">

                    {/* Monthly Charts */}
                    <div className="grid gap-4 md:grid-cols-2 min-w-0">
                        {/* Pie Chart - Income vs Expense */}
                        <Card className="flex flex-col min-w-0">
                            <CardHeader className="items-center pb-0">
                                <CardTitle>{t('income_vs_expense')}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 pb-0 min-w-0">
                                <ChartContainer
                                    config={chartConfig}
                                    className="mx-auto aspect-square max-w-[280px] max-h-[300px] min-h-[250px] w-full [&_.recharts-text]:fill-foreground"
                                >
                                    <PieChart>
                                        <ChartTooltip
                                            cursor={false}
                                            content={<ChartTooltipContent hideLabel />}
                                        />
                                        <Pie
                                            data={pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={60}
                                            strokeWidth={5}
                                        >
                                            <Label
                                                content={({ viewBox }) => {
                                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                                        return (
                                                            <text
                                                                x={viewBox.cx}
                                                                y={viewBox.cy}
                                                                textAnchor="middle"
                                                                dominantBaseline="middle"
                                                            >
                                                                <tspan
                                                                    x={viewBox.cx}
                                                                    y={viewBox.cy}
                                                                    className="fill-foreground text-3xl font-bold"
                                                                >
                                                                    €{(currentStats.income + currentStats.expense + currentStats.investment).toFixed(0)}
                                                                </tspan>
                                                                <tspan
                                                                    x={viewBox.cx}
                                                                    y={(viewBox.cy || 0) + 24}
                                                                    className="fill-muted-foreground text-xs"
                                                                >
                                                                    {t('total')}
                                                                </tspan>
                                                            </text>
                                                        )
                                                    }
                                                }}
                                            />
                                        </Pie>
                                        <ChartLegend content={<ChartLegendContent className="flex-wrap gap-2" />} />
                                    </PieChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        {/* Radial Chart - Category Distribution */}
                        <Card className="flex flex-col min-w-0">
                            <CardHeader className="items-center pb-0">
                                <CardTitle>{t('category_distribution')}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 pb-0 min-w-0">
                                {currentCategoryPercentages.length > 0 ? (
                                    <ChartContainer
                                        config={{}}
                                        className="mx-auto aspect-square max-w-[280px] max-h-[300px] min-h-[250px] w-full [&_.recharts-text]:fill-foreground"
                                    >
                                        <RadialBarChart
                                            data={currentCategoryPercentages.slice(0, 5)}
                                            innerRadius={40}
                                            outerRadius={130}
                                            barSize={20}
                                        >
                                            <ChartTooltip
                                                cursor={false}
                                                content={<ChartTooltipContent hideLabel nameKey="name" />}
                                            />
                                            <PolarGrid gridType="circle" />
                                            <RadialBar
                                                dataKey="value"
                                                background
                                                cornerRadius={10}
                                            />
                                            <ChartLegend content={<ChartLegendContent className="flex-wrap gap-2" />} />
                                        </RadialBarChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                                        {t('no_data')}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Horizontal Bar Chart - Expense Breakdown */}
                        <Card className="md:col-span-2 min-w-0">
                            <CardHeader>
                                <CardTitle>{t('expense_breakdown')}</CardTitle>
                            </CardHeader>
                            <CardContent className="min-w-0">
                                {sortedBarData.length > 0 ? (
                                    <ChartContainer config={{}} className="min-h-[500px] w-full max-w-[100%] overflow-hidden">
                                        <BarChart
                                            accessibilityLayer
                                            data={sortedBarData}
                                            layout="vertical"
                                            margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
                                        >
                                            <CartesianGrid horizontal={false} />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                tickLine={false}
                                                tickMargin={10}
                                                axisLine={false}
                                                width={100}
                                                className="text-xs font-medium"
                                            />
                                            <XAxis type="number" hide />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="value" radius={4} barSize={32}>
                                                <LabelList
                                                    dataKey="value"
                                                    position="right"
                                                    className="fill-foreground font-bold"
                                                    fontSize={12}
                                                    formatter={(value: number) => `€${value.toFixed(0)}`}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                                        {t('no_data')}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Radar Charts Row */}
                    <div className="grid gap-4 md:grid-cols-3 min-w-0">
                        {/* Expenses Radar Chart */}
                        <Card className="flex flex-col min-w-0">
                            <CardHeader className="items-center pb-4">
                                <CardTitle>{t('yearly_expenses')}</CardTitle>
                                <CardDescription>
                                    {t('yearly_expenses_desc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-0">
                                {monthlyExpenses.length > 0 ? (
                                    <ChartContainer
                                        config={{
                                            value: {
                                                label: t('expense'),
                                                color: "hsl(var(--chart-1))",
                                            },
                                        }}
                                        className="mx-auto aspect-square max-h-[250px]"
                                    >
                                        <RadarChart data={monthlyExpenses}>
                                            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                            <PolarAngleAxis dataKey="month" />
                                            <PolarGrid />
                                            <Radar
                                                dataKey="value"
                                                fill="var(--color-value)"
                                                fillOpacity={0.6}
                                            />
                                        </RadarChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                                        {t('no_data')}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex-col gap-2 text-sm pt-4">
                                <div className="text-muted-foreground text-center leading-none">
                                    {selectedYear}
                                </div>
                            </CardFooter>
                        </Card>

                        {/* Income Radar Chart */}
                        <Card className="flex flex-col min-w-0">
                            <CardHeader className="items-center pb-4">
                                <CardTitle>{t('yearly_income')}</CardTitle>
                                <CardDescription>
                                    {t('yearly_income_desc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-0">
                                {monthlyIncome.length > 0 ? (
                                    <ChartContainer
                                        config={{
                                            value: {
                                                label: t('income'),
                                                color: "hsl(var(--chart-2))",
                                            },
                                        }}
                                        className="mx-auto aspect-square max-h-[250px]"
                                    >
                                        <RadarChart data={monthlyIncome}>
                                            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                            <PolarAngleAxis dataKey="month" />
                                            <PolarGrid />
                                            <Radar
                                                dataKey="value"
                                                fill="var(--color-value)"
                                                fillOpacity={0.6}
                                            />
                                        </RadarChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                                        {t('no_data')}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex-col gap-2 text-sm pt-4">
                                <div className="text-muted-foreground text-center leading-none">
                                    {selectedYear}
                                </div>
                            </CardFooter>
                        </Card>

                        {/* Investments Radar Chart */}
                        <Card className="flex flex-col min-w-0">
                            <CardHeader className="items-center pb-4">
                                <CardTitle>{t('yearly_investments')}</CardTitle>
                                <CardDescription>
                                    {t('yearly_investments_desc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-0">
                                {monthlyInvestments.length > 0 ? (
                                    <ChartContainer
                                        config={{
                                            value: {
                                                label: t('investment'),
                                                color: "hsl(var(--chart-3))",
                                            },
                                        }}
                                        className="mx-auto aspect-square max-h-[250px]"
                                    >
                                        <RadarChart data={monthlyInvestments}>
                                            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                            <PolarAngleAxis dataKey="month" />
                                            <PolarGrid />
                                            <Radar
                                                dataKey="value"
                                                fill="var(--color-value)"
                                                fillOpacity={0.6}
                                            />
                                        </RadarChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                                        {t('no_data')}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex-col gap-2 text-sm pt-4">
                                <div className="text-muted-foreground text-center leading-none">
                                    {selectedYear}
                                </div>
                            </CardFooter>
                        </Card>
                    </div>

                    {/* Category Distribution & Expense Breakdown Row */}
                    <div className="grid gap-4 md:grid-cols-2 min-w-0">
                        {/* Radial Chart - Category Distribution (Yearly) */}
                        <Card className="flex flex-col min-w-0">
                            <CardHeader className="items-center pb-0">
                                <CardTitle>{t('category_distribution')}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 pb-0 min-w-0">
                                {yearlyCategoryPercentages.length > 0 ? (
                                    <ChartContainer
                                        config={{}}
                                        className="mx-auto aspect-square max-w-[280px] max-h-[300px] min-h-[250px] w-full [&_.recharts-text]:fill-foreground"
                                    >
                                        <RadialBarChart
                                            data={yearlyCategoryPercentages.slice(0, 5)}
                                            innerRadius={40}
                                            outerRadius={130}
                                            barSize={20}
                                        >
                                            <ChartTooltip
                                                cursor={false}
                                                content={<ChartTooltipContent hideLabel nameKey="name" />}
                                            />
                                            <PolarGrid gridType="circle" />
                                            <RadialBar
                                                dataKey="value"
                                                background
                                                cornerRadius={10}
                                            />
                                            <ChartLegend content={<ChartLegendContent className="flex-wrap gap-2" />} />
                                        </RadialBarChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                                        {t('no_data')}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Horizontal Bar Chart - Expense Breakdown (Yearly) */}
                        <Card className="flex flex-col min-w-0">
                            <CardHeader>
                                <CardTitle>{t('expense_breakdown')}</CardTitle>
                            </CardHeader>
                            <CardContent className="min-w-0">
                                {sortedBarData.length > 0 ? (
                                    <ChartContainer config={{}} className="min-h-[300px] w-full max-w-[100%] overflow-hidden">
                                        <BarChart
                                            accessibilityLayer
                                            data={sortedBarData.slice(0, 8)}
                                            layout="vertical"
                                            margin={{ left: 0, right: 40, top: 0, bottom: 0 }}
                                        >
                                            <CartesianGrid horizontal={false} />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                tickLine={false}
                                                tickMargin={10}
                                                axisLine={false}
                                                width={100}
                                                className="text-xs font-medium"
                                            />
                                            <XAxis type="number" hide />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="value" radius={4} barSize={32}>
                                                <LabelList
                                                    dataKey="value"
                                                    position="right"
                                                    className="fill-foreground font-bold"
                                                    fontSize={12}
                                                    formatter={(value: number) => `€${value.toFixed(0)}`}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ChartContainer>
                                ) : (
                                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                                        {t('no_data')}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
