import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { SmoothLoader } from "@/components/ui/smooth-loader";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

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
                            -€{totalExpense.toFixed(2)}
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
                            +€{totalIncome.toFixed(2)}
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
                            {balance >= 0 ? "+" : "-"}€{Math.abs(balance).toFixed(2)}
                        </div>
                    </SmoothLoader>
                </CardContent>
            </Card>
        </div>
    );
}
