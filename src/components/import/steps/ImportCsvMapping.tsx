import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { CsvMapping } from "../../../lib/import/types";

interface ImportCsvMappingProps {
    csvHeaders: string[];
    csvPreviewRows: Record<string, unknown>[];
    csvMapping: CsvMapping;
    setCsvMapping: React.Dispatch<React.SetStateAction<CsvMapping>>;
}

export function ImportCsvMapping({ csvHeaders, csvPreviewRows, csvMapping, setCsvMapping }: ImportCsvMappingProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>{t("import.col_date", "Date Column")}</Label>
                    <Select
                        value={csvMapping.dateColumn}
                        onValueChange={(v) => setCsvMapping(p => ({ ...p, dateColumn: v }))}
                    >
                        <SelectTrigger><SelectValue placeholder={t("import.col_select_placeholder", "Select column")} /></SelectTrigger>
                        <SelectContent>
                            {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>{t("import.col_amount", "Amount Column")}</Label>
                    <Select
                        value={csvMapping.amountColumn}
                        onValueChange={(v) => setCsvMapping(p => ({ ...p, amountColumn: v }))}
                    >
                        <SelectTrigger><SelectValue placeholder={t("import.col_select_placeholder", "Select column")} /></SelectTrigger>
                        <SelectContent>
                            {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>{t("import.col_fee", "Fee Column (Optional)")}</Label>
                    <Select
                        value={csvMapping.feeColumn || ""}
                        onValueChange={(v) => setCsvMapping(p => ({ ...p, feeColumn: v === "none" ? undefined : v }))}
                    >
                        <SelectTrigger><SelectValue placeholder={t("import.col_select_placeholder", "Select column")} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none" className="text-muted-foreground font-light">{t("import.col_none", "None")}</SelectItem>
                            {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {csvMapping.feeColumn && (
                        <p className="text-[10px] text-blue-600 dark:text-blue-400">
                            {t("import.fee_note", "Note: Tax will be added to the amount (Amount + Fee).")}
                        </p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label>{t("import.col_category", "Category Column (Optional)")}</Label>
                    <Select
                        value={csvMapping.categoryColumn || ""}
                        onValueChange={(v) => setCsvMapping(p => ({ ...p, categoryColumn: v === "none" ? undefined : v }))}
                    >
                        <SelectTrigger><SelectValue placeholder={t("import.col_select_placeholder", "Select column")} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none" className="text-muted-foreground font-light">{t("import.col_none", "None")}</SelectItem>
                            {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>{t("import.col_description", "Description Column")}</Label>
                    <Select
                        value={csvMapping.descriptionColumn}
                        onValueChange={(v) => setCsvMapping(p => ({ ...p, descriptionColumn: v }))}
                    >
                        <SelectTrigger><SelectValue placeholder={t("import.col_select_placeholder", "Select column")} /></SelectTrigger>
                        <SelectContent>
                            {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Desktop Table Preview */}
            <div className="hidden md:block border rounded-lg overflow-x-auto w-full relative max-w-[80vw] sm:max-w-[720px]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {csvHeaders.map(h => (
                                <TableHead key={h} className="bg-slate-50 dark:bg-slate-900 whitespace-nowrap">{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {csvPreviewRows.map((row, i) => (
                            <TableRow key={i}>
                                {csvHeaders.map(h => (
                                    <TableCell key={h} className="whitespace-nowrap">{row[h] as React.ReactNode}</TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile List Preview */}
            <div className="md:hidden space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    {t("import.preview_mobile_title", "Data Preview (First 3 rows)")}
                </h4>
                {csvPreviewRows.slice(0, 3).map((row, i) => (
                    <div key={i} className="border rounded-lg p-3 bg-card space-y-2 text-xs">
                        <div className="font-mono text-muted-foreground mb-2 border-b pb-1">{t("row_number", { num: i + 1 })}</div>
                        {csvHeaders.map(h => (
                            <div key={h} className="grid grid-cols-3 gap-2">
                                <span className="font-medium text-muted-foreground truncate">{h}:</span>
                                <span className="col-span-2 truncate">{row[h] as React.ReactNode}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <p className="text-xs text-muted-foreground">{t("import.preview_rows", "Showing first 5 rows for preview.")}</p>
        </div>
    );
}
