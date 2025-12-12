import { TrendingUp, TrendingDown } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { FlipCard } from "@/components/ui/flip-card";
import { useTranslation } from "react-i18next";
import { CountUp } from "@/components/ui/count-up";

interface StatsSummaryCardsProps {
    activeTab: "monthly" | "yearly";
    currentStats: {
        income: number;
        expense: number;
        investment: number;
    };
    currentNetBalance: number;
    yearlyMonthlyAverages: {
        income: number;
        expense: number;
        investment: number;
        netBalance: number;
        monthCount: number;
    };
    flippedCards: Record<string, boolean>;
    toggleCard: (cardId: string) => void;
}

export function StatsSummaryCards({
    activeTab,
    currentStats,
    currentNetBalance,
    yearlyMonthlyAverages,
    flippedCards,
    toggleCard,
}: StatsSummaryCardsProps) {
    const { t } = useTranslation();

    // Helper to render vertical dots
    const renderVerticalDots = (
        activeIndex: number,
        activeColorClass: string = "bg-primary"
    ) => (
        <div className="flex flex-col gap-1 ml-1.5">
            {[0, 1].map((i) => (
                <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${i === activeIndex ? activeColorClass : "bg-muted-foreground/30"
                        }`}
                />
            ))}
        </div>
    );

    // Helper to render value or placeholder
    const renderAnimatedValue = (value: number, prefix: string = "", suffix: string = "", decimals: number = 2) => {
        if (value === 0) {
            return <span className="text-muted-foreground">-</span>;
        }
        return (
            <CountUp
                value={value}
                decimals={decimals}
                prefix={prefix}
                suffix={suffix}
            />
        );
    };

    return (
        <div className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
            {/* Income Card */}
            {activeTab === "yearly" ? (
                <FlipCard
                    className="min-h-[110px] h-full"
                    isFlipped={flippedCards.income}
                    onFlip={() => toggleCard("income")}
                    flipDirection="top"
                    frontContent={
                        <Card className="h-full hover:bg-accent/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium">
                                    {t("total_income")}
                                </CardTitle>
                                <div className="flex items-center">
                                    <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                                    {renderVerticalDots(0, "bg-green-500")}
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2 md:pb-6">
                                <div className="text-lg md:text-2xl font-bold text-green-500">
                                    {renderAnimatedValue(currentStats.income, "+€")}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t("tap_for_average")}
                                </p>
                            </CardContent>
                        </Card>
                    }
                    backContent={
                        <Card className="h-full bg-accent/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium">
                                    {t("monthly_average")}
                                </CardTitle>
                                <div className="flex items-center">
                                    <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                                    {renderVerticalDots(1, "bg-green-500")}
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2 md:pb-6">
                                <div className="text-lg md:text-2xl font-bold text-green-500 flex items-baseline">
                                    {renderAnimatedValue(yearlyMonthlyAverages.income, "+€")}
                                    {yearlyMonthlyAverages.income !== 0 && (
                                        <span className="text-sm font-normal text-muted-foreground ml-1">
                                            {t("per_month")}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {yearlyMonthlyAverages.monthCount} {t("months_with_data")}
                                </p>
                            </CardContent>
                        </Card>
                    }
                />
            ) : (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">
                            {t("total_income")}
                        </CardTitle>
                        <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                    </CardHeader>
                    <CardContent className="pb-2 md:pb-6">
                        <div className="text-lg md:text-2xl font-bold text-green-500">
                            {renderAnimatedValue(currentStats.income, "+€")}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Expense Card */}
            {activeTab === "yearly" ? (
                <FlipCard
                    className="min-h-[110px] h-full"
                    isFlipped={flippedCards.expense}
                    onFlip={() => toggleCard("expense")}
                    flipDirection="top"
                    frontContent={
                        <Card className="h-full hover:bg-accent/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium">
                                    {t("total_expenses")}
                                </CardTitle>
                                <div className="flex items-center">
                                    <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                                    {renderVerticalDots(0, "bg-red-500")}
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2 md:pb-6">
                                <div className="text-lg md:text-2xl font-bold text-red-500">
                                    {renderAnimatedValue(currentStats.expense, "-€")}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t("tap_for_average")}
                                </p>
                            </CardContent>
                        </Card>
                    }
                    backContent={
                        <Card className="h-full bg-accent/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium">
                                    {t("monthly_average")}
                                </CardTitle>
                                <div className="flex items-center">
                                    <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                                    {renderVerticalDots(1, "bg-red-500")}
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2 md:pb-6">
                                <div className="text-lg md:text-2xl font-bold text-red-500 flex items-baseline">
                                    {renderAnimatedValue(yearlyMonthlyAverages.expense, "-€")}
                                    {yearlyMonthlyAverages.expense !== 0 && (
                                        <span className="text-sm font-normal text-muted-foreground ml-1">
                                            {t("per_month")}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {yearlyMonthlyAverages.monthCount} {t("months_with_data")}
                                </p>
                            </CardContent>
                        </Card>
                    }
                />
            ) : (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">
                            {t("total_expenses")}
                        </CardTitle>
                        <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                    </CardHeader>
                    <CardContent className="pb-2 md:pb-6">
                        <div className="text-lg md:text-2xl font-bold text-red-500">
                            {renderAnimatedValue(currentStats.expense, "-€")}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Investment Card */}
            {activeTab === "yearly" ? (
                <FlipCard
                    className="min-h-[110px] h-full"
                    isFlipped={flippedCards.investment}
                    onFlip={() => toggleCard("investment")}
                    flipDirection="top"
                    frontContent={
                        <Card className="h-full hover:bg-accent/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium">
                                    {t("investment")}
                                </CardTitle>
                                <div className="flex items-center">
                                    {renderVerticalDots(0, "bg-blue-500")}
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2 md:pb-6">
                                <div className="text-lg md:text-2xl font-bold text-blue-500">
                                    {renderAnimatedValue(currentStats.investment, "€")}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t("tap_for_average")}
                                </p>
                            </CardContent>
                        </Card>
                    }
                    backContent={
                        <Card className="h-full bg-accent/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium">
                                    {t("monthly_average")}
                                </CardTitle>
                                <div className="flex items-center">
                                    {renderVerticalDots(1, "bg-blue-500")}
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2 md:pb-6">
                                <div className="text-lg md:text-2xl font-bold text-blue-500 flex items-baseline">
                                    {renderAnimatedValue(yearlyMonthlyAverages.investment, "€")}
                                    {yearlyMonthlyAverages.investment !== 0 && (
                                        <span className="text-sm font-normal text-muted-foreground ml-1">
                                            {t("per_month")}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {yearlyMonthlyAverages.monthCount} {t("months_with_data")}
                                </p>
                            </CardContent>
                        </Card>
                    }
                />
            ) : (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">
                            {t("investment")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-2 md:pb-6">
                        <div className="text-lg md:text-2xl font-bold text-blue-500">
                            {renderAnimatedValue(currentStats.investment, "€")}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Net Balance Card */}
            {activeTab === "yearly" ? (
                <FlipCard
                    className="min-h-[110px] h-full"
                    isFlipped={flippedCards.netBalance}
                    onFlip={() => toggleCard("netBalance")}
                    flipDirection="top"
                    frontContent={
                        <Card className="h-full hover:bg-accent/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium">
                                    {t("net_balance")}
                                </CardTitle>
                                <div className="flex items-center">
                                    {renderVerticalDots(
                                        0,
                                        currentNetBalance >= 0 ? "bg-green-500" : "bg-red-500"
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2 md:pb-6">
                                <div
                                    className={`text-lg md:text-2xl font-bold ${currentNetBalance >= 0 ? "text-green-500" : "text-red-500"
                                        }`}
                                >
                                    {renderAnimatedValue(currentNetBalance, currentNetBalance >= 0 ? "+€" : "€")}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t("tap_for_average")}
                                </p>
                            </CardContent>
                        </Card>
                    }
                    backContent={
                        <Card className="h-full bg-accent/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                                <CardTitle className="text-xs md:text-sm font-medium">
                                    {t("monthly_average")}
                                </CardTitle>
                                <div className="flex items-center">
                                    {renderVerticalDots(
                                        1,
                                        yearlyMonthlyAverages.netBalance >= 0
                                            ? "bg-green-500"
                                            : "bg-red-500"
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2 md:pb-6">
                                <div
                                    className={`text-lg md:text-2xl font-bold ${yearlyMonthlyAverages.netBalance >= 0
                                        ? "text-green-500"
                                        : "text-red-500"
                                        }`}
                                >
                                    <div className="flex items-baseline">
                                        {renderAnimatedValue(
                                            yearlyMonthlyAverages.netBalance,
                                            yearlyMonthlyAverages.netBalance >= 0 ? "+€" : "€"
                                        )}
                                        {yearlyMonthlyAverages.netBalance !== 0 && (
                                            <span className="text-sm font-normal text-muted-foreground ml-1">
                                                {t("per_month")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {yearlyMonthlyAverages.monthCount} {t("months_with_data")}
                                </p>
                            </CardContent>
                        </Card>
                    }
                />
            ) : (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                        <CardTitle className="text-xs md:text-sm font-medium">
                            {t("net_balance")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-2 md:pb-6">
                        <div
                            className={`text-lg md:text-2xl font-bold ${currentNetBalance >= 0 ? "text-green-500" : "text-red-500"
                                }`}
                        >
                            {renderAnimatedValue(currentNetBalance, currentNetBalance >= 0 ? "+€" : "€")}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Saving Rate */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">
                        {t("saving_rate")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-2 md:pb-6">
                    {currentStats.income > 0 ? (
                        <div
                            className={`text-lg md:text-2xl font-bold ${((currentStats.income - currentStats.expense) /
                                currentStats.income) *
                                100 >=
                                0
                                ? "text-green-500"
                                : "text-red-500"
                                }`}
                        >
                            {renderAnimatedValue(
                                ((currentStats.income - currentStats.expense) / currentStats.income) * 100,
                                "",
                                "%",
                                1
                            )}
                        </div>
                    ) : (
                        <div className="text-lg md:text-2xl font-bold text-muted-foreground">
                            -
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Saving Rate with Investments */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium">
                        {t("saving_rate_with_investments")}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pb-2 md:pb-6">
                    {currentStats.income > 0 ? (
                        <div
                            className={`text-lg md:text-2xl font-bold ${((currentStats.income -
                                currentStats.expense -
                                currentStats.investment) /
                                currentStats.income) *
                                100 >=
                                0
                                ? "text-green-500"
                                : "text-red-500"
                                }`}
                        >
                            {renderAnimatedValue(
                                ((currentStats.income -
                                    currentStats.expense -
                                    currentStats.investment) /
                                    currentStats.income) * 100,
                                "",
                                "%",
                                1
                            )}
                        </div>
                    ) : (
                        <div className="text-lg md:text-2xl font-bold text-muted-foreground">
                            -
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
