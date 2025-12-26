import * as React from 'react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { ImportProcessor } from '../../lib/import/ImportProcessor';
import { RulesEngine } from '../../lib/import/RulesEngine';
import { useAuth } from '../../contexts/AuthProvider';
import { ParsedData, TransactionParser, CsvMapping, ParsedTransaction, PotentialMerge, RecurringConflict } from '../../lib/import/types';
import { ImportConflictResolver } from './ImportConflictResolver';
import { toast } from 'sonner';
import { Progress } from "../ui/progress";
import * as Papa from 'papaparse';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useTranslation } from 'react-i18next';
import { syncManager } from '../../lib/sync';

import { Loader2, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

import { AntigravityBackupParser } from '../../lib/import/parsers/AntigravityBackupParser';
import { LegacyVueParser } from '../../lib/import/parsers/LegacyVueParser';
import { GenericCsvParser } from '../../lib/import/parsers/GenericCsvParser';
import { IntesaSanpaoloParser } from '../../lib/import/parsers/IntesaSanpaoloParser';
import { RevolutParser } from '../../lib/import/parsers/RevolutParser';

// Steps
import { ImportTypeSelection, ImportType, BankType } from './steps/ImportTypeSelection';
import { ImportUploadStep } from './steps/ImportUploadStep';
import { ImportCsvMapping } from './steps/ImportCsvMapping';
import { ImportRevolutConfig } from './steps/ImportRevolutConfig';
import { ImportPreview } from './steps/ImportPreview';
import { ImportReconciliation } from './steps/ImportReconciliation';

interface ImportWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImportComplete: (stats?: { transactions: number; categories: number }) => void;
}

type WizardStep = 'select_type' | 'select_bank' | 'upload' | 'mapping' | 'revolut_config' | 'preview' | 'resolving_conflicts' | 'reconciliation' | 'importing' | 'success';

export function ImportWizard({ open, onOpenChange, onImportComplete }: ImportWizardProps) {
    const { user } = useAuth();
    const { t } = useTranslation();

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

    // Turtlet Import Options
    const [regenerateColors, setRegenerateColors] = useState(true);

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
        setRegenerateColors(true);
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
                const data = await parser.parse(file, text);
                setParsedData(data);
                setStep('preview');
            }

        } catch (err: any) {
            setError(err.message || "Failed to parse file");
        } finally {
            setIsProcessing(false);
            e.target.value = "";
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
            const matched = rulesEngine.applyRules(parsedData.transactions);
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
        try {
            await rulesEngine.createRule(tx.description, categoryId, 'contains');
            if (categoryId === 'SKIP') {
                toast.success("Ignore rule created! Transaction removed.");
                if (parsedData) {
                    const newTransactions = parsedData.transactions.filter(t =>
                        !t.description.toLowerCase().includes(tx.description.toLowerCase())
                    );
                    setParsedData({ ...parsedData, transactions: newTransactions });
                }
            } else {
                toast.success("Rule created!");
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
        if (parsedData.categories && parsedData.categories.length > 0) {
            const processor = new ImportProcessor(user.id);
            setIsProcessing(true);
            try {
                // Load existing data for conflict analysis
                await processor.loadExistingRecurring();

                const foundConflicts = await processor.analyzeCategoryConflicts(parsedData);
                const foundRecurringConflicts = await processor.analyzeRecurringConflicts(parsedData);

                if (foundConflicts.length > 0 || foundRecurringConflicts.length > 0) {
                    setConflicts(foundConflicts);
                    setRecurringConflicts(foundRecurringConflicts);
                    setStep('resolving_conflicts');
                    setIsProcessing(false);
                    return;
                }
            } catch (e: any) {
                console.error("Failed to analyze conflicts", e);
                setError(e.message || "An error occurred while analyzing the file.");
                setIsProcessing(false);
                return;
            }
        }
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
            }, mergeMap, skippedRecurringIds, { regenerateColors });

            setImportResult(result);
            setStep('success');

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
                    {(step === 'select_type' || step === 'select_bank') && (
                        <ImportTypeSelection
                            step={step}
                            onSelectType={handleSelectType}
                            onSelectBank={handleSelectBank}
                            onBack={() => setStep('select_type')}
                            onDownloadCategories={handleDownloadCategories}
                        />
                    )}

                    {step === 'upload' && (
                        <ImportUploadStep
                            importType={importType}
                            selectedBank={selectedBank}
                            isProcessing={isProcessing}
                            error={error}
                            onFileSelect={handleFileSelect}
                            onDownloadTemplate={handleDownloadTemplate}
                        />
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-4">
                            <ImportCsvMapping
                                csvHeaders={csvHeaders}
                                csvPreviewRows={csvPreviewRows}
                                csvMapping={csvMapping}
                                setCsvMapping={setCsvMapping}
                            />
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleCsvMappingComplete} disabled={!isMappingValid}>
                                    {t("common.next", "Next")} <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'revolut_config' && (
                        <div className="space-y-4">
                            <ImportRevolutConfig
                                includeSavings={revolutIncludeSavings}
                                setIncludeSavings={setRevolutIncludeSavings}
                            />
                            <div className="flex justify-end pt-4">
                                <Button onClick={handleRevolutConfigComplete} disabled={isProcessing}>
                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t("common.next", "Next")} <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && parsedData && (
                        <div className="space-y-4">
                            <ImportPreview
                                parsedData={parsedData}
                                regenerateColors={regenerateColors}
                                onRegenerateColorsChange={setRegenerateColors}
                            />
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={resetState}>
                                    {t("common.cancel", "Cancel")}
                                </Button>
                                {/* For backup imports (Vue, Antigravity) that include categories, skip reconciliation */}
                                {(parsedData.source === 'legacy_vue' || parsedData.source === 'antigravity_backup') ? (
                                    <Button onClick={handleImport} disabled={isProcessing}>
                                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t("import.start_import", "Start Import")} <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                ) : (
                                    /* For bank CSV imports, go to reconciliation to categorize */
                                    <Button onClick={handlePrepareReconciliation} disabled={isProcessing}>
                                        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t("import.proceed_to_categorization", "Review & Categorize")} <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'resolving_conflicts' && (
                        <ImportConflictResolver
                            conflicts={conflicts}
                            recurringConflicts={recurringConflicts}
                            onResolve={handleImportAfterMerge}
                            onCancel={() => setStep('preview')}
                        />
                    )}

                    {step === 'reconciliation' && parsedData && (
                        <ImportReconciliation
                            parsedData={parsedData}
                            onImport={handleImport}
                            onCreateRule={handleCreateRule}
                            onManualCategoryChange={handleManualCategoryChange}
                            onDeleteTransaction={handleDeleteTransaction}
                        />
                    )}

                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <div className="relative w-20 h-20">
                                <Loader2 className="w-20 h-20 animate-spin text-primary opacity-20" />
                                <div className="absolute top-0 left-0 w-20 h-20 flex items-center justify-center text-sm font-bold">
                                    {progress}%
                                </div>
                            </div>
                            <p className="font-medium text-lg animate-pulse">{progressMessage}</p>
                            <Progress value={progress} className="w-[60%]" />
                            {isSyncing && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    {t("import.syncing_desc", "Backing up to secure cloud storage...")}
                                </p>
                            )}
                        </div>
                    )}

                    {step === 'success' && importResult && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center">
                            <div className="h-20 w-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">{t("import.success_title", "Import Complete!")}</h3>
                                <p className="text-muted-foreground">{t("import.success_desc", "Your data has been successfully imported and synced.")}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-4">
                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded">
                                    <div className="text-2xl font-bold">{importResult.transactions}</div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("transactions", "Transactions")}</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded">
                                    <div className="text-2xl font-bold">{importResult.categories}</div>
                                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("categories", "Categories")}</div>
                                </div>
                            </div>
                            {importResult.orphanCount > 0 && (
                                <div className="p-3 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 rounded text-sm flex items-center max-w-md">
                                    <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                                    {t("import.orphan_warning", "{{count}} transactions could not be categorized automatically and were set to Uncategorized.", { count: importResult.orphanCount })}
                                </div>
                            )}
                            <div className="pt-4">
                                <Button onClick={() => handleOpenChange(false)} size="lg">
                                    {t("common.done", "Done")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
