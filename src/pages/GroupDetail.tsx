import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGroups, GroupWithMembers } from '@/hooks/useGroups';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import { ArrowLeft, Plus, Users, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { TransactionList } from '@/components/TransactionList';
import { CategorySelector } from '@/components/CategorySelector';
import { getIconComponent } from '@/lib/icons';

export function GroupDetailPage() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { groups, getGroupBalance } = useGroups();
    const { transactions, addTransaction, deleteTransaction } = useTransactions(undefined, undefined, groupId);
    const { categories } = useCategories(groupId);

    const [group, setGroup] = useState<GroupWithMembers | null>(null);
    const [balance, setBalance] = useState<{
        totalExpenses: number;
        balances: Record<string, {
            userId: string;
            share: number;
            shouldPay: number;
            hasPaid: number;
            balance: number;
        }>;
        members: any[];
    } | null>(null);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        description: '',
        type: 'expense' as 'income' | 'expense' | 'investment',
        category_id: '',
        date: new Date().toISOString().split('T')[0],
        paid_by_user_id: user?.id || '',
    });

    // Find the group
    useEffect(() => {
        if (groups && groupId) {
            const foundGroup = groups.find(g => g.id === groupId);
            setGroup(foundGroup || null);
        }
    }, [groups, groupId]);

    // Load balance
    useEffect(() => {
        const loadBalance = async () => {
            if (groupId) {
                const bal = await getGroupBalance(groupId);
                setBalance(bal);
            }
        };
        loadBalance();
    }, [groupId, getGroupBalance, transactions]);

    // Filter transactions for this group only
    const groupTransactions = useMemo(() => {
        return transactions?.filter(t => t.group_id === groupId && !t.deleted_at) || [];
    }, [transactions, groupId]);

    // Filter categories for this group
    const groupCategories = useMemo(() => {
        return categories?.filter(c => c.group_id === groupId && !c.deleted_at) || [];
    }, [categories, groupId]);

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !groupId) return;

        await addTransaction({
            user_id: user.id,
            amount: parseFloat(formData.amount),
            description: formData.description,
            type: formData.type,
            category_id: formData.category_id,
            date: formData.date,
            year_month: formData.date.substring(0, 7),
            group_id: groupId,
            paid_by_user_id: formData.paid_by_user_id || user.id,
        });

        setIsAddDialogOpen(false);
        setFormData({
            amount: '',
            description: '',
            type: 'expense',
            category_id: '',
            date: new Date().toISOString().split('T')[0],
            paid_by_user_id: user.id,
        });
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'expense': return 'bg-red-500 hover:bg-red-600 text-white';
            case 'income': return 'bg-green-500 hover:bg-green-600 text-white';
            case 'investment': return 'bg-blue-500 hover:bg-blue-600 text-white';
            default: return '';
        }
    };

    const myBalance = balance?.balances[user?.id || ''];

    if (!group) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => navigate('/groups')} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    {t('groups')}
                </Button>
                <div className="text-center text-muted-foreground py-8">
                    {t('loading')}...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/groups')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{group.name}</h1>
                    {group.description && (
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                    )}
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="icon" className="md:w-auto md:px-4 md:h-10">
                            <Plus className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">{t('add_transaction')}</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-lg">
                        <DialogHeader>
                            <DialogTitle>{t('add_transaction')}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
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
                                </div>
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

                            {groupCategories.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t('category')}</label>
                                    <CategorySelector
                                        value={formData.category_id}
                                        onChange={(value) => setFormData({ ...formData, category_id: value })}
                                        type={formData.type}
                                        modal
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('paid_by')}</label>
                                <Select
                                    value={formData.paid_by_user_id}
                                    onValueChange={(value) => setFormData({ ...formData, paid_by_user_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('select_payer')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {group.members.map((member) => (
                                            <SelectItem key={member.id} value={member.user_id}>
                                                {member.user_id === user?.id ? t('me') : member.user_id.substring(0, 8) + '...'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button type="submit" className="w-full">{t('save')}</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('total_expenses')}</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            €{(balance?.totalExpenses || 0).toFixed(2)}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('your_share')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {group.myShare}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('should_pay')}: €{(myBalance?.shouldPay || 0).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('balance')}</CardTitle>
                        {(myBalance?.balance || 0) >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${(myBalance?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(myBalance?.balance || 0) >= 0 ? '+' : ''}€{(myBalance?.balance || 0).toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('has_paid')}: €{(myBalance?.hasPaid || 0).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="transactions" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="transactions">{t('transactions')}</TabsTrigger>
                    <TabsTrigger value="balance">{t('balance')}</TabsTrigger>
                    <TabsTrigger value="categories">{t('categories')}</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions" className="space-y-4">
                    <TransactionList
                        transactions={groupTransactions}
                        categories={categories}
                        onEdit={(transaction) => {
                            // Navigate to transactions page with this transaction highlighted
                            navigate('/transactions', { state: { editTransaction: transaction.id } });
                        }}
                        onDelete={(id) => deleteTransaction(id)}
                        isLoading={transactions === undefined}
                    />
                </TabsContent>

                <TabsContent value="balance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('member_shares')}</CardTitle>
                            <CardDescription>{t('group_balance')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {group.members.map((member) => {
                                const memberBalance = balance?.balances[member.user_id];
                                const isMe = member.user_id === user?.id;
                                return (
                                    <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                        <div>
                                            <div className="font-medium flex items-center gap-2">
                                                {isMe ? t('you') : member.user_id.substring(0, 8) + '...'}
                                                {isMe && <Badge variant="secondary">{t('you')}</Badge>}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {member.share}% • {t('should_pay')}: €{(memberBalance?.shouldPay || 0).toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-muted-foreground">
                                                {t('has_paid')}: €{(memberBalance?.hasPaid || 0).toFixed(2)}
                                            </div>
                                            <div className={`font-medium ${(memberBalance?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {(memberBalance?.balance || 0) >= 0 ? '+' : ''}€{(memberBalance?.balance || 0).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="categories" className="space-y-4">
                    {groupCategories.length === 0 ? (
                        <Card>
                            <CardContent className="py-8 text-center text-muted-foreground">
                                {t('no_categories')}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {groupCategories.map((category) => {
                                const IconComp = category.icon ? getIconComponent(category.icon) : null;
                                return (
                                    <Card key={category.id}>
                                        <CardContent className="flex items-center gap-3 p-4">
                                            <div
                                                className="h-10 w-10 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: category.color }}
                                            >
                                                {IconComp && <IconComp className="h-5 w-5 text-white" />}
                                            </div>
                                            <div>
                                                <div className="font-medium">{category.name}</div>
                                                <div className="text-sm text-muted-foreground capitalize">
                                                    {t(category.type)}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
