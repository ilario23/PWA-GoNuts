import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Loader2, AlertTriangle, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ImportType, BankType } from "./ImportTypeSelection";
import { useRef } from "react";

interface ImportUploadStepProps {
    importType: ImportType | null;
    selectedBank: BankType | null;
    isProcessing: boolean;
    error: string | null;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDownloadTemplate: () => void;
}

export function ImportUploadStep({ importType, selectedBank, isProcessing, error, onFileSelect, onDownloadTemplate }: ImportUploadStepProps) {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-slate-50 dark:bg-slate-950 relative">
            {/* Template Download Button for Generic CSV */}
            {importType === 'bank_csv' && selectedBank === 'generic' && !isProcessing && (
                <div className="absolute top-4 right-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onDownloadTemplate}
                        className="text-xs flex items-center gap-2 h-8"
                        title={t("import.template_download", "Download a CSV template")}
                    >
                        <Download className="h-3.5 w-3.5" />
                        {t("import.template_download", "Template")}
                    </Button>
                </div>
            )}

            {isProcessing ? (
                <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">{t("import.analyzing_file", "Analyzing file...")}</p>
                </div>
            ) : (
                <>
                    {importType === 'bank_csv' ? (
                        <FileSpreadsheet className="h-10 w-10 mb-4 text-muted-foreground" />
                    ) : (
                        <Upload className="h-10 w-10 mb-4 text-muted-foreground" />
                    )}
                    <p className="text-sm text-muted-foreground mb-4 text-center">
                        {importType === 'bank_csv'
                            ? selectedBank === 'intesa' ? "Select your Intesa Sanpaolo .xlsx file" : t("import.select_csv_bank", "Select a .csv file from your bank.")
                            : t("import.select_json_backup", "Select a .json file to restore your backup.")}
                    </p>
                    <Button onClick={() => fileInputRef.current?.click()}>
                        {t("import.choose_file", "Choose File")}
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept={selectedBank === 'intesa' ? ".xlsx" : importType === 'bank_csv' ? ".csv" : ".json"}
                        onChange={onFileSelect}
                        onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ''; }} // Reset to allow re-selection of same file
                    />
                    {error && (
                        <div className="mt-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-sm flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            {error}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
