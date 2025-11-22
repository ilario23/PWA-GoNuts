import { useState } from 'react';
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
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';

export function ContextsPage() {
    const { contexts, addContext, deleteContext } = useContexts();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        await addContext({
            user_id: user.id,
            name: formData.name,
            description: formData.description,
        });
        setIsOpen(false);
        setFormData({ name: '', description: '' });
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (deletingId) {
            deleteContext(deletingId);
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">{t('contexts')}</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="icon" className="md:w-auto md:px-4 md:h-10">
                            <Plus className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">{t('add_context')}</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] rounded-lg">
                        <DialogHeader>
                            <DialogTitle>{t('add_context')}</DialogTitle>
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

            {/* Mobile View: Card Stack */}
            <div className="space-y-4 md:hidden">
                {contexts?.map((c) => (
                    <div key={c.id} className="rounded-lg border bg-card p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <div className="font-medium">{c.name}</div>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(c.id)} className="text-destructive hover:text-destructive">
                                {t('delete')}
                            </Button>
                        </div>
                        {c.description && (
                            <div className="text-sm text-muted-foreground">
                                {c.description}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('name')}</TableHead>
                            <TableHead>{t('description')}</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {contexts?.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell>{c.name}</TableCell>
                                <TableCell>{c.description}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(c.id)}>{t('delete')}</Button>
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
                title={t('confirm_delete_context') || t('confirm_delete')}
                description={t('confirm_delete_context_description') || t('confirm_delete_description')}
            />
        </div>
    );
}
