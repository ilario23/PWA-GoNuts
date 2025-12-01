import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BalanceStatusCardProps {
    netBalance: number;
    groupName: string;
    totalExpenses: number;
    settlementsCount: number;
    onViewPlan?: () => void;
}

/**
 * Displays the user's net balance status in a group at a glance.
 * Shows whether they owe money, are owed money, or are all settled.
 */
export function BalanceStatusCard({
    netBalance,
    groupName,
    totalExpenses,
    settlementsCount,
    onViewPlan,
}: BalanceStatusCardProps) {
    const { t } = useTranslation();

    // Determine status based on balance
    const isSettled = Math.abs(netBalance) < 0.01;
    const isOwed = netBalance > 0.01;
    const owes = netBalance < -0.01;

    // Status colors and icons
    const getStatusConfig = () => {
        if (isSettled) {
            return {
                color: "text-muted-foreground",
                bgColor: "bg-muted",
                icon: CheckCircle2,
                label: t("all_settled"),
                badgeVariant: "secondary" as const,
            };
        }
        if (isOwed) {
            return {
                color: "text-green-600",
                bgColor: "bg-green-50 dark:bg-green-950",
                icon: ArrowUpRight,
                label: t("owed_to_you"),
                badgeVariant: "default" as const,
            };
        }
        return {
            color: "text-red-600",
            bgColor: "bg-red-50 dark:bg-red-950",
            icon: ArrowDownRight,
            label: t("you_owe"),
            badgeVariant: "destructive" as const,
        };
    };

    const config = getStatusConfig();
    const IconComponent = config.icon;

    return (
        <Card className={config.bgColor}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                        {groupName}
                    </CardTitle>
                    <Badge variant={config.badgeVariant} className="shrink-0">
                        {config.label}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    {t("total_expenses")}: €{totalExpenses.toFixed(2)}
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Net Balance Display */}
                <div className="flex items-center gap-3">
                    <div
                        className={`rounded-full p-3 ${config.bgColor} border-2 border-current ${config.color}`}
                    >
                        <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{t("net_balance")}</p>
                        <p className={`text-3xl font-bold ${config.color}`}>
                            {isSettled ? (
                                "€0.00"
                            ) : (
                                <>
                                    {isOwed ? "+" : ""}€{Math.abs(netBalance).toFixed(2)}
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* Action Button */}
                {!isSettled && settlementsCount > 0 && (
                    <Button
                        onClick={onViewPlan}
                        className="w-full"
                        variant={owes ? "default" : "outline"}
                    >
                        {t("view_settlement_plan")}
                        {settlementsCount > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {settlementsCount}
                            </Badge>
                        )}
                    </Button>
                )}

                {isSettled && (
                    <div className="text-center py-2">
                        <p className="text-sm text-muted-foreground">
                            {t("no_payments_needed")}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
