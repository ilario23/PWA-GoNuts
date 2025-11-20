import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { format } from 'date-fns';

export function useStatistics() {
    const currentMonth = format(new Date(), 'yyyy-MM');

    const transactions = useLiveQuery(() =>
        db.transactions
            .where('year_month')
            .equals(currentMonth)
            .toArray()
    );

    const categories = useLiveQuery(() => db.categories.toArray());

    const stats = {
        income: 0,
        expense: 0,
        investment: 0,
        byCategory: [] as { name: string; value: number; color: string }[],
    };

    if (transactions && categories) {
        const categoryMap = new Map(categories.map(c => [c.id, c]));

        transactions.forEach(t => {
            if (t.deleted_at) return;

            const amount = Number(t.amount);
            if (t.type === 'income') stats.income += amount;
            else if (t.type === 'expense') stats.expense += amount;
            else if (t.type === 'investment') stats.investment += amount;

            if (t.type === 'expense' && t.category_id) {
                const cat = categoryMap.get(t.category_id);
                if (cat) {
                    const existing = stats.byCategory.find(c => c.name === cat.name);
                    if (existing) {
                        existing.value += amount;
                    } else {
                        stats.byCategory.push({ name: cat.name, value: amount, color: cat.color });
                    }
                }
            }
        });
    }

    return {
        currentMonth,
        stats,
    };
}
