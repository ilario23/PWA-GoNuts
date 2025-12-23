import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { SyncStatusBadge } from "@/components/SyncStatus";
import { getIconComponent } from "@/lib/icons";
import { useTranslation } from "react-i18next";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { RecurringTransaction, Category } from "@/lib/db";
import {
    addDays,
    addWeeks,
    addMonths,
    addYears,
    isAfter,
    isSameDay,
    parseISO,
    format,
    startOfDay,
} from "date-fns";
import { it, enUS } from "date-fns/locale";

interface RecurringTransactionDesktopTableProps {
    recurringTransactions: RecurringTransaction[] | undefined;
    categories: Category[] | undefined;
    onEdit: (transaction: RecurringTransaction) => void;
    onDelete: (id: string) => void;
}

export function RecurringTransactionDesktopTable({
    recurringTransactions,
    categories,
    onEdit,
    onDelete,
}: RecurringTransactionDesktopTableProps) {
    const { t, i18n } = useTranslation();

    const getDateLocale = () => {
        return i18n.language === "it" ? it : enUS;
    };

    const getNextOccurrence = (startDateStr: string, frequency: string) => {
        const startDate = parseISO(startDateStr);
        const today = startOfDay(new Date());

        let targetDate = startDate;

        if (isAfter(startDate, today) || isSameDay(startDate, today)) {
            targetDate = startDate;
        } else {
            // Calculate next occurrence
            let nextDate = startDate;
            while (isAfter(today, nextDate)) {
                switch (frequency) {
                    case "daily":
                        nextDate = addDays(nextDate, 1);
                        break;
                    case "weekly":
                        nextDate = addWeeks(nextDate, 1);
                        break;
                    case "monthly":
                        nextDate = addMonths(nextDate, 1);
                        break;
                    case "yearly":
                        nextDate = addYears(nextDate, 1);
                        break;
                    default:
                        return startDateStr; // Fallback
                }
            }
            targetDate = nextDate;
        }

        return format(targetDate, "d MMM yyyy", { locale: getDateLocale() });
    };

    const getCategoryDisplay = (id?: string) => {
        if (!id) return "-";
        const cat = categories?.find((c) => c.id === id);
        if (!cat) return "-";
        const IconComp = cat.icon ? getIconComponent(cat.icon) : null;
        return (
            <div className="flex items-center gap-2">
                <div
                    className="h-4 w-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cat.color }}
                >
                    {IconComp && <IconComp className="h-3 w-3 text-white" />}
                </div>
                {cat.name}
            </div>
        );
    };

    return (
        <div className="hidden md:block rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("category")}</TableHead>
                        <TableHead>{t("frequency")}</TableHead>
                        <TableHead>{t("type")}</TableHead>
                        <TableHead className="text-right">{t("amount")}</TableHead>
                        <TableHead>{t("next_occurrence")}</TableHead>
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!recurringTransactions || recurringTransactions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                {t("no_recurring_transactions")}
                            </TableCell>
                        </TableRow>
                    ) : (
                        recurringTransactions?.map((t_item) => (
                            <TableRow key={t_item.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {getCategoryDisplay(t_item.category_id)}
                                        <TooltipProvider delayDuration={300}>
                                            {t_item.pendingSync === 1 && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="cursor-help">
                                                            <SyncStatusBadge isPending={true} />
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{t("changes_pending_sync")}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </TooltipProvider>
                                    </div>
                                </TableCell>
                                <TableCell className="capitalize">
                                    {t(t_item.frequency)}
                                </TableCell>
                                <TableCell className="capitalize">{t(t_item.type)}</TableCell>
                                <TableCell className="text-right">
                                    €{t_item.amount.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                    {getNextOccurrence(t_item.start_date, t_item.frequency)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onEdit(t_item)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t("edit")}</p>
                                                </TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => onDelete(t_item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{t("delete")}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
