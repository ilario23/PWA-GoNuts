import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { db, SyncConflict } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/** Build a one-line human summary of the dropped remote row. */
function summarize(conflict: SyncConflict): string {
  try {
    const d = JSON.parse(conflict.remoteData) as Record<string, unknown>;
    const label = (d.description ?? d.name) as string | undefined;
    const parts = [label, d.amount != null ? String(d.amount) : undefined].filter(
      Boolean
    ) as string[];
    if (parts.length) return parts.join(" · ");
  } catch {
    // fall through to the table name
  }
  return conflict.table;
}

/**
 * Lists edit conflicts captured by the sync engine — remote changes that
 * last-write-wins dropped because the local row had unsynced edits. Renders
 * nothing when there are none. Dismissing marks a conflict resolved.
 */
export function SyncConflictsCard() {
  const { t } = useTranslation();
  const conflicts = useLiveQuery(
    () => db.sync_conflicts.filter((c) => !c.resolvedAt).toArray(),
    []
  );

  if (!conflicts || conflicts.length === 0) return null;

  const dismiss = (key: string) =>
    db.sync_conflicts.update(key, { resolvedAt: new Date().toISOString() });

  const dismissAll = () =>
    Promise.all(
      conflicts.map((c) =>
        db.sync_conflicts.update(c.key, { resolvedAt: new Date().toISOString() })
      )
    );

  return (
    <Card className="border-amber-500/40">
      <CardContent className="p-0">
        <Drawer>
          <DrawerTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
            >
              <span className="rounded-[10px] p-2 shrink-0 bg-amber-500 text-white">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t("sync_conflicts", "Sync conflicts")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("sync_conflicts_desc", "Edits from elsewhere that your version replaced")}
                </p>
              </div>
              <span className="rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs font-semibold px-2 py-0.5 shrink-0">
                {conflicts.length}
              </span>
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t("sync_conflicts", "Sync conflicts")}</DrawerTitle>
              <DrawerDescription className="text-left">
                {t(
                  "sync_conflicts_review_desc",
                  "These remote changes were dropped because you had unsynced edits to the same item. Your version was kept."
                )}
              </DrawerDescription>
            </DrawerHeader>
            <ScrollArea className="max-h-[50vh] px-4">
              <ul className="space-y-2 pb-2">
                {conflicts.map((c) => (
                  <li key={c.key} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {c.table}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => dismiss(c.key)}
                      >
                        {t("dismiss", "Dismiss")}
                      </Button>
                    </div>
                    <p className="text-sm mt-1 truncate">{summarize(c)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t("dropped_remote", "Dropped remote version")} ·{" "}
                      {new Date(c.detectedAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
            <DrawerFooter>
              <Button variant="outline" onClick={dismissAll}>
                {t("dismiss_all", "Dismiss all")}
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost">{t("close", "Close")}</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </CardContent>
    </Card>
  );
}
