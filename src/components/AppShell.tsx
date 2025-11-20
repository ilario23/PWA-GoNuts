import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Receipt,
    Repeat,
    Tags,
    Settings,
    Layers,
    PieChart,
} from 'lucide-react';
import { MobileNav } from '@/components/MobileNav';
import { DesktopNav } from '@/components/DesktopNav';

export function AppShell({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();

    const navigation = [
        { name: t('dashboard'), href: '/', icon: LayoutDashboard },
        { name: t('transactions'), href: '/transactions', icon: Receipt },
        { name: t('recurring'), href: '/recurring', icon: Repeat },
        { name: t('categories'), href: '/categories', icon: Tags },
        { name: t('contexts'), href: '/contexts', icon: Layers },
        { name: t('statistics'), href: '/statistics', icon: PieChart },
        { name: t('settings'), href: '/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen overflow-hidden flex-col md:flex-row bg-background">
            <MobileNav navigation={navigation} />
            <DesktopNav navigation={navigation} />

            {/* Main Content */}
            <main className="flex-1 w-full overflow-y-auto p-4 md:p-8">
                <div className="mx-auto max-w-6xl space-y-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
