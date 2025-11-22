import { useState, useEffect } from 'react';
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useContexts } from '@/hooks/useContexts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2, Play, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { getIconComponent } from '@/lib/icons';
import { SyncStatusBadge } from '@/components/SyncStatus';
import { addDays, addWeeks, addMonths, addYears, isAfter, isSameDay, parseISO, format, startOfDay } from 'date-fns';
import { CategorySelector } from '@/components/CategorySelector';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';

export function RecurringTransactionsPage() {
    const { recurringTransactions, addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction, generateTransactions } = useRecurringTransactions();
    const { categories } = useCategories();
    const { contexts } = useContexts();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        type: 'expense' as 'income' | 'expense' | 'investment',
        frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
        start_date: new Date().toISOString().split('T')[0],
        category_id: '',
        context_id: '',
    });

    // Reset category when type changes (only when creating new recurring transaction)
    useEffect(() => {
        if (!editingId && formData.category_id) {
            setFormData(prev => ({ ...prev, category_id: '' }));
        }
    }, [formData.type, editingId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (editingId) {
            await updateRecurringTransaction(editingId, {
                amount: parseFloat(formData.amount),
                description: formData.description,
                type: formData.type,
                frequency: formData.frequency,
                start_date: formData.start_date,
                category_id: formData.category_id,
                context_id: formData.context_id || undefined,
            });
        } else {
            await addRecurringTransaction({
                user_id: user.id,
                amount: parseFloat(formData.amount),
                description: formData.description,
                type: formData.type,
                frequency: formData.frequency,
                start_date: formData.start_date,
                category_id: formData.category_id,
                context_id: formData.context_id || undefined,
            });
        }
        setIsOpen(false);
        setEditingId(null);
        setFormData({
            amount: '',
            description: '',
            category_id: '',
            type: 'expense',
            frequency: 'monthly',
            start_date: new Date().toISOString().split('T')[0],
            context_id: '',
        });
    };

    const handleEdit = (transaction: any) => {
        setEditingId(transaction.id);
        setFormData({
            amount: transaction.amount.toString(),
            description: transaction.description || '',
            type: transaction.type,
            frequency: transaction.frequency,
            start_date: transaction.start_date,
            category_id: transaction.category_id || '',
            context_id: transaction.context_id || '',
        });
        setIsOpen(true);
    };

    const openNew = () => {
        setEditingId(null);
        setFormData({
            amount: '',
            description: '',
            category_id: '',
            type: 'expense',
            frequency: 'monthly',
            start_date: new Date().toISOString().split('T')[0],
            context_id: '',
        });
        setIsOpen(true);
    };

    const getNextOccurrence = (startDateStr: string, frequency: string) => {
        const startDate = parseISO(startDateStr);
        const today = startOfDay(new Date());

        if (isAfter(startDate, today) || isSameDay(startDate, today)) {
            return format(startDate, 'yyyy-MM-dd');
        }

        let nextDate = startDate;
        while (isAfter(today, nextDate)) {
            switch (frequency) {
                case 'daily':
                    nextDate = addDays(nextDate, 1);
                    break;
                case 'weekly':
                    nextDate = addWeeks(nextDate, 1);
                    break;
                case 'monthly':
                    nextDate = addMonths(nextDate, 1);
                    break;
                case 'yearly':
                    nextDate = addYears(nextDate, 1);
                    break;
                default:
                    return startDateStr;
            }
        }
        return format(nextDate, 'yyyy-MM-dd');
    };

    const getCategoryDisplay = (id?: string) => {
        if (!id) return '-';
        const cat = categories?.find(c => c.id === id);
        if (!cat) return '-';
        const IconComp = cat.icon ? getIconComponent(cat.icon) : null;
        return (
            <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full flex items-center justify-center" style={{ backgroundColor: cat.color }}>
                    {IconComp && <IconComp className="h-3 w-3 text-white" />}
                </div>
                {cat.name}
            </div>
        );
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'expense': return 'bg-red-500 hover:bg-red-600 text-white';
            case 'income': return 'bg-green-500 hover:bg-green-600 text-white';
            case 'investment': return 'bg-blue-500 hover:bg-blue-600 text-white';
            default: return '';
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (deletingId) {
            deleteRecurringTransaction(deletingId);
            setDeletingId(null);
        }
    };


    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('recurring')}</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => generateTransactions()} size="icon" className="md:w-auto md:px-4 md:h-10">
                        <Play className="h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">{t('run_now')}</span>
                    </Button>
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openNew} size="icon" className="md:w-auto md:px-4 md:h-10">
                                <Plus className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">{t('add_recurring')}</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] rounded-lg">
                            <DialogHeader>
                                <DialogTitle>{editingId ? t('edit_recurring') : t('add_recurring')}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('type')}</label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`w-full ${formData.type === 'expense' ? getTypeColor('expense') : ''}`}
                                            onClick={() => setFormData({ ...formData, type: 'expense' })}
                                        >
                                            {t('expense')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`w-full ${formData.type === 'income' ? getTypeColor('income') : ''}`}
                                            onClick={() => setFormData({ ...formData, type: 'income' })}
                                        >
                                            {t('income')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`w-full ${formData.type === 'investment' ? getTypeColor('investment') : ''}`}
                                            onClick={() => setFormData({ ...formData, type: 'investment' })}
                                        >
                                            {t('investment')}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('frequency')}</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.frequency}
                                        onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                                    >
                                        <option value="daily">{t('daily')}</option>
                                        <option value="weekly">{t('weekly')}</option>
                                        <option value="monthly">{t('monthly')}</option>
                                        <option value="yearly">{t('yearly')}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('amount')}</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('start_date')}</label>
                                    <Input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('category')}</label>
                                    <CategorySelector
                                        value={formData.category_id}
                                        onChange={(value) => setFormData({ ...formData, category_id: value })}
                                        type={formData.type}
                                        modal
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('description')}</label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('context')}</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.context_id}
                                        onChange={(e) => setFormData({ ...formData, context_id: e.target.value })}
                                    >
                                        <option value="">{t('select_context') || 'Select Context'}</option>
                                        {contexts?.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <Button type="submit" className="w-full">{t('save')}</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Mobile View: Card Stack */}
            <div className="space-y-4 md:hidden">
                {recurringTransactions?.map((t_item) => (
                    <div key={t_item.id} className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-sm text-muted-foreground">
                                {t('next')}: {getNextOccurrence(t_item.start_date, t_item.frequency)}
                            </div>
                            <div className="font-bold">€{t_item.amount.toFixed(2)}</div>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {getCategoryDisplay(t_item.category_id)}
                                <SyncStatusBadge isPending={t_item.pendingSync === 1} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                            <div className="capitalize">{t(t_item.frequency)}</div>
                            <div className="capitalize">{t(t_item.type)}</div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(t_item)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(t_item.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('category')}</TableHead>
                            <TableHead>{t('frequency')}</TableHead>
                            <TableHead>{t('type')}</TableHead>
                            <TableHead className="text-right">{t('amount')}</TableHead>
                            <TableHead>{t('next_occurrence') || "Next Occurrence"}</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recurringTransactions?.map((t_item) => (
                            <TableRow key={t_item.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {getCategoryDisplay(t_item.category_id)}
                                        <SyncStatusBadge isPending={t_item.pendingSync === 1} />
                                    </div>
                                </TableCell>
                                <TableCell className="capitalize">{t(t_item.frequency)}</TableCell>
                                <TableCell className="capitalize">{t(t_item.type)}</TableCell>
                                <TableCell className="text-right">€{t_item.amount.toFixed(2)}</TableCell>
                                <TableCell>{getNextOccurrence(t_item.start_date, t_item.frequency)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(t_item)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(t_item.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleConfirmDelete}
                title={t('confirm_delete_recurring') || t('confirm_delete')}
                description={t('confirm_delete_recurring_description') || t('confirm_delete_description')}
            />
        </div>
    );
}
