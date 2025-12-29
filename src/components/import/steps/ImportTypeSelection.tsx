import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileJson, FileSpreadsheet, Building2, Command, Info, Download, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export type ImportType = 'backup' | 'bank_csv';
export type BankType = 'intesa' | 'revolut' | 'generic';

interface ImportTypeSelectionProps {
    step: 'select_type' | 'select_bank';
    onSelectType: (type: ImportType) => void;
    onSelectBank: (bank: BankType) => void;
    onBack: () => void;
    onDownloadCategories: () => void;
}

export function ImportTypeSelection({ step, onSelectType, onSelectBank, onBack, onDownloadCategories }: ImportTypeSelectionProps) {
    const { t } = useTranslation();

    if (step === 'select_type') {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Card
                    className="cursor-pointer hover:border-primary transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                    onClick={() => onSelectType('backup')}
                >
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
                        <FileJson className="h-10 w-10 mb-4 text-blue-500" />
                        <h3 className="font-semibold text-lg mb-1">{t("import.type_backup", "System Backup")}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t("import.type_backup_desc", "Restore from an GoNuts backup or migrate from the old Turtlet app.")}
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className="cursor-pointer hover:border-primary transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 relative group"
                    onClick={() => onSelectType('bank_csv')}
                >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                                e.stopPropagation();
                                toast.info(t("import.bank_supported_info", "Supported: Revolut, Intesa, N26, and any bank with standard CSV export."), {
                                    description: t("import.bank_supported_desc", "Maps Date, Amount, and Description columns manually.")
                                });
                            }}
                        >
                            <Info className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
                        <FileSpreadsheet className="h-10 w-10 mb-4 text-green-500" />
                        <h3 className="font-semibold text-lg mb-1">{t("import.type_bank", "Bank Export")}</h3>
                        <p className="text-sm text-muted-foreground">
                            {t("import.type_bank_desc", "Import transactions from CSV/Excel files (Revolut, Intesa, etc).")}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4">
                <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 p-0 h-auto hover:bg-transparent text-muted-foreground">
                    <ArrowLeft className="h-4 w-4" /> {t("common.back", "Back")}
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
                <Card
                    className="cursor-pointer hover:border-primary transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                    onClick={() => onSelectBank('intesa')}
                >
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
                        <Building2 className="h-8 w-8 mb-3 text-orange-600" />
                        <h3 className="font-semibold text-md mb-1">{t("bank_intesa")}</h3>
                        <p className="text-xs text-muted-foreground">{t("format_excel")}</p>
                    </CardContent>
                </Card>

                <Card
                    className="cursor-pointer hover:border-primary transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                    onClick={() => onSelectBank('revolut')}
                >
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
                        <Building2 className="h-8 w-8 mb-3 text-blue-500" />
                        <h3 className="font-semibold text-md mb-1">{t("bank_revolut")}</h3>
                        <p className="text-xs text-muted-foreground">{t("format_csv_export")}</p>
                    </CardContent>
                </Card>

                <Card
                    className="cursor-pointer hover:border-primary transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                    onClick={() => onSelectBank('generic')}
                >
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
                        <Command className="h-8 w-8 mb-3 text-slate-500" />
                        <h3 className="font-semibold text-md mb-1">{t("bank_generic_csv")}</h3>
                        <p className="text-xs text-muted-foreground">{t("format_custom_mapping")}</p>
                    </CardContent>
                </Card>
            </div>
            <div className="flex justify-center">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onDownloadCategories}
                    className="text-xs gap-2"
                >
                    <Download className="h-3.5 w-3.5" />
                    {t("download_category_list")}
                </Button>
            </div>
        </div>
    );
}
