import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCategoryBudgets } from "@/hooks/useCategoryBudgets";
import { useCategories } from "@/hooks/useCategories";
import { getIconComponent } from "@/lib/icons";
import { createElement } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export function BudgetHealthChart() {
    const { t } = useTranslation();
    const { budgetsWithSpent } = useCategoryBudgets();
    const { categories } = useCategories();

    const budgetData = useMemo(() => {
        if (!budgetsWithSpent || !categories) return [];

        return budgetsWithSpent
            .map(b => {
                const category = categories.find(c => c.id === b.category_id);
                return {
                    ...b,
                    categoryName: category?.name || t("unknown_category"),
                    categoryColor: category?.color || "#888",
                    categoryIcon: category?.icon
                };
            })
            .sort((a, b) => b.percentage - a.percentage); // Sort by highest percentage spent
    }, [budgetsWithSpent, categories, t]);

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return "bg-red-500";
        if (percentage >= 80) return "bg-amber-500";
        return "bg-green-500";
    };

    const getStatusIcon = (percentage: number) => {
        if (percentage >= 100) return <AlertTriangle className="h-4 w-4 text-red-500" />;
        if (percentage >= 80) return <AlertTriangle className="h-4 w-4 text-amber-500" />;
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    };



    if (budgetData.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("budget_health")}</CardTitle>
                <CardDescription>{t("budget_health_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {budgetData.map((item) => {
                    const IconComp = item.categoryIcon ? getIconComponent(item.categoryIcon) : null;

                    return (
                        <motion.div
                            key={item.category_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-2"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                                        style={{
                                            backgroundColor: item.categoryColor ? `${item.categoryColor}20` : "#f3f4f6",
                                            color: item.categoryColor || "#6b7280"
                                        }}
                                    >
                                        {IconComp ? (
                                            createElement(IconComp, { className: "h-4 w-4" })
                                        ) : (
                                            <div className="h-4 w-4 rounded-full bg-muted" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium leading-none">{item.categoryName}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {item.spent.toFixed(0)}€ / {item.amount.toFixed(0)}€
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${item.percentage >= 100 ? "text-red-500" : ""}`}>
                                        {item.percentage.toFixed(0)}%
                                    </span>
                                    {getStatusIcon(item.percentage)}
                                </div>
                            </div>
                            <Progress
                                value={Math.min(item.percentage, 100)}
                                className="h-2"
                                indicatorClassName={getProgressColor(item.percentage)}
                            />
                        </motion.div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
