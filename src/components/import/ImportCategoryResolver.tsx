import React, { useState } from "react";
import { PotentialMerge } from "@/lib/import/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLast, Check, Merge, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

interface ImportCategoryResolverProps {
    conflicts: PotentialMerge[];
    onResolve: (mergedCategoryIds: Map<string, string>) => void;
    onCancel: () => void;
}

export function ImportCategoryResolver({
    conflicts,
    onResolve,
    onCancel,
}: ImportCategoryResolverProps) {
    const { t } = useTranslation();

    // State: Set of Import IDs that should be MERGED. 
    // By default, we select ALL conflicts for merging (assuming the fuzzy match is helpful).
    const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(
        new Set(conflicts.map((c) => c.imported.id))
    );

    const toggleMerge = (importedId: string) => {
        const newSet = new Set(selectedForMerge);
        if (newSet.has(importedId)) {
            newSet.delete(importedId);
        } else {
            newSet.add(importedId);
        }
        setSelectedForMerge(newSet);
    };

    const handleConfirm = () => {
        const mergeMap = new Map<string, string>();

        conflicts.forEach(conflict => {
            if (selectedForMerge.has(conflict.imported.id)) {
                mergeMap.set(conflict.imported.id, conflict.existing.id);
            }
        });

        onResolve(mergeMap);
    };

    return (
        <Card className="w-full max-w-4xl mx-auto h-[80vh] flex flex-col">
            <CardHeader>
                <CardTitle>{t("import.resolve_conflicts_title", "Resolve Category Conflicts")}</CardTitle>
                <CardDescription>
                    {t(
                        "import.resolve_conflicts_desc",
                        "We found similar categories in your existing data. Select which ones you want to merge to avoid duplicates."
                    )}
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full px-6">
                    <div className="space-y-4 py-4">
                        {conflicts.map((conflict) => {
                            const isMerged = selectedForMerge.has(conflict.imported.id);

                            return (
                                <div
                                    key={conflict.imported.id}
                                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${isMerged ? "bg-primary/5 border-primary/20" : "bg-card border-border"
                                        }`}
                                >
                                    <div className="flex-1 grid grid-cols-[1fr,auto,1fr] items-center gap-4">
                                        {/* Imported (New) */}
                                        <div className="flex flex-col items-end text-right">
                                            <span className="font-medium">{conflict.imported.name}</span>
                                            <Badge variant="outline" className="mt-1 text-xs text-muted-foreground w-fit">
                                                {t("import.incoming", "Incoming")}
                                            </Badge>
                                        </div>

                                        {/* Action Icon */}
                                        <div className="flex flex-col items-center px-4">
                                            {isMerged ? (
                                                <Merge className="h-6 w-6 text-primary" />
                                            ) : (
                                                <ArrowLast className="h-6 w-6 text-muted-foreground opacity-20 rotate-180" />
                                            )}
                                            <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                                                {Math.round((1 - conflict.score / Math.max(conflict.imported.name.length, conflict.existing.name.length)) * 100)}% Match
                                            </div>
                                        </div>

                                        {/* Existing (Target) */}
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium flex items-center gap-2">
                                                {conflict.existing.name}
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: conflict.existing.color }}
                                                />
                                            </span>
                                            <Badge variant="outline" className="mt-1 text-xs text-muted-foreground w-fit">
                                                {t("import.existing", "Existing")}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Toggle */}
                                    <div className="ml-6 pl-6 border-l flex flex-col gap-2 items-center min-w-[100px]">
                                        <Button
                                            variant={isMerged ? "default" : "outline"}
                                            size="sm"
                                            className="w-full"
                                            onClick={() => toggleMerge(conflict.imported.id)}
                                        >
                                            {isMerged ? (
                                                <>
                                                    <Check className="w-4 h-4 mr-1" />
                                                    {t("import.merge", "Merge")}
                                                </>
                                            ) : (
                                                <>
                                                    <X className="w-4 h-4 mr-1" />
                                                    {t("import.keep_both", "Keep New")}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>

            <div className="p-6 border-t bg-muted/20 flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    {selectedForMerge.size} {t("import.merges_selected", "merges selected")}
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={onCancel}>
                        {t("cancel", "Cancel")}
                    </Button>
                    <Button onClick={handleConfirm}>
                        {t("confirm_continue", "Confirm & Continue")}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
