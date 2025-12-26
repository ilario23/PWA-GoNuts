import { useState } from "react";
import { PotentialMerge, RecurringConflict } from "../../lib/import/types";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { ArrowRight, Check, Merge, X, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface ImportConflictResolverProps {
    conflicts: PotentialMerge[];
    recurringConflicts: RecurringConflict[];
    onResolve: (mergedCategoryIds: Map<string, string>, skippedRecurringIds: Set<string>) => void;
    onCancel: () => void;
}

export function ImportConflictResolver({
    conflicts,
    recurringConflicts,
    onResolve,
    onCancel,
}: ImportConflictResolverProps) {
    const { t } = useTranslation();

    // CATEGORIES: Checked = Merge (Map Import ID -> Existing ID)
    const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(
        new Set(conflicts.map((c) => c.imported.id))
    );

    // RECURRING: Checked = Skip (Don't import)
    const [selectedForSkip, setSelectedForSkip] = useState<Set<string>>(
        new Set(recurringConflicts.map((c) => c.imported.id))
    );

    const toggleMerge = (importedId: string) => {
        const newSet = new Set(selectedForMerge);
        if (newSet.has(importedId)) newSet.delete(importedId);
        else newSet.add(importedId);
        setSelectedForMerge(newSet);
    };

    const toggleSkip = (importedId: string) => {
        const newSet = new Set(selectedForSkip);
        if (newSet.has(importedId)) newSet.delete(importedId);
        else newSet.add(importedId);
        setSelectedForSkip(newSet);
    };

    const handleConfirm = () => {
        // Prepare Category Merge Map
        const mergeMap = new Map<string, string>();
        conflicts.forEach(conflict => {
            if (selectedForMerge.has(conflict.imported.id)) {
                mergeMap.set(conflict.imported.id, conflict.existing.id);
            }
        });

        // Prepare Recurring Skip Set
        // Logic: active set IS the set of IDs to skip
        const skippedIds = new Set(selectedForSkip);

        onResolve(mergeMap, skippedIds);
    };

    return (
        <Card className="w-full max-w-4xl mx-auto h-[80vh] flex flex-col">
            <CardHeader>
                <CardTitle>{t("import.resolve_conflicts_title", "Resolve Import Conflicts")}</CardTitle>
                <CardDescription>
                    {t("import.resolve_conflicts_desc", "We found existing data that matches your import.")}
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                <Tabs defaultValue={conflicts.length > 0 ? "categories" : "recurring"} className="flex-1 flex flex-col">
                    <div className="px-6">
                        <TabsList className="grid w-full grid-cols-2 dark:bg-primary/20">
                            <TabsTrigger value="categories" disabled={conflicts.length === 0}>
                                {t("import.tab_categories", "Categories")} ({conflicts.length})
                            </TabsTrigger>
                            <TabsTrigger value="recurring" disabled={recurringConflicts.length === 0}>
                                {t("import.tab_recurring", "Recurring Expenses")} ({recurringConflicts.length})
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="categories" className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full px-6">
                            <div className="space-y-4 py-4">
                                {conflicts.map((conflict) => {
                                    const isMerged = selectedForMerge.has(conflict.imported.id);
                                    return (
                                        <div key={conflict.imported.id} className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${isMerged ? "bg-primary/5 border-primary/20" : "bg-card border-border"} `}>
                                            <div className="flex-1 grid grid-cols-[1fr,auto,1fr] items-center gap-4">
                                                <div className="flex flex-col items-end text-right">
                                                    <span className="font-medium truncate max-w-[150px]">{conflict.imported.name}</span>
                                                    <Badge variant="outline" className="mt-1 text-xs text-muted-foreground w-fit">{t("import.badge_incoming", "Incoming")}</Badge>
                                                </div>
                                                <div className="flex flex-col items-center px-4">
                                                    {isMerged ? <Merge className="h-6 w-6 text-primary" /> : <ArrowRight className="h-6 w-6 text-muted-foreground opacity-20" />}
                                                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                                                        {t("import.match_accuracy", { percent: Math.round((1 - conflict.score / Math.max(conflict.imported.name.length, conflict.existing.name.length || 1)) * 100) })}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <span className="font-medium flex items-center gap-2 truncate max-w-[150px]">
                                                        {conflict.existing.name}
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: conflict.existing.color }} />
                                                    </span>
                                                    <Badge variant="outline" className="mt-1 text-xs text-muted-foreground w-fit">Existing</Badge>
                                                </div>
                                            </div>
                                            <div className="ml-6 pl-6 border-l flex flex-col gap-2 items-center min-w-[120px]">
                                                <Button variant={isMerged ? "default" : "outline"} size="sm" className="w-full" onClick={() => toggleMerge(conflict.imported.id)}>
                                                    {isMerged ? <><Check className="w-4 h-4 mr-1" /> {t("import.action_merge", "Merge")}</> : <><X className="w-4 h-4 mr-1" /> {t("import.action_keep_both", "Keep Both")}</>}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="recurring" className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full px-6">
                            <div className="space-y-4 py-4">
                                {recurringConflicts.length === 0 && <div className="text-center p-8 text-muted-foreground">{t("import.status_no_recurring_conflicts", "No recurring conflicts found.")}</div>}
                                {recurringConflicts.map((conflict) => {
                                    const isSkipped = selectedForSkip.has(conflict.imported.id);
                                    return (
                                        <div key={conflict.imported.id} className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${isSkipped ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800" : "bg-card border-border"} `}>
                                            <div className="flex-1 grid grid-cols-[1fr,auto,1fr] items-center gap-4">
                                                <div className="flex flex-col items-end text-right">
                                                    <span className="font-medium truncate max-w-[200px]">{conflict.imported.name}</span>
                                                    <span className="text-sm font-mono">{conflict.imported.amount}€</span>
                                                    <Badge variant="outline" className="mt-1 text-xs text-muted-foreground w-fit">{t("import.badge_incoming", "Incoming")}</Badge>
                                                </div>
                                                <div className="flex flex-col items-center px-4">
                                                    <RefreshCcw className="h-6 w-6 text-muted-foreground opacity-50" />
                                                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">{t("import.status_duplicate_question", "Duplicate?")}</div>
                                                </div>
                                                <div className="flex flex-col items-start">
                                                    <span className="font-medium flex items-center gap-2 truncate max-w-[200px]">
                                                        {conflict.existing.name}
                                                    </span>
                                                    <span className="text-sm font-mono text-muted-foreground">{conflict.imported.amount}€</span>
                                                    <Badge variant="outline" className="mt-1 text-xs text-muted-foreground w-fit">{t("import.badge_existing", "Existing")}</Badge>
                                                </div>
                                            </div>
                                            <div className="ml-6 pl-6 border-l flex flex-col gap-2 items-center min-w-[140px]">
                                                {isSkipped ? (
                                                    <div className="text-center">
                                                        <Button variant="secondary" size="sm" className="w-full bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/50 dark:text-orange-300" onClick={() => toggleSkip(conflict.imported.id)}>
                                                            <X className="w-4 h-4 mr-1" /> {t("import.action_skipped", "Skipped")}
                                                        </Button>
                                                        <p className="text-[10px] text-muted-foreground mt-1">{t("import.status_will_not_import", "Will not be imported")}</p>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <Button variant="outline" size="sm" className="w-full" onClick={() => toggleSkip(conflict.imported.id)}>
                                                            <Check className="w-4 h-4 mr-1" /> {t("import.action_import_new", "Import New")}
                                                        </Button>
                                                        <p className="text-[10px] text-muted-foreground mt-1">{t("import.status_will_create_duplicate", "Will create duplicate")}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>

            <div className="p-6 border-t bg-muted/20 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    {t("import.items_resolved", { count: selectedForMerge.size + selectedForSkip.size })}
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onCancel}>
                        {t("cancel", "Cancel")}
                    </Button>
                    <Button onClick={handleConfirm}>
                        {t("import.confirm_continue", "Confirm & Continue")}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
