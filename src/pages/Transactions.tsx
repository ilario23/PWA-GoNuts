
import { useState, useEffect } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { CategorySelector } from '@/components/CategorySelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { TransactionList } from '@/components/TransactionList';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';

export function TransactionsPage() {
    const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
    const { categories } = useCategories();
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
        category_id: '',
        date: new Date().toISOString().split('T')[0],
    });

    const [filters, setFilters] = useState({
        text: '',
        dateFrom: '',
        dateTo: '',
        minAmount: '',
        maxAmount: '',
        categoryId: 'all',
        type: 'all',
    });

    // Reset category when type changes (only when creating new transaction)
    useEffect(() => {
        if (!editingId && formData.category_id) {
            setFormData(prev => ({ ...prev, category_id: '' }));
        }
    }, [formData.type, editingId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!formData.category_id) {
            alert(t('select_category_required'));
            return;
        }

        if (editingId) {
            await updateTransaction(editingId, {
                amount: parseFloat(formData.amount),
                description: formData.description,
                type: formData.type,
                category_id: formData.category_id,
                date: formData.date,
                year_month: formData.date.substring(0, 7),
            });
        } else {
            await addTransaction({
                user_id: user.id,
                amount: parseFloat(formData.amount),
                description: formData.description,
                type: formData.type,
                category_id: formData.category_id,
                date: formData.date,
                year_month: formData.date.substring(0, 7),
            });
        }
        setIsOpen(false);
        setEditingId(null);
        setFormData({
            amount: '',
            description: '',
            category_id: '',
            type: 'expense',
            date: new Date().toISOString().split('T')[0],
        });
    };

    const handleEdit = (transaction: any) => {
        setEditingId(transaction.id);
        setFormData({
            amount: transaction.amount.toString(),
            description: transaction.description || '',
            type: transaction.type,
            category_id: transaction.category_id || '',
            date: transaction.date,
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
            date: new Date().toISOString().split('T')[0],
        });
        setIsOpen(true);
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'expense': return 'bg-red-500 hover:bg-red-600 text-white';
            case 'income': return 'bg-green-500 hover:bg-green-600 text-white';
            case 'investment': return 'bg-blue-500 hover:bg-blue-600 text-white';
            default: return '';
        }
    };

    const handleResetFilters = () => {
        setFilters({
            text: '',
            dateFrom: '',
            dateTo: '',
            minAmount: '',
            maxAmount: '',
            categoryId: 'all',
            type: 'all',
        });
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (deletingId) {
            deleteTransaction(deletingId);
            setDeletingId(null);
        }
    };


    const filteredTransactions = transactions?.filter(transaction => {
        if (transaction.deleted_at) return false;

        // Text Search
        if (filters.text && !transaction.description?.toLowerCase().includes(filters.text.toLowerCase())) {
            return false;
        }

        // Date Range
        if (filters.dateFrom && transaction.date < filters.dateFrom) return false;
        if (filters.dateTo && transaction.date > filters.dateTo) return false;

        // Amount Range
        if (filters.minAmount && transaction.amount < parseFloat(filters.minAmount)) return false;
        if (filters.maxAmount && transaction.amount > parseFloat(filters.maxAmount)) return false;

        // Category
        if (filters.categoryId !== 'all' && transaction.category_id !== filters.categoryId) return false;

        // Type
        if (filters.type !== 'all' && transaction.type !== filters.type) return false;

        return true;
    }) || [];

    const FilterContent = () => (
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">{t('description')}</label>
                <Input
                    placeholder={t('search_placeholder') || "Search..."}
                    value={filters.text}
                    onChange={(e) => setFilters({ ...filters, text: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">{t('type')}</label>
                <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters({ ...filters, type: value })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t('all_types')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('all_types') || "All Types"}</SelectItem>
                        <SelectItem value="expense">{t('expense')}</SelectItem>
                        <SelectItem value="income">{t('income')}</SelectItem>
                        <SelectItem value="investment">{t('investment')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">{t('category')}</label>
                <Select
                    value={filters.categoryId}
                    onValueChange={(value) => setFilters({ ...filters, categoryId: value })}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={t('all_categories')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('all_categories') || "All Categories"}</SelectItem>
                        {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                                    {category.name}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">{t('date_from')}</label>
                <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">{t('date_to')}</label>
                <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">{t('min_amount')}</label>
                    <Input
                        type="number"
                        placeholder="0.00"
                        value={filters.minAmount}
                        onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">{t('max_amount')}</label>
                    <Input
                        type="number"
                        placeholder="∞"
                        value={filters.maxAmount}
                        onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                    />
                </div>
            </div>

            <Button variant="outline" onClick={handleResetFilters} className="w-full gap-2">
                <X className="h-4 w-4" />
                {t('reset_filters') || "Reset Filters"}
            </Button>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('transactions')}</h1>
                <div className="flex gap-2">
                    {/* Mobile Filter Sheet */}
                    <div className="md:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <Search className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left">
                                <SheetHeader>
                                    <SheetTitle>{t('filters')}</SheetTitle>
                                </SheetHeader>
                                <FilterContent />
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Desktop Filter Popover */}
                    <div className="hidden md:block">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <Search className="h-4 w-4" />
                                    {t('filters') || "Filters"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                                <FilterContent />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={openNew} size="icon" className="md:w-auto md:px-4 md:h-10">
                                <Plus className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">{t('add_transaction')}</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-lg">
                            <DialogHeader>
                                <DialogTitle>{editingId ? t('edit_transaction') : t('add_transaction')}</DialogTitle>
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
                                    <label className="text-sm font-medium">{t('category')}</label>
                                    <CategorySelector
                                        value={formData.category_id}
                                        onChange={(value) => setFormData({ ...formData, category_id: value })}
                                        type={formData.type}
                                        modal
                                    />
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
                                    <label className="text-sm font-medium">{t('date')}</label>
                                    <Input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        required
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
                                <Button type="submit" className="w-full">{t('save')}</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Active Filters Summary */}
            {(filters.text || filters.dateFrom || filters.dateTo || filters.minAmount || filters.maxAmount || filters.categoryId !== 'all' || filters.type !== 'all') && (
                <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
                    <span>{t('active_filters')}:</span>
                    {filters.text && <span className="bg-muted px-2 py-1 rounded-md">"{filters.text}"</span>}
                    {filters.type !== 'all' && <span className="bg-muted px-2 py-1 rounded-md capitalize">{t(filters.type)}</span>}
                    <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-auto p-0 text-destructive hover:text-destructive">
                        <X className="h-3 w-3 mr-1" />
                        {t('clear')}
                    </Button>
                </div>
            )}

            <TransactionList
                transactions={filteredTransactions}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
            />

            <DeleteConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={handleConfirmDelete}
                title={t('confirm_delete_transaction') || t('confirm_delete')}
                description={t('confirm_delete_transaction_description') || t('confirm_delete_description')}
            />
        </div>
    );
}
