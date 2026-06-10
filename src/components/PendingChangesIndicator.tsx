import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { AlertTriangle, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useSync } from "@/hooks/useSync";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

/**
 * Indicatore che mostra quante modifiche sono pending e non ancora sincronizzate,
 * più gli eventuali errori di sync persistenti (con dettaglio e retry).
 * Visibile solo quando ci sono modifiche pending, errori o un sync in corso.
 */
export function PendingChangesIndicator() {
    const { pendingCount, isSyncing, sync, errors, errorCount, retryAllErrors } =
        useSync();
    const { t } = useTranslation();

    // Non mostrare nulla se non ci sono pending/errori e non sta sincronizzando
    if (pendingCount === 0 && errorCount === 0 && !isSyncing) {
        return null;
    }

    return (
        <div className="flex items-center gap-1">
            {(pendingCount > 0 || isSyncing) && (
                <Button
                    onClick={() => sync()}
                    disabled={isSyncing}
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "gap-2",
                        pendingCount > 0 &&
                        "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
                    )}
                >
                    {isSyncing ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="hidden sm:inline">{t("syncing")}</span>
                        </>
                    ) : (
                        <>
                            <CloudOff className="h-4 w-4" />
                            <Badge
                                variant="secondary"
                                className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100"
                            >
                                {pendingCount}
                            </Badge>
                            <span className="hidden sm:inline">{t("to_sync")}</span>
                        </>
                    )}
                </Button>
            )}

            {errorCount > 0 && !isSyncing && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-destructive hover:bg-destructive/10"
                            aria-label={t("sync_errors_title", {
                                defaultValue: "Sync errors",
                            })}
                        >
                            <AlertTriangle className="h-4 w-4" />
                            <Badge variant="destructive">{errorCount}</Badge>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80">
                        <div className="space-y-3">
                            <p className="text-sm font-medium">
                                {t("sync_errors_title", { defaultValue: "Sync errors" })}
                            </p>
                            <ul className="max-h-48 space-y-2 overflow-y-auto text-xs text-muted-foreground">
                                {errors.map((error) => (
                                    <li key={`${error.table}:${error.id}:${error.operation}`}>
                                        <span className="font-medium text-foreground">
                                            {error.table}
                                        </span>{" "}
                                        — {error.error}
                                        {error.isQuarantined && (
                                            <span className="ml-1 text-destructive">
                                                (
                                                {t("sync_error_quarantined", {
                                                    defaultValue: "needs attention",
                                                })}
                                                )
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full gap-2"
                                onClick={() => retryAllErrors()}
                            >
                                <RefreshCw className="h-4 w-4" />
                                {t("sync_errors_retry_all", {
                                    defaultValue: "Retry all",
                                })}
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}
