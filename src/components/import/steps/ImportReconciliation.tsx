import { Button } from "@/components/ui/button";
import { CheckCircle2, Trash2, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ParsedData, ParsedTransaction } from "../../../lib/import/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { CategorySelector } from "../../CategorySelector";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ImportReconciliationProps {
    parsedData: ParsedData;
    onImport: () => void;
    onCreateRule: (tx: ParsedTransaction, categoryId: string) => void;
    onManualCategoryChange: (tx: ParsedTransaction, categoryId: string) => void;
    onDeleteTransaction: (idx: number) => void;
}

export function ImportReconciliation({ parsedData, onImport, onCreateRule, onManualCategoryChange, onDeleteTransaction }: ImportReconciliationProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">{t("import.review_data", "Review & Categorize")}</h3>
                <Button onClick={onImport} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("import.complete_import", "Complete Import")}
                </Button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-[100px]">{t("common.date", "Date")}</TableHead>
                            <TableHead className="w-[200px]">{t("common.description", "Description")}</TableHead>
                            <TableHead className="w-[120px] text-right">{t("common.amount", "Amount")}</TableHead>
                            <TableHead className="w-[300px]">{t("common.category", "Category")}</TableHead>
                            <TableHead className="w-[100px]">{t("common.actions", "Actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parsedData.transactions.map((tx, i) => (
                            <TableRow key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <TableCell className="font-mono text-sm">
                                    {format(new Date(tx.date), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate" title={tx.description}>
                                    {tx.description}
                                </TableCell>
                                <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-green-600' : ''}`}>
                                    {tx.amount.toFixed(2)} €
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <CategorySelector
                                            value={tx.category_id}
                                            onChange={(catId) => onManualCategoryChange(tx, catId)}
                                            triggerClassName="w-full h-8 text-xs"
                                            showSkipOption={true}
                                        />
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-8 w-8 ${tx.category_id && tx.category_id !== "UNCATEGORIZED" ? "text-purple-500 hover:text-purple-600" : "text-slate-300"}`}
                                                        onClick={() => {
                                                            if (tx.category_id) onCreateRule(tx, tx.category_id);
                                                        }}
                                                        disabled={!tx.category_id || tx.category_id === 'UNCATEGORIZED'}
                                                    >
                                                        <Wand2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t("import.create_rule_tooltip", "Create rule for similar transactions")}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                        onClick={() => onDeleteTransaction(i)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                {parsedData.transactions.map((tx, i) => (
                    <div key={i} className="bg-card border rounded-lg p-3 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {format(new Date(tx.date), 'dd/MM/yyyy')}
                            </span>
                            <span className={`font-bold ${tx.type === 'income' ? 'text-green-600' : ''}`}>
                                {tx.amount.toFixed(2)} €
                            </span>
                        </div>

                        <div className="text-sm font-medium leading-tight">
                            {tx.description}
                        </div>

                        <div className="pt-2 border-t flex items-center gap-2">
                            <div className="flex-1">
                                <CategorySelector
                                    value={tx.category_id}
                                    onChange={(catId) => onManualCategoryChange(tx, catId)}
                                    triggerClassName="w-full h-9 text-sm"
                                    showSkipOption={true}
                                />
                            </div>

                            <div className="flex items-center border-l pl-2 gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-9 w-9 ${tx.category_id && tx.category_id !== "UNCATEGORIZED" ? "text-purple-500 bg-purple-500/10" : "text-slate-300"}`}
                                    onClick={() => {
                                        if (tx.category_id) onCreateRule(tx, tx.category_id);
                                    }}
                                    disabled={!tx.category_id || tx.category_id === 'UNCATEGORIZED'}
                                >
                                    <Wand2 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={() => onDeleteTransaction(i)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="text-right text-xs text-muted-foreground">
                {t("import.total_transactions", "Total Transactions: {{count}}", { count: parsedData.transactions.length })}
            </div>
        </div>
    );
}
