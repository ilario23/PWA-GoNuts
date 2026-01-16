import { useTranslation } from "react-i18next";
import { Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { changelogData, ChangeType } from "@/data/changelog";
import { cn } from "@/lib/utils";

export function ChangelogPage() {
    const { t } = useTranslation();

    const getTypeColor = (type: ChangeType) => {
        switch (type) {
            case "feat":
                return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
            case "fix":
                return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
            case "chore":
                return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
            case "refactor":
                return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
            default:
                return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
        }
    };

    const getTypeLabel = (type: ChangeType) => {
        switch (type) {
            case "feat":
                return "Feature";
            case "fix":
                return "Fix";
            case "chore":
                return "Chore";
            case "refactor":
                return "Refactor";
            default:
                return type;
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">{t("changelog")}</h2>
                <p className="text-sm text-muted-foreground">{t("changelog_desc")}</p>
            </div>

            <div className="mx-auto max-w-3xl space-y-8 py-4">
                {changelogData.map((release, index) => (
                    <div key={release.version} className="relative pl-8 before:absolute before:left-[11px] before:top-[28px] before:h-full before:w-[2px] before:bg-border last:before:hidden">
                        <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border bg-background ring-4 ring-background">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold tracking-tight">v{release.version}</h2>
                                    {index === 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                            {t("latest")}
                                        </Badge>
                                    )}
                                </div>
                                <time className="text-sm text-muted-foreground">
                                    {new Date(release.date).toLocaleDateString(undefined, {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </time>
                            </div>

                            <Card>
                                <CardContent className="p-0">
                                    <ul className="divide-y">
                                        {release.changes.map((change, i) => (
                                            <li key={i} className="flex gap-4 p-4 hover:bg-muted/50 transition-colors">
                                                <div className={cn("mt-1 flex h-6 w-min shrink-0 items-center justify-center rounded-full border px-2 text-[10px] font-medium uppercase tracking-wider", getTypeColor(change.type))}>
                                                    {getTypeLabel(change.type)}
                                                </div>
                                                <div className="text-sm leading-relaxed text-foreground/90">
                                                    {t(change.description)}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
