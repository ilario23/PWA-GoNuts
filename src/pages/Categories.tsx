import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Plus, Trash2, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AVAILABLE_ICONS, getIconComponent } from '@/lib/icons';
import { SyncStatusBadge } from '@/components/SyncStatus';

export function CategoriesPage() {
    const { t } = useTranslation();
    const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        color: '#000000',
        type: 'expense' as 'income' | 'expense' | 'investment',
        icon: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (editingId) {
            await updateCategory(editingId, {
                name: formData.name,
                color: formData.color,
                type: formData.type,
                icon: formData.icon,
            });
        } else {
            await addCategory({
                user_id: user.id,
                name: formData.name,
                color: formData.color,
                type: formData.type,
                icon: formData.icon,
            });
        }
        setIsOpen(false);
        setEditingId(null);
        setFormData({ name: '', color: '#000000', type: 'expense', icon: '' });
    };

    const handleEdit = (category: any) => {
        setEditingId(category.id);
        setFormData({
            name: category.name,
            color: category.color,
            type: category.type,
            icon: category.icon || '',
        });
        setIsOpen(true);
    };

    const openNew = () => {
        setEditingId(null);
        setFormData({ name: '', color: '#000000', type: 'expense', icon: '' });
        setIsOpen(true);
    };



    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('categories')}</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openNew}>
                            <Plus className="mr-2 h-4 w-4" />
                            {t('add_category')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editingId ? t('edit_category') : t('add_category')}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('name')}</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('color')}</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="h-10 w-20 p-1"
                                    />
                                    <Input
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('type')}</label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={`w-full ${formData.type === 'expense' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                                        onClick={() => setFormData({ ...formData, type: 'expense' })}
                                    >
                                        {t('expense')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={`w-full ${formData.type === 'income' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
                                        onClick={() => setFormData({ ...formData, type: 'income' })}
                                    >
                                        {t('income')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={`w-full ${formData.type === 'investment' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}`}
                                        onClick={() => setFormData({ ...formData, type: 'investment' })}
                                    >
                                        {t('investment')}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('icon')}</label>
                                <div className="grid grid-cols-6 gap-2 p-2 border rounded-md max-h-[200px] overflow-y-auto">
                                    {AVAILABLE_ICONS.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.name}
                                                type="button"
                                                className={`p-2 rounded-md flex items-center justify-center hover:bg-accent ${formData.icon === item.name ? 'bg-accent ring-2 ring-primary' : ''}`}
                                                onClick={() => setFormData({ ...formData, icon: item.name })}
                                                title={item.name}
                                            >
                                                <Icon className="h-5 w-5" />
                                            </button>
                                        );
                                    })}
                                </div>
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
                            <TableHead>{t('name')}</TableHead>
                            <TableHead>{t('type')}</TableHead>
                            <TableHead>{t('color')}</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories?.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
                                        {c.icon && (() => {
                                            const IconComp = getIconComponent(c.icon);
                                            return IconComp ? <IconComp className="h-4 w-4" /> : null;
                                        })()}
                                        {c.name}
                                        <SyncStatusBadge isPending={c.pendingSync === 1} />
                                    </div>
                                </TableCell>
                                <TableCell className="capitalize">{t(c.type)}</TableCell>
                                <TableCell>{c.color}</TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => deleteCategory(c.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table >
            </div >
        </div >
    );
}
