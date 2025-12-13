
import * as React from 'react';
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Upload, FileJson, CheckCircle2, AlertTriangle, Loader2, ArrowRight, FileSpreadsheet, RefreshCw, Wand2, Trash2, Info, Download, Settings2, Turtle } from "lucide-react";

import { IntesaSanpaoloParser } from '../../lib/import/parsers/IntesaSanpaoloParser';
import { AntigravityBackupParser } from '../../lib/import/parsers/AntigravityBackupParser';
import { LegacyVueParser } from '../../lib/import/parsers/LegacyVueParser';
import { GenericCsvParser } from '../../lib/import/parsers/GenericCsvParser';
import { RevolutParser } from '../../lib/import/parsers/RevolutParser';
import { ImportProcessor } from '../../lib/import/ImportProcessor';
import { RulesEngine } from '../../lib/import/RulesEngine';
import { useAuth } from '../../contexts/AuthProvider';
import { ParsedData, TransactionParser, CsvMapping, ParsedTransaction, PotentialMerge, RecurringConflict } from '../../lib/import/types';
import { ImportConflictResolver } from './ImportConflictResolver';
import { toast } from 'sonner';
import { Progress } from "../ui/progress";
import * as Papa from 'papaparse';
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Switch } from "../ui/switch";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useTranslation } from 'react-i18next';
import { Building2, Command } from 'lucide-react';
import { syncManager } from '../../lib/sync';
import { useIsMobile } from '../../hooks/use-mobile';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ImportWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImportComplete: (stats?: { transactions: number; categories: number }) => void;
}

type WizardStep = 'select_type' | 'select_bank' | 'upload' | 'mapping' | 'revolut_config' | 'preview' | 'resolving_conflicts' | 'reconciliation' | 'importing' | 'success';
type ImportType = 'backup' | 'bank_csv';
type BankType = 'intesa' | 'revolut' | 'generic';

export function ImportWizard({ open, onOpenChange, onImportComplete }: ImportWizardProps) {
    const { user } = useAuth();
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isMobile = useIsMobile();

    const [step, setStep] = useState<WizardStep>('select_type');
    const [importType, setImportType] = useState<ImportType | null>(null);
    const [selectedBank, setSelectedBank] = useState<BankType | null>(null);

    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [conflicts, setConflicts] = useState<PotentialMerge[]>([]);
    const [recurringConflicts, setRecurringConflicts] = useState<RecurringConflict[]>([]);
    const [importResult, setImportResult] = useState<{
        categories: number;
        transactions: number;
        recurring: number;
        orphanCount: number;
    } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // CSV Specific State
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvContent, setCsvContent] = useState<string>("");
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
    const [csvMapping, setCsvMapping] = useState<CsvMapping>({
        dateColumn: '',
        amountColumn: '',
        descriptionColumn: '',
        hasHeader: true
    });

    // Revolut Specific State
    const [revolutIncludeSavings, setRevolutIncludeSavings] = useState(false);
    const [detectedParser, setDetectedParser] = useState<TransactionParser | null>(null);

    // Reconciliation State
    const categories = useLiveQuery(() => db.categories.where('user_id').equals(user?.id || 'missing').toArray(), [user?.id]);
    const activeCategories = categories?.filter(c => c.active === 1 && !c.deleted_at);
    const [rulesEngine] = useState(() => user ? new RulesEngine(user.id) : null);

    // Helper to force re-render when modifying parsedData in place
    const [, setForceUpdate] = useState(0);

    const resetState = () => {
        setStep('select_type');
        setImportType(null);
        setSelectedBank(null);
        setParsedData(null);
        setIsProcessing(false);
        setError(null);
        setProgress(0);
        setCsvFile(null);
        setCsvContent("");
        setCsvHeaders([]);
        setCsvPreviewRows([]);
        setCsvMapping({ dateColumn: '', amountColumn: '', descriptionColumn: '', hasHeader: true });
        setRevolutIncludeSavings(false);
        setDetectedParser(null);
        setImportResult(null);
        setIsSyncing(false);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) resetState();
        onOpenChange(newOpen);
    };

    const handleSelectType = (type: ImportType) => {
        setImportType(type);
        if (type === 'bank_csv') {
            setStep('select_bank');
        } else {
            setStep('upload');
        }
    };

    const handleSelectBank = (bank: BankType) => {
        setSelectedBank(bank);
        setStep('upload');
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        try {
            // For XLSX files, file.text() might be garbage, verify extension first if parsing as text
            // IntesaParser uses ArrayBuffer so it's fine.
            // But others use FileReader or text.
            // Let's get text only if needed. Common parsers take text.
            const isBinary = file.name.toLowerCase().endsWith('.xlsx');
            let text = "";
            if (!isBinary) {
                text = await file.text();
            }

            let parser: TransactionParser | null = null;

            if (importType === 'backup') {
                const parsers = [
                    new AntigravityBackupParser(),
                    new LegacyVueParser(),
                ];
                for (const p of parsers) {
                    if (await p.canParse(file, text)) {
                        parser = p;
                        break;
                    }
                }
            } else if (importType === 'bank_csv') {
                // Instantiate based on selection
                if (selectedBank === 'intesa') {
                    const p = new IntesaSanpaoloParser();
                    if (await p.canParse(file, text)) parser = p;
                } else if (selectedBank === 'revolut') {
                    const p = new RevolutParser();
                    if (await p.canParse(file, text)) parser = p;
                } else {
                    const p = new GenericCsvParser();
                    if (await p.canParse(file, text)) parser = p;
                }
            }

            if (!parser) {
                if (selectedBank) {
                    throw new Error(`The file does not match the expected format for ${selectedBank === 'intesa' ? 'Intesa Sanpaolo' : selectedBank === 'revolut' ? 'Revolut' : 'CSV'}.`);
                }
                throw new Error("Unsupported file format or invalid content.");
            }

            setDetectedParser(parser);
            setCsvFile(file);
            setCsvContent(text);

            if (parser instanceof GenericCsvParser) {
                // Determine headers via PapaParse
                const preview = Papa.parse(text, { preview: 5, header: true, skipEmptyLines: true });
                if (preview.meta.fields && preview.meta.fields.length > 0) {
                    setCsvHeaders(preview.meta.fields);
                    setCsvPreviewRows(preview.data);
                    setStep('mapping');
                } else {
                    throw new Error("Could not detect CSV headers. Please ensure the file has a header row.");
                }
            } else if (parser instanceof RevolutParser) {
                setStep('revolut_config');
            } else if (parser instanceof IntesaSanpaoloParser) {
                const data = await parser.parse(file, text);
                setParsedData(data);
                setStep('preview');
            } else {
                // Standard parsers (Backup, Vue)
                const data = await parser.parse(file, text);
                setParsedData(data);
                setStep('preview');
            }

        } catch (err: any) {
            setError(err.message || "Failed to parse file");
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleRevolutConfigComplete = async () => {
        if (!detectedParser || !csvFile || !csvContent) return;
        setIsProcessing(true);
        try {
            const data = await detectedParser.parse(csvFile, csvContent, { includeSavings: revolutIncludeSavings });
            setParsedData(data);
            setStep('preview');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = "Date,Amount,Description,Fee,Category";
        const exampleRow = "2023-12-01,-50.00,Grocery Store,0.00,Groceries";
        const csvContent = "data:text/csv;charset=utf-8," + [headers, exampleRow].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "bank_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadCategories = () => {
        if (!activeCategories) return;

        // Format: Name,Type,ID
        const header = "Name,Type,ID";
        const rows = activeCategories.map(c => `${c.name},${c.type},${c.id}`).join("\n");
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + "\n" + rows);

        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", "antigravity_categories.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCsvMappingComplete = async () => {
        if (!csvFile || !csvContent) return;

        setIsProcessing(true);
        try {
            const parser = new GenericCsvParser();
            const data = await parser.parse(csvFile, csvContent, { csvMapping });
            setParsedData(data);
            setStep('preview');
        } catch (err: any) {
            setError(err.message || "Failed to parse CSV with provided mapping");
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrepareReconciliation = async () => {
        if (!parsedData || !rulesEngine) return;
        setIsProcessing(true);
        try {
            await rulesEngine.loadRules();

            // 1. Apply rules (modifies transactions in-place)
            const matched = rulesEngine.applyRules(parsedData.transactions);

            // 2. Filter out SKIPPED transactions
            // We create a new list excluding the skipped ones
            const activeTransactions = parsedData.transactions.filter(t => t.category_id !== 'SKIP');
            const skippedCount = parsedData.transactions.length - activeTransactions.length;

            if (skippedCount > 0) {
                setParsedData({ ...parsedData, transactions: activeTransactions });
                toast.success(`Matched ${matched} rules. Removed ${skippedCount} ignored items.`);
            } else {
                toast.success(`Auto-categorized ${matched} transactions based on your rules.`);
            }

            setStep('reconciliation');
        } catch (e) {
            console.error(e);
            toast.error("Failed to prepare reconciliation");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreateRule = async (tx: ParsedTransaction, categoryId: string) => {
        if (!rulesEngine) return;
        // Simple "Contains" rule on the description
        try {
            await rulesEngine.createRule(tx.description, categoryId, 'contains');

            if (categoryId === 'SKIP') {
                toast.success("Ignore rule created! Transaction removed.");
                // Immediately remove this and any other matching items from the current view
                // to give instant feedback
                if (parsedData) {
                    // Re-run rules or just filter manually for speed
                    const newTransactions = parsedData.transactions.filter(t =>
                        !t.description.toLowerCase().includes(tx.description.toLowerCase())
                    );
                    setParsedData({ ...parsedData, transactions: newTransactions });
                }
            } else {
                toast.success("Rule created!");
                // Re-run rules on remaining
                if (parsedData) {
                    const matched = rulesEngine.applyRules(parsedData.transactions);
                    if (matched > 0) toast.info(`Applied new rule to ${matched} other items.`);
                    setForceUpdate(p => p + 1);
                }
            }
        } catch (e) {
            toast.error("Failed to create rule");
        }
    };

    const handleManualCategoryChange = (tx: ParsedTransaction, categoryId: string) => {
        tx.category_id = categoryId;
        setForceUpdate(p => p + 1);
    }

    const handleDeleteTransaction = (idx: number) => {
        if (!parsedData) return;
        const newTransactions = [...parsedData.transactions];
        newTransactions.splice(idx, 1);
        setParsedData({ ...parsedData, transactions: newTransactions });
        toast.success("Transaction removed from import.");
    };

    const handleImport = async () => {
        if (!parsedData || !user) return;

        // For backups/migrations: Check for fuzzy category matches first
        if (parsedData.categories && parsedData.categories.length > 0) {
            const processor = new ImportProcessor(user.id);
            setIsProcessing(true);
            try {
                // 1. Analyze Category Conflicts
                const foundConflicts = await processor.analyzeCategoryConflicts(parsedData);

                // 2. Analyze Recurring Conflicts
                const foundRecurringConflicts = await processor.analyzeRecurringConflicts(parsedData);

                if (foundConflicts.length > 0 || foundRecurringConflicts.length > 0) {
                    setConflicts(foundConflicts);
                    setRecurringConflicts(foundRecurringConflicts);
                    setStep('resolving_conflicts');
                    setIsProcessing(false);
                    return; // Stop here, wait for user resolution
                }
            } catch (e) {
                console.warn("Failed to analyze conflicts", e);
            } finally {
                setIsProcessing(false);
            }
        }

        // If no categories or no conflicts, proceed directly
        await handleImportAfterMerge(new Map(), new Set());
    };

    const handleImportAfterMerge = async (mergeMap: Map<string, string>, skippedRecurringIds: Set<string>) => {
        if (!parsedData || !user) return;

        setStep('importing');
        setIsProcessing(true);
        const processor = new ImportProcessor(user.id);

        try {
            const result = await processor.process(parsedData, (current, total, msg) => {
                const pct = Math.round((current / total) * 100);
                setProgress(pct);
                setProgressMessage(msg);
            }, mergeMap, skippedRecurringIds);

            setImportResult(result);
            setStep('success');

            // Trigger sync in background
            setIsSyncing(true);
            setProgressMessage(t("import.syncing", "Syncing to cloud..."));
            try {
                await syncManager.pushOnly();
            } finally {
                setIsSyncing(false);
            }

            onImportComplete({
                transactions: result.transactions,
                categories: result.categories
            });
        } catch (err: any) {
            setError(err.message || "Import failed during processing");
            setStep('preview');
        } finally {
            setIsProcessing(false);
        }
    };

    // Mapping Validation
    const isMappingValid = csvMapping.dateColumn && csvMapping.amountColumn && csvMapping.descriptionColumn;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("import.title", "Import Data")}</DialogTitle>
                    <DialogDescription>
                        {step === 'select_type' && t("import.step_select_type", "Choose what kind of data you want to import.")}
                        {step === 'select_bank' && t("import.step_select_bank", "Select your bank.")}
                        {step === 'upload' && t("import.step_upload", "Select the file from your computer.")}
                        {step === 'mapping' && t("import.step_mapping", "Map columns from your CSV to transaction fields.")}
                        {step === 'revolut_config' && t("import.step_revolut_config", "Configure specific options for Revolut import.")}
                        {step === 'preview' && t("import.step_preview", "Review the data found in the file.")}
                        {step === 'resolving_conflicts' && t("import.step_resolving_conflicts", "Similar categories found. Please review.")}
                        {step === 'reconciliation' && t("import.step_reconciliation", "Categorize transactions and create rules.")}
                        {step === 'importing' && t("import.step_importing", "Importing your data...")}
                        {step === 'success' && t("import.step_success", "Import completed successfully!")}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {/* STEP 1: SELECT TYPE */}
                    {step === 'select_type' && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Card
                                className="cursor-pointer hover:border-primary transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                                onClick={() => handleSelectType('backup')}
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
                                onClick={() => handleSelectType('bank_csv')}
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
                    )}

                    {/* STEP 1.5: SELECT BANK */}
                    {step === 'select_bank' && (
                        <div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
                                <Card
                                    className="cursor-pointer hover:border-primary transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                                    onClick={() => handleSelectBank('intesa')}
                                >
                                    <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
                                        <Building2 className="h-8 w-8 mb-3 text-orange-600" />
                                        <h3 className="font-semibold text-md mb-1">Intesa Sanpaolo</h3>
                                        <p className="text-xs text-muted-foreground">Excel (.xlsx)</p>
                                    </CardContent>
                                </Card>

                                <Card
                                    className="cursor-pointer hover:border-primary transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                                    onClick={() => handleSelectBank('revolut')}
                                >
                                    <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
                                        <Building2 className="h-8 w-8 mb-3 text-blue-500" />
                                        <h3 className="font-semibold text-md mb-1">Revolut</h3>
                                        <p className="text-xs text-muted-foreground">CSV Export</p>
                                    </CardContent>
                                </Card>

                                <Card
                                    className="cursor-pointer hover:border-primary transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                                    onClick={() => handleSelectBank('generic')}
                                >
                                    <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
                                        <Command className="h-8 w-8 mb-3 text-slate-500" />
                                        <h3 className="font-semibold text-md mb-1">Generic CSV</h3>
                                        <p className="text-xs text-muted-foreground">Custom Mapping</p>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="flex justify-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadCategories}
                                    className="text-xs gap-2"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Download Category List
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: UPLOAD */}
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-slate-50 dark:bg-slate-950 relative">
                            {/* Template Download Button for Bank CVS */}
                            {importType === 'bank_csv' && selectedBank === 'generic' && !isProcessing && (
                                <div className="absolute top-4 right-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadTemplate}
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
                                        onChange={handleFileSelect}
                                        onClick={(e) => { (e.target as any).value = null; }} // Reset to allow re-selection of same file
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
                    )}

                    {/* STEP 2.5: MAPPING (CSV ONLY) */}
                    {step === 'mapping' && (

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

                            <div className="border rounded-lg overflow-x-auto w-full relative max-w-[80vw] sm:max-w-[720px]">
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
                                                    <TableCell key={h} className="whitespace-nowrap">{row[h]}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <p className="text-xs text-muted-foreground">{t("import.preview_rows", "Showing first 5 rows for preview.")}</p>
                        </div>
                    )}

                    {/* STEP 2.75: REVOLUT CONFIG */}
                    {step === 'revolut_config' && (
                        <div className="flex flex-col items-center justify-center p-8 space-y-6">
                            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Settings2 className="h-8 w-8" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold">{t("import.revolut_title", "Revolut Import Settings")}</h3>
                                <p className="text-muted-foreground text-sm max-w-md mt-2">
                                    {t("import.revolut_desc", "We detected a Revolut export. Would you like to import transfers to/from your savings accounts and pockets?")}
                                </p>
                            </div>

                            <Card className="w-full max-w-md">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between space-x-2">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="include-savings" className="text-base">{t("import.include_savings", "Include Savings & Pockets")}</Label>
                                            <p className="text-xs text-muted-foreground">
                                                {t("import.include_savings_desc", "If enabled, transfers to Vaults/Pockets are imported as expenses or income. If disabled, they are ignored to avoid duplicates or noise.")}
                                            </p>
                                        </div>
                                        <Switch
                                            id="include-savings"
                                            checked={revolutIncludeSavings}
                                            onCheckedChange={setRevolutIncludeSavings}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === 'preview' && parsedData && (
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
                                // We analyze on the fly in render for simplicity, or we could have done it in effect
                                // Since it's fast, render is fine.
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
                    )}

                    {/* STEP 3.5: RECONCILIATION */}
                    {step === 'resolving_conflicts' && (
                        <div className="py-4">
                            <ImportConflictResolver
                                conflicts={conflicts}
                                recurringConflicts={recurringConflicts}
                                onResolve={async (mergeMap, skippedRecurringIds) => {
                                    await handleImportAfterMerge(mergeMap, skippedRecurringIds);
                                }}
                                onCancel={() => {
                                    setStep('preview');
                                }}
                            />
                        </div>
                    )}

                    {step === 'reconciliation' && parsedData && (
                        <div className="space-y-4">
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 p-4 rounded-lg flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                                    <p className="font-medium">Import Limitations</p>
                                    <p>Group expenses and creating new categories are not supported here. We recommend assigning a default category for now.</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-900 p-3 rounded">
                                <div>
                                    <p className="text-sm font-medium">Categorization</p>
                                    <p className="text-xs text-muted-foreground">
                                        {parsedData.transactions.filter(t => !t.category_id).length} uncategorized items
                                    </p>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => handlePrepareReconciliation()}>
                                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                    Re-run Rules
                                </Button>
                            </div>

                            {/* Mobile Card Layout */}
                            {isMobile ? (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                    {parsedData.transactions.slice(0, 100).map((tx, idx) => (
                                        <div key={idx} className="border rounded-lg p-3 bg-white dark:bg-slate-950 space-y-2">
                                            {/* Header: Date, Amount, Delete */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">{tx.date}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-semibold ${tx.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                        {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(tx.amount)}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        onClick={() => handleDeleteTransaction(idx)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Description - Full text, wraps naturally */}
                                            <p className="text-sm font-medium text-foreground leading-snug">
                                                {tx.description}
                                            </p>

                                            {/* Category Select + Rule Button */}
                                            <div className="flex items-center gap-2 pt-1">
                                                <Select
                                                    value={tx.category_id || "uncategorized"}
                                                    onValueChange={(val) => handleManualCategoryChange(tx, val === "uncategorized" ? "" : val)}
                                                >
                                                    <SelectTrigger className="h-9 text-sm flex-1">
                                                        <SelectValue placeholder="Uncategorized" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="uncategorized" className="text-muted-foreground">Uncategorized</SelectItem>
                                                        <SelectItem value="SKIP" className="text-red-500 font-medium">⛔ Ignore (Skip)</SelectItem>
                                                        {activeCategories?.map(c => (
                                                            <SelectItem key={c.id} value={c.id}>
                                                                <span className="flex items-center gap-2">
                                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                                                    {c.name}
                                                                </span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {tx.category_id && (
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-9 w-9 shrink-0"
                                                        title="Create rule for this"
                                                        onClick={() => handleCreateRule(tx, tx.category_id!)}
                                                    >
                                                        <Wand2 className="h-4 w-4 text-blue-500" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {parsedData.transactions.length > 100 && (
                                        <p className="text-center text-xs text-muted-foreground py-2">
                                            And {parsedData.transactions.length - 100} more...
                                        </p>
                                    )}
                                </div>
                            ) : (
                                /* Desktop Table Layout */
                                <div className="border rounded-md overflow-hidden max-h-[400px] overflow-y-auto">
                                    <TooltipProvider>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[100px]">Date</TableHead>
                                                    <TableHead className="min-w-[300px]">Description</TableHead>
                                                    <TableHead className="w-[110px]">Amount</TableHead>
                                                    <TableHead className="w-[160px]">Category</TableHead>
                                                    <TableHead className="w-[80px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {parsedData.transactions.slice(0, 100).map((tx, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="text-xs whitespace-nowrap">{tx.date}</TableCell>
                                                        <TableCell className="text-sm font-medium">
                                                            {tx.description.length > 60 ? (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="cursor-help block max-w-[350px] truncate">
                                                                            {tx.description}
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="bottom" className="max-w-[400px] text-wrap">
                                                                        <p>{tx.description}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            ) : (
                                                                <span>{tx.description}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-sm whitespace-nowrap">
                                                            {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(tx.amount)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={tx.category_id || "uncategorized"}
                                                                onValueChange={(val) => handleManualCategoryChange(tx, val === "uncategorized" ? "" : val)}
                                                            >
                                                                <SelectTrigger className="h-8 text-xs w-[140px]">
                                                                    <SelectValue placeholder="Uncategorized" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="uncategorized" className="text-muted-foreground">Uncategorized</SelectItem>
                                                                    <SelectItem value="SKIP" className="text-red-500 font-medium">⛔ Ignore (Skip)</SelectItem>
                                                                    {activeCategories?.map(c => (
                                                                        <SelectItem key={c.id} value={c.id}>
                                                                            <span className="flex items-center gap-2">
                                                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                                                                {c.name}
                                                                            </span>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell className="flex items-center gap-1">
                                                            {tx.category_id && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    title="Create rule for this"
                                                                    onClick={() => handleCreateRule(tx, tx.category_id!)}
                                                                >
                                                                    <Wand2 className="h-3.5 w-3.5 text-blue-500" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                title="Remove transaction"
                                                                onClick={() => handleDeleteTransaction(idx)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {parsedData.transactions.length > 100 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground p-2">
                                                            And {parsedData.transactions.length - 100} more...
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </TooltipProvider>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: IMPORTING */}
                    {step === 'importing' && (
                        <div className="space-y-6 py-8">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Progress</span>
                                    <span>{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                            </div>
                            <p className="text-center text-sm text-muted-foreground animate-pulse">
                                {progressMessage || "Processing data..."}
                            </p>
                        </div>
                    )}

                    {/* STEP 5: SUCCESS */}
                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">{t("import.complete", "Import Complete")}</h3>
                                <p className="text-muted-foreground">{t("import.complete_desc", "Your data has been successfully imported.")}</p>
                            </div>

                            {/* Import Summary */}
                            {importResult && (
                                <div className="w-full max-w-sm space-y-3 mt-4">
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                                            <span className="text-xl font-bold block">{importResult.transactions}</span>
                                            <span className="text-xs text-muted-foreground">{t("transactions")}</span>
                                        </div>
                                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                                            <span className="text-xl font-bold block">{importResult.categories}</span>
                                            <span className="text-xs text-muted-foreground">{t("categories")}</span>
                                        </div>
                                        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                                            <span className="text-xl font-bold block">{importResult.recurring}</span>
                                            <span className="text-xs text-muted-foreground">{t("recurring")}</span>
                                        </div>
                                    </div>

                                    {/* Orphan Warning */}
                                    {importResult.orphanCount > 0 && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg flex items-start gap-2 text-left">
                                            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                            <div className="text-sm">
                                                <p className="font-medium text-amber-800 dark:text-amber-200">
                                                    {t("import.orphan_warning", "{{count}} transactions need review", { count: importResult.orphanCount })}
                                                </p>
                                                <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                                                    {t("import.orphan_warning_desc", "These transactions have missing categories and won't sync until categorized. Use the 'Needs Review' filter to find them.")}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sync Status */}
                                    {isSyncing && (
                                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>{t("import.syncing", "Syncing to cloud...")}</span>
                                        </div>
                                    )}
                                    {!isSyncing && importResult.orphanCount === 0 && (
                                        <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span>{t("import.synced", "All data synced")}</span>
                                        </div>
                                    )}
                                    {!isSyncing && importResult.orphanCount > 0 && (
                                        <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                                            <RefreshCw className="h-4 w-4" />
                                            <span>{t("import.partial_sync", "{{synced}} synced, {{pending}} pending", {
                                                synced: importResult.transactions - importResult.orphanCount,
                                                pending: importResult.orphanCount
                                            })}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                    {step !== 'success' && step !== 'importing' && (
                        <Button variant="ghost" onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                    )}

                    {step === 'mapping' && (
                        <Button onClick={handleCsvMappingComplete} disabled={isProcessing || !isMappingValid}>
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}

                    {step === 'revolut_config' && (
                        <Button onClick={handleRevolutConfigComplete} disabled={isProcessing}>
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}

                    {step === 'preview' && (
                        <Button
                            onClick={importType === 'bank_csv' ? handlePrepareReconciliation : handleImport}
                            disabled={isProcessing}
                        >
                            {importType === 'bank_csv' ? "Reconcile Data" : "Import Now"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}

                    {step === 'reconciliation' && (
                        <Button onClick={handleImport} disabled={isProcessing}>
                            Confirm Import <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}

                    {step === 'success' && (
                        <Button onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
                            Done
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
