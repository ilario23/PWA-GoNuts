import { useTranslation } from "react-i18next";
import { ParsedData } from "../../../lib/import/types";
import { ImportProcessor } from "../../../lib/import/ImportProcessor";
import { AlertTriangle, Turtle, Palette } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";


interface ImportPreviewProps {
    parsedData: ParsedData;
    regenerateColors?: boolean;
    onRegenerateColorsChange?: (value: boolean) => void;
}

// NOTE: We need useAuth here to initialize ImportProcessor for group analysis
// Or we can pass it down. Let's use internal logic if it's purely utility.
// ImportProcessor needs userId constructor.
export function ImportPreview({ parsedData, regenerateColors, onRegenerateColorsChange }: ImportPreviewProps) {
    const { t } = useTranslation();
    const { user } = useAuth();

    return (
        <div className="space-y-4">
            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-3">{t("import.found_data", "Found Data")}</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded border">
                        <span className="text-2xl font-bold block">{parsedData.transactions.length}</span>
                        <span className="text-xs text-muted-foreground">{t("transactions", "Transactions")}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-3 rounded border">
                        <span className="text-2xl font-bold block">{parsedData.categories?.length || 0}</span>
                        <span className="text-xs text-muted-foreground">{t("categories", "Categories")}</span>
                    </div>
                    {parsedData.recurring && parsedData.recurring.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded border">
                            <span className="text-2xl font-bold block">{parsedData.recurring.length}</span>
                            <span className="text-xs text-muted-foreground">{t("recurring_transactions", "Recurring")}</span>
                        </div>
                    )}
                    <div className="bg-white dark:bg-slate-800 p-3 rounded border">
                        <span className="text-2xl font-bold block capitalize flex items-center gap-2">
                            {parsedData.source === 'legacy_vue' ? <><Turtle className="w-6 h-6 text-green-500" /> {t("import.turtlet_app", "Turtlet App")}</> :
                                parsedData.source === 'antigravity_backup' ? 'GoNuts' :
                                    parsedData.source === 'intesa_sanpaolo' ? 'Intesa Sanpaolo' :
                                        parsedData.source === 'revolut' ? 'Revolut' : 'CSV Export'}
                        </span>
                        <span className="text-xs text-muted-foreground">{t("import.source", "Source")}</span>
                    </div>
                </div>
            </div>

            {parsedData.source === 'legacy_vue' && (
                <>
                    <div className="text-sm p-3 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-900">
                        <p><strong>{t("import.migration_mode", "Migration Mode")}:</strong> {t("import.migration_mode_desc", "We will automatically migrate your categories to the new structure.")}</p>
                    </div>

                    {/* Regenerate Colors Option */}
                    {onRegenerateColorsChange && (
                        <div className="flex items-center justify-between gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-100 dark:border-purple-900">
                            <div className="flex-1">
                                <Label htmlFor="regenerate-colors" className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium cursor-pointer">
                                    <Palette className="w-4 h-4" />
                                    {t("import.regenerate_colors", "Regenerate colors with modern palette")}
                                </Label>
                                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                    {t("import.regenerate_colors_desc", "Assign vibrant, semantically-colored palette to categories based on type (expenses=warm, income=green, investments=blue)")}
                                </p>
                            </div>
                            <Switch
                                id="regenerate-colors"
                                checked={regenerateColors}
                                onCheckedChange={onRegenerateColorsChange}
                            />
                        </div>
                    )}

                </>
            )}


            {['generic_csv', 'intesa_sanpaolo', 'revolut'].includes(parsedData.source) && (
                <div className="text-sm p-3 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-900">
                    <p><strong>{t("import.csv_note", "Note")}:</strong> {t("import.csv_note_desc", "Transactions will be set to 'Uncategorized' initially. Use the rules engine in the next step to categorize them.")}</p>
                </div>
            )}

            {/* Group Data Warning */}
            {(() => {
                if (user && parsedData) {
                    const processor = new ImportProcessor(user.id);
                    const groupAnalysis = processor.analyzeGroupData(parsedData);

                    if (groupAnalysis.hasGroups) {
                        return (
                            <div className="text-sm p-3 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 rounded border border-yellow-100 dark:border-yellow-900 flex gap-2">
                                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">{t("import.group_warning_title", "Group Data Detected")}</p>
                                    <p>{t("import.group_warning_desc", "This file contains transactions associated with a group. Please note that group associations will be removed and these transactions will be imported as personal expenses.")}</p>
                                    <p className="mt-1 text-xs opacity-90">{t("import.group_warning_count", "Affected transactions: {{count}}", { count: groupAnalysis.groupTransactionCount })}</p>
                                </div>
                            </div>
                        )
                    }
                }
                return null;
            })()}

            {/* Data Integrity Issues Warning */}
            {parsedData.dataIntegrityIssues && (
                <div className="text-sm p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded border border-red-100 dark:border-red-900 flex gap-2">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
                    <div className="flex-1">
                        <p className="font-semibold">{t("import.data_integrity_warning_title", "Data Integrity Issues Detected")}</p>
                        <p className="mb-2">{t("import.data_integrity_warning_desc", "Some items reference categories that don't exist in this file. They will be set to 'Uncategorized'.")}</p>

                        {parsedData.dataIntegrityIssues.orphanedTransactionCategories.length > 0 && (
                            <div className="mb-2">
                                <p className="font-medium text-xs uppercase tracking-wider">{t("import.orphaned_transactions", "Transactions with missing categories")}:</p>
                                <ul className="list-disc list-inside text-xs mt-1 max-h-24 overflow-y-auto">
                                    {parsedData.dataIntegrityIssues.orphanedTransactionCategories.slice(0, 5).map((item, idx) => (
                                        <li key={idx}>"{item.description}" → <code className="bg-red-100 dark:bg-red-900/50 px-1 rounded text-[10px]">{item.categoryId.substring(0, 8)}...</code></li>
                                    ))}
                                    {parsedData.dataIntegrityIssues.orphanedTransactionCategories.length > 5 && (
                                        <li className="opacity-70">...{t("common.and_more", "and {{count}} more", { count: parsedData.dataIntegrityIssues.orphanedTransactionCategories.length - 5 })}</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        {parsedData.dataIntegrityIssues.orphanedRecurringCategories.length > 0 && (
                            <div>
                                <p className="font-medium text-xs uppercase tracking-wider">{t("import.orphaned_recurring", "Recurring expenses with missing categories")}:</p>
                                <ul className="list-disc list-inside text-xs mt-1 max-h-24 overflow-y-auto">
                                    {parsedData.dataIntegrityIssues.orphanedRecurringCategories.map((item, idx) => (
                                        <li key={idx}>"{item.description}" → <code className="bg-red-100 dark:bg-red-900/50 px-1 rounded text-[10px]">{item.categoryId.substring(0, 8)}...</code></li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

