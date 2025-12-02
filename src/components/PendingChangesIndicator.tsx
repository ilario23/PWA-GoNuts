import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CloudOff, Loader2 } from "lucide-react";
import { useSync } from "@/hooks/useSync";
import { cn } from "@/lib/utils";

/**
 * Indicatore che mostra quante modifiche sono pending e non ancora sincronizzate.
 * Visibile solo quando ci sono modifiche pending o quando è in corso un sync.
 */
export function PendingChangesIndicator() {
    const { pendingCount, isSyncing, sync } = useSync();

    // Non mostrare nulla se non ci sono pending e non sta sincronizzando
    if (pendingCount === 0 && !isSyncing) {
        return null;
    }

    return (
        <Button
            onClick={() => sync()}
            disabled={isSyncing}
            variant="ghost"
            size="sm"
            className={cn(
                "gap-2",
                pendingCount > 0 && "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950"
            )}
        >
            {isSyncing ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Sincronizzazione...</span>
                </>
            ) : (
                <>
                    <CloudOff className="h-4 w-4" />
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100">
                        {pendingCount}
                    </Badge>
                    <span className="hidden sm:inline">da sincronizzare</span>
                </>
            )}
        </Button>
    );
}
