import {
  Lightbulb,
  PieChart,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertTriangle,
  Repeat,
  CalendarDays,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Insight, InsightType } from "@/lib/insightUtils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PieChart,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertTriangle,
  Repeat,
  CalendarDays,
  Lightbulb,
};

const TYPE_STYLES: Record<InsightType, string> = {
  positive: "bg-gonuts-good/10 text-gonuts-good",
  warning: "bg-gonuts-bad/10 text-gonuts-bad",
  neutral: "bg-muted text-foreground",
  tip: "bg-chart-3/10 text-chart-3",
};

interface StatsInsightsCardProps {
  insights: Insight[];
  isLoading?: boolean;
}

export function StatsInsightsCard({ insights, isLoading }: StatsInsightsCardProps) {
  const { t } = useTranslation();

  if (isLoading) return null;
  if (!insights || insights.length === 0) return null;

  const sorted = [...insights].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return (
    <Card className="min-w-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-chart-5" />
          {t("insights.section_title")}
        </CardTitle>
        <CardDescription>{t("category_comparison_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sorted.map((insight) => {
            const Icon = ICONS[insight.icon] ?? Lightbulb;
            return (
              <div
                key={insight.id}
                className={cn(
                  "flex items-start gap-3 rounded-[14px] px-3 py-2.5",
                  TYPE_STYLES[insight.type] ?? TYPE_STYLES.neutral
                )}
              >
                <div className="mt-0.5 shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t(insight.title)}</div>
                  {insight.message && (
                    <div className="text-xs opacity-80 mt-0.5">
                      {t(insight.message, insight.messageParams)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
