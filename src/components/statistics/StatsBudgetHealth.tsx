import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";

interface BudgetHealth {
    id: string;
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    limit: number;
    spent: number;
    remaining: number;
    percentage: number;
    isOverBudget: boolean;
}

interface StatsBudgetHealthProps {
    data: BudgetHealth[];
}

export function StatsBudgetHealth({ data }: StatsBudgetHealthProps) {
    const { t } = useTranslation();

    if (!data || data.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("budget_health")}</CardTitle>
                <CardDescription>{t("budget_health_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {data.map((item) => (
                    <div key={item.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: item.categoryColor }}
                                />
                                <span className="font-medium text-sm">{item.categoryName}</span>
                            </div>
                            <div className="text-right">
                                <span className={item.isOverBudget ? "text-destructive font-bold" : "font-medium"}>
                                    €{item.spent.toFixed(2)}
                                </span>
                                <span className="text-muted-foreground text-xs ml-1">
                                    / €{item.limit.toFixed(0)}
                                </span>
                            </div>
                        </div>
                        <Progress
                            value={item.percentage}
                            className={`h-2 ${item.isOverBudget ? "bg-destructive/20" : ""}`}
                        // We can customize the indicator color by overriding css var or using a custom class if needed.
                        // The default Progress component usually uses --primary. 
                        // If we want red for overbudget, we need to handle it.
                        // But usually 100% is fine to show full.
                        // If we want to show red *bar* when overbudget, we might need a custom Progress or inline style.
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{item.percentage}% {t("used")}</span>
                            <span>
                                {item.isOverBudget
                                    ? t("over_budget_by", { amount: Math.abs(item.remaining).toFixed(2) })
                                    : t("remaining", { amount: item.remaining.toFixed(2) })
                                }
                            </span>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
