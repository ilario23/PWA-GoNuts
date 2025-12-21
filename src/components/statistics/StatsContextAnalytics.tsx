import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface ContextStat {
    id: string;
    name: string;
    total: number;
    transactionCount: number;
    avgPerTransaction: number;
    topCategory: string | null;
    categoryBreakdown: Array<{
        name: string;
        amount: number;
        percentage: number;
    }>;
}

interface StatsContextAnalyticsProps {
    contextStats: ContextStat[];
}

export function StatsContextAnalytics({
    contextStats,
}: StatsContextAnalyticsProps) {
    const { t } = useTranslation();

    if (contextStats.length === 0) return null;

    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle>{t("context_analytics")}</CardTitle>
                <CardDescription>{t("context_analytics_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {contextStats.map((ctx, index) => (
                    <div key={ctx.id} className="border rounded-lg p-4 space-y-3">
                        {/* Context header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                        backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))`,
                                    }}
                                />
                                <span className="font-semibold">{ctx.name}</span>
                            </div>
                            <span className="text-lg font-bold">€{Number(ctx.total).toFixed(2)}</span>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="text-center p-2 bg-muted rounded">
                                <div className="text-muted-foreground text-xs">
                                    {t("transactions")}
                                </div>
                                <div className="font-medium">{ctx.transactionCount}</div>
                            </div>
                            <div className="text-center p-2 bg-muted rounded">
                                <div className="text-muted-foreground text-xs">
                                    {t("average")}
                                </div>
                                <div className="font-medium">€{Number(ctx.avgPerTransaction).toFixed(2)}</div>
                            </div>
                            <div className="text-center p-2 bg-muted rounded">
                                <div className="text-muted-foreground text-xs">
                                    {t("top_category")}
                                </div>
                                <div className="font-medium truncate">
                                    {ctx.topCategory || "-"}
                                </div>
                            </div>
                        </div>

                        {/* Category breakdown - top 3 */}
                        {ctx.categoryBreakdown.length > 1 && (
                            <div className="space-y-1 pt-2 border-t">
                                <div className="text-xs text-muted-foreground mb-2">
                                    {t("breakdown_by_category")}
                                </div>
                                {ctx.categoryBreakdown.slice(0, 3).map((cat) => (
                                    <div
                                        key={cat.name}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <span className="text-muted-foreground truncate max-w-[50%]">
                                            {cat.name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 bg-muted rounded overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded"
                                                    style={{ width: `${cat.percentage}%` }}
                                                />
                                            </div>
                                            <span className="font-medium w-16 text-right">
                                                €{Number(cat.amount).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
