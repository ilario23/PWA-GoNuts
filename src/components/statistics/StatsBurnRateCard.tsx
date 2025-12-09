import { Activity, AlertCircle } from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface BurnRateData {
    dailyAverage: number;
    projectedMonthEnd?: number;
    projectedYearEnd?: number;
    daysElapsed: number;
    daysRemaining: number;
    onTrack: boolean;
    noBudget: boolean;
}

interface StatsBurnRateCardProps {
    activeTab: "monthly" | "yearly";
    burnRate: BurnRateData & { projectedMonthEnd: number };
    yearlyBurnRate: BurnRateData & { projectedYearEnd: number };
}

export function StatsBurnRateCard({
    activeTab,
    burnRate,
    yearlyBurnRate,
}: StatsBurnRateCardProps) {
    const { t } = useTranslation();

    const currentBurnRate = activeTab === "monthly" ? burnRate : yearlyBurnRate;

    return (
        <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle>{t("burn_rate")}</CardTitle>
                    <CardDescription>{t("burn_rate_desc")}</CardDescription>
                </div>
                {currentBurnRate.noBudget ? (
                    <Activity className="h-5 w-5 text-muted-foreground" />
                ) : currentBurnRate.onTrack ? (
                    <Activity className="h-5 w-5 text-destructive" />
                ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-muted-foreground">
                            {t("daily_average")}
                        </div>
                        <div className="text-2xl font-bold">
                            €{currentBurnRate.dailyAverage.toFixed(2)}
                            {t("per_day")}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground">
                            {activeTab === "monthly"
                                ? t("projected_month_end")
                                : t("projected_year_end")}
                        </div>
                        <div
                            className={`text-2xl font-bold ${currentBurnRate.noBudget
                                ? "text-foreground"
                                : currentBurnRate.onTrack
                                    ? "text-destructive"
                                    : "text-destructive"
                                }`}
                        >
                            €
                            {(activeTab === "monthly"
                                ? burnRate.projectedMonthEnd
                                : yearlyBurnRate.projectedYearEnd
                            ).toFixed(2)}
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>
                            {t("days_elapsed")}: {currentBurnRate.daysElapsed}
                        </span>
                        <span>
                            {t("days_remaining")}: {currentBurnRate.daysRemaining}
                        </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                            className={`h-full ${currentBurnRate.noBudget
                                ? "bg-muted-foreground"
                                : currentBurnRate.onTrack
                                    ? "bg-destructive"
                                    : "bg-destructive"
                                }`}
                            style={{
                                width: `${(currentBurnRate.daysElapsed /
                                    (currentBurnRate.daysElapsed +
                                        currentBurnRate.daysRemaining)) *
                                    100
                                    }%`,
                            }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
