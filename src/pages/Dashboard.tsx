import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactions } from '@/hooks/useTransactions';
import { useTranslation } from 'react-i18next';
import { TransactionList } from '@/components/TransactionList';

export function Dashboard() {
    const { transactions } = useTransactions();
    const { t } = useTranslation();

    const totalIncome = transactions
        ?.filter((t) => t.type === 'income' && !t.deleted_at)
        .reduce((acc, curr) => acc + curr.amount, 0) || 0;

    const totalExpense = transactions
        ?.filter((t) => t.type === 'expense' && !t.deleted_at)
        .reduce((acc, curr) => acc + curr.amount, 0) || 0;

    const balance = totalIncome - totalExpense;

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold">{t('dashboard')}</h1>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('total_balance')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            €{balance.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('total_income')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            +€{totalIncome.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('total_expenses')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            -€{totalExpense.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('recent_transactions')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TransactionList
                            transactions={transactions?.filter(t => !t.deleted_at).slice(0, 5)}
                            showActions={false}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}