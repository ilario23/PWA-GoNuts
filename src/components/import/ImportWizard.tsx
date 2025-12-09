
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileJson, CheckCircle2, AlertTriangle, Loader2, ArrowRight, FileSpreadsheet, RefreshCw, Wand2, Trash2, Info, Download, Settings2 } from "lucide-react";

import { AntigravityBackupParser } from '@/lib/import/parsers/AntigravityBackupParser';
import { LegacyVueParser } from '@/lib/import/parsers/LegacyVueParser';
import { GenericCsvParser } from '@/lib/import/parsers/GenericCsvParser';
import { RevolutParser } from '@/lib/import/parsers/RevolutParser';
import { ImportProcessor } from '@/lib/import/ImportProcessor';
import { RulesEngine } from '@/lib/import/RulesEngine';
import { useAuth } from '@/contexts/AuthProvider';
import { ParsedData, TransactionParser, CsvMapping, ParsedTransaction } from '@/lib/import/types';
import { toast } from 'sonner';
import { Progress } from "@/components/ui/progress";
import Papa from 'papaparse';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

interface ImportWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImportComplete: (stats?: { transactions: number; categories: number }) => void;
}

type WizardStep = 'select_type' | 'upload' | 'mapping' | 'revolut_config' | 'preview' | 'reconciliation' | 'importing' | 'success';
type ImportType = 'backup' | 'bank_csv';

export function ImportWizard({ open, onOpenChange, onImportComplete }: ImportWizardProps) {
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState<WizardStep>('select_type');
    const [importType, setImportType] = useState<ImportType | null>(null);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState("");
    const [error, setError] = useState<string | null>(null);

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
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) resetState();
        onOpenChange(newOpen);
    };

    const handleSelectType = (type: ImportType) => {
        setImportType(type);
        setStep('upload');
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        try {
            const text = await file.text();
            let parser: TransactionParser | null = null;

            // Detect Parser
            const parsers = [
                new AntigravityBackupParser(),
                new LegacyVueParser(),
                new RevolutParser(),
                new GenericCsvParser()
            ];

            for (const p of parsers) {
                if (await p.canParse(file, text)) {
                    parser = p;
                    break;
                }
            }

            if (!parser) {
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
                // Show dedicated config
                setStep('revolut_config');
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
        const headers = "Date,Amount,Description,Fee";
        const exampleRow = "2023-12-01,-50.00,Grocery Store,0.00";
        const csvContent = "data:text/csv;charset=utf-8," + [headers, exampleRow].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "bank_import_template.csv");
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

        setStep('importing');
        setIsProcessing(true);
        const processor = new ImportProcessor(user.id);

        try {
            await processor.process(parsedData, (current, total, msg) => {
                const pct = Math.round((current / total) * 100);
                setProgress(pct);
                setProgressMessage(msg);
            });

            setStep('success');
            onImportComplete({
                transactions: parsedData.transactions.length,
                categories: parsedData.categories?.length || 0
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
                    <DialogTitle>Import Data</DialogTitle>
                    <DialogDescription>
                        {step === 'select_type' && "Choose what kind of data you want to import."}
                        {step === 'upload' && "Select the file from your computer."}
                        {step === 'mapping' && "Map columns from your CSV to transaction fields."}
                        {step === 'revolut_config' && "Configure specific options for Revolut import."}
                        {step === 'preview' && "Review the data found in the file."}
                        {step === 'reconciliation' && "Categorize transactions and create rules."}
                        {step === 'importing' && "Importing your data..."}
                        {step === 'success' && "Import completed successfully!"}
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
                                    <h3 className="font-semibold text-lg mb-1">System Backup</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Restore from an Antigravity backup or migrate from the old Vue app.
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
                                            toast.info("Supported: Revolut, Intesa, N26, and any bank with standard CSV export.", {
                                                description: "Maps Date, Amount, and Description columns manually."
                                            });
                                        }}
                                    >
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </div>
                                <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
                                    <FileSpreadsheet className="h-10 w-10 mb-4 text-green-500" />
                                    <h3 className="font-semibold text-lg mb-1">Bank Export</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Import transactions from CSV/Excel files (Revolut, Intesa, etc).
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* STEP 2: UPLOAD */}
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-slate-50 dark:bg-slate-950 relative">
                            {/* Template Download Button for Bank CVS */}
                            {importType === 'bank_csv' && !isProcessing && (
                                <div className="absolute top-4 right-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadTemplate}
                                        className="text-xs flex items-center gap-2 h-8"
                                        title="Download a CSV template"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Template
                                    </Button>
                                </div>
                            )}

                            {isProcessing ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                                    <p className="text-sm text-muted-foreground">Analyzing file...</p>
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
                                            ? "Select a .csv file from your bank."
                                            : "Select a .json file to restore your backup."}
                                    </p>
                                    <Button onClick={() => fileInputRef.current?.click()}>
                                        Choose File
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept={importType === 'bank_csv' ? ".csv" : ".json"}
                                        onChange={handleFileSelect}
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
                                    <Label>Date Column</Label>
                                    <Select
                                        value={csvMapping.dateColumn}
                                        onValueChange={(v) => setCsvMapping(p => ({ ...p, dateColumn: v }))}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                                        <SelectContent>
                                            {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Amount Column</Label>
                                    <Select
                                        value={csvMapping.amountColumn}
                                        onValueChange={(v) => setCsvMapping(p => ({ ...p, amountColumn: v }))}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                                        <SelectContent>
                                            {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Fee Column (Optional)</Label>
                                    <Select
                                        value={csvMapping.feeColumn || ""}
                                        onValueChange={(v) => setCsvMapping(p => ({ ...p, feeColumn: v === "none" ? undefined : v }))}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none" className="text-muted-foreground font-light">None</SelectItem>
                                            {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {csvMapping.feeColumn && (
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400">
                                            Note: Tax will be added to the amount (Amount + Fee).
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Description Column</Label>
                                    <Select
                                        value={csvMapping.descriptionColumn}
                                        onValueChange={(v) => setCsvMapping(p => ({ ...p, descriptionColumn: v }))}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
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
                            <p className="text-xs text-muted-foreground">Showing first 5 rows for preview.</p>
                        </div>
                    )}

                    {/* STEP 2.75: REVOLUT CONFIG */}
                    {step === 'revolut_config' && (
                        <div className="flex flex-col items-center justify-center p-8 space-y-6">
                            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Settings2 className="h-8 w-8" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold">Revolut Import Settings</h3>
                                <p className="text-muted-foreground text-sm max-w-md mt-2">
                                    We detected a Revolut export. Would you like to import transfers to/from your savings accounts and pockets?
                                </p>
                            </div>

                            <Card className="w-full max-w-md">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between space-x-2">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="include-savings" className="text-base">Include Savings & Pockets</Label>
                                            <p className="text-xs text-muted-foreground">
                                                If enabled, transfers to Vaults/Pockets are imported as expenses or income.
                                                If disabled, they are ignored to avoid duplicates or noise.
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
                                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-3">Found Data</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded border">
                                        <span className="text-2xl font-bold block">{parsedData.transactions.length}</span>
                                        <span className="text-xs text-muted-foreground">Transactions</span>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded border">
                                        <span className="text-2xl font-bold block">{parsedData.categories?.length || 0}</span>
                                        <span className="text-xs text-muted-foreground">Categories</span>
                                    </div>
                                    {parsedData.recurring && parsedData.recurring.length > 0 && (
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded border">
                                            <span className="text-2xl font-bold block">{parsedData.recurring.length}</span>
                                            <span className="text-xs text-muted-foreground">Recurring</span>
                                        </div>
                                    )}
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded border">
                                        <span className="text-2xl font-bold block capitalize">
                                            {parsedData.source === 'legacy_vue' ? 'Vue App' :
                                                parsedData.source === 'antigravity_backup' ? 'Antigravity' : 'CSV Export'}
                                        </span>
                                        <span className="text-xs text-muted-foreground">Source</span>
                                    </div>
                                </div>
                            </div>

                            {parsedData.source === 'legacy_vue' && (
                                <div className="text-sm p-3 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-900">
                                    <p><strong>Migration Mode:</strong> We will automatically migrate your categories to the new structure.</p>
                                </div>
                            )}

                            {parsedData.source === 'generic_csv' && (
                                <div className="text-sm p-3 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-900">
                                    <p><strong>Note:</strong> Transactions will be set to 'Uncategorized' initially. Use the rules engine in the next step to categorize them.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3.5: RECONCILIATION */}
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

                            <div className="border rounded-md overflow-hidden max-h-[400px] overflow-y-auto overflow-x-auto w-full relative max-w-[80vw] sm:max-w-[720px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="w-[100px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedData.transactions.slice(0, 100).map((tx, idx) => {
                                            // Pagination limit to 100 for perf in MVP
                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell className="text-xs whitespace-nowrap">{tx.date}</TableCell>
                                                    <TableCell className="text-sm font-medium max-w-[200px] truncate" title={tx.description}>
                                                        {tx.description}
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
                                                                {activeCategories?.map(c => ( // Use activeCategories here
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
                                            );
                                        })}
                                        {parsedData.transactions.length > 100 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground p-2">
                                                    And {parsedData.transactions.length - 100} more...
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
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
                                <h3 className="text-lg font-semibold">Import Complete</h3>
                                <p className="text-muted-foreground">Your data has been successfully imported.</p>
                            </div>
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
        </Dialog>
    );
}
