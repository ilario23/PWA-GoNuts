import { useTranslation } from "react-i18next";
import { ParsedData } from "../../../lib/import/types";
import { ImportProcessor } from "../../../lib/import/ImportProcessor";
import { AlertTriangle, Turtle } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";

interface ImportPreviewProps {
    parsedData: ParsedData;
}

// NOTE: We need useAuth here to initialize ImportProcessor for group analysis
// Or we can pass it down. Let's use internal logic if it's purely utility.
// ImportProcessor needs userId constructor.
export function ImportPreview({ parsedData }: ImportPreviewProps) {
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
                <div className="text-sm p-3 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-900">
                    <p><strong>{t("import.migration_mode", "Migration Mode")}:</strong> {t("import.migration_mode_desc", "We will automatically migrate your categories to the new structure.")}</p>
                </div>
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
        </div>
    );
}
