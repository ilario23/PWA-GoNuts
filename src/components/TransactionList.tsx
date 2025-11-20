import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Edit, Trash2 } from 'lucide-react';
import { SyncStatusBadge } from '@/components/SyncStatus';
import { useCategories } from '@/hooks/useCategories';
import { Transaction } from '@/lib/db';

interface TransactionListProps {
    transactions: Transaction[] | undefined;
    onEdit?: (transaction: Transaction) => void;
    onDelete?: (id: string) => void;
    showActions?: boolean;
}

export function TransactionList({ transactions, onEdit, onDelete, showActions = true }: TransactionListProps) {
    const { t } = useTranslation();
    const { categories } = useCategories();

    const getCategoryName = (id?: string) => {
        if (!id) return '-';
        const cat = categories?.find(c => c.id === id);
        return cat ? cat.name : '-';
    };

    const getTypeTextColor = (type: string) => {
        switch (type) {
            case 'expense': return 'text-red-500';
            case 'income': return 'text-green-500';
            case 'investment': return 'text-blue-500';
            default: return '';
        }
    };

    if (!transactions || transactions.length === 0) {
        return <div className="text-muted-foreground text-center py-4">{t('no_transactions')}</div>;
    }

    return (
        <>
            {/* Mobile View: Card Stack */}
            <div className="space-y-4 md:hidden">
                {transactions.map((t_item) => (
                    <div key={t_item.id} className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-sm text-muted-foreground">{t_item.date}</div>
                            <div className={`font-bold ${getTypeTextColor(t_item.type)}`}>
                                {t_item.type === 'expense' ? '-' : t_item.type === 'investment' ? '' : '+'}€{t_item.amount.toFixed(2)}
                            </div>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{t_item.description || '-'}</div>
                            <SyncStatusBadge isPending={t_item.pendingSync === 1} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                {getCategoryName(t_item.category_id)}
                            </div>
                            {showActions && (
                                <div className="flex gap-2">
                                    {onEdit && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(t_item)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {onDelete && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(t_item.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('date')}</TableHead>
                            <TableHead>{t('description')}</TableHead>
                            <TableHead>{t('category')}</TableHead>
                            <TableHead>{t('type')}</TableHead>
                            <TableHead className="text-right">{t('amount')}</TableHead>
                            {showActions && <TableHead></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((t_item) => (
                            <TableRow key={t_item.id}>
                                <TableCell>{t_item.date}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {t_item.description}
                                        <SyncStatusBadge isPending={t_item.pendingSync === 1} />
                                    </div>
                                </TableCell>
                                <TableCell>{getCategoryName(t_item.category_id)}</TableCell>
                                <TableCell className="capitalize">
                                    {t(t_item.type)}
                                </TableCell>
                                <TableCell className={`text-right ${getTypeTextColor(t_item.type)}`}>
                                    {t_item.type === 'expense' ? '-' : t_item.type === 'investment' ? '' : '+'}€{t_item.amount.toFixed(2)}
                                </TableCell>
                                {showActions && (
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-2">
                                            {onEdit && (
                                                <Button variant="ghost" size="icon" onClick={() => onEdit(t_item)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {onDelete && (
                                                <Button variant="ghost" size="icon" onClick={() => onDelete(t_item.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
