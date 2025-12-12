import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { SmoothLoader } from "@/components/ui/smooth-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";
import { CountUp } from "@/components/ui/count-up";

interface DashboardSummaryCardsProps {
    totalExpense: number;
    totalIncome: number;
    balance: number;
    isStatsLoading: boolean;
}

export function DashboardSummaryCards({
    totalExpense,
    totalIncome,
    balance,
    isStatsLoading,
}: DashboardSummaryCardsProps) {
    const { t } = useTranslation();

    // Helper to render value or placeholder
    const renderAnimatedValue = (value: number, prefix: string = "", suffix: string = "", decimals: number = 2) => {
        if (value === 0) {
            return <span>-</span>;
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
        <div className="hidden md:flex md:flex-col gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t("total_expenses")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SmoothLoader
                        isLoading={isStatsLoading}
                        skeleton={<Skeleton className="h-8 w-28" />}
                    >
                        <div className="text-2xl font-bold text-red-600">
                            {renderAnimatedValue(totalExpense, "-€")}
                        </div>
                    </SmoothLoader>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t("total_income")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SmoothLoader
                        isLoading={isStatsLoading}
                        skeleton={<Skeleton className="h-8 w-28" />}
                    >
                        <div className="text-2xl font-bold text-green-600">
                            {renderAnimatedValue(totalIncome, "+€")}
                        </div>
                    </SmoothLoader>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        {t("total_balance")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <SmoothLoader
                        isLoading={isStatsLoading}
                        skeleton={<Skeleton className="h-8 w-28" />}
                    >
                        <div
                            className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                        >
                            {renderAnimatedValue(balance, balance >= 0 ? "+€" : "€")}
                        </div>
                    </SmoothLoader>
                </CardContent>
            </Card>
        </div>
    );
}
