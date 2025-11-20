import { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { SyncStatusBadge } from '@/components/SyncStatus';

export function TransactionsPage() {
    const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
    const { categories } = useCategories();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        type: 'expense' as 'income' | 'expense' | 'investment',
        category_id: '',
        date: new Date().toISOString().split('T')[0],
    });

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

    const getCategoryName = (id?: string) => {
        if (!id) return '-';
        const cat = categories?.find(c => c.id === id);
        return cat ? cat.name : '-';
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'expense': return 'bg-red-500 hover:bg-red-600 text-white';
            case 'income': return 'bg-green-500 hover:bg-green-600 text-white';
            case 'investment': return 'bg-blue-500 hover:bg-blue-600 text-white';
            default: return '';
        }
    };

    const getTypeTextColor = (type: string) => {
        switch (type) {
            case 'expense': return 'text-red-500';
            case 'income': return 'text-green-500';
            case 'investment': return 'text-blue-500';
            default: return '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('transactions')}</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNew}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('add_transaction')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
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
                                <Select
                                    value={formData.category_id}
                                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('select_category') || "Select Category"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories?.filter(c => c.type === formData.type).map((category) => (
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
                                />
                            </div>
                            <Button type="submit" className="w-full">{t('save')}</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('date')}</TableHead>
                            <TableHead>{t('description')}</TableHead>
                            <TableHead>{t('category')}</TableHead>
                            <TableHead>{t('type')}</TableHead>
                            <TableHead className="text-right">{t('amount')}</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions?.map((t_item) => (
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
                                <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(t_item)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => deleteTransaction(t_item.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
