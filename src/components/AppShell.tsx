import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Receipt,
    Repeat,
    Tags,
    Settings,
    LogOut,
    Menu,
    Layers,
    PieChart,
    Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';

export function AppShell({ children }: { children: React.ReactNode }) {
    const { t } = useTranslation();
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const navigation = [
        { name: t('dashboard'), href: '/', icon: LayoutDashboard },
        { name: t('transactions'), href: '/transactions', icon: Receipt },
        { name: t('recurring'), href: '/recurring', icon: Repeat },
        { name: t('categories'), href: '/categories', icon: Tags },
        { name: t('contexts'), href: '/contexts', icon: Layers },
        { name: t('statistics'), href: '/statistics', icon: PieChart },
        { name: t('settings'), href: '/settings', icon: Settings },
    ];

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    const handleNavClick = (href: string) => {
        navigate(href);
        setIsSheetOpen(false);
    };

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            {/* Mobile Header */}
            <div className="flex items-center justify-between border-b p-4 md:hidden">
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <SheetTitle className="sr-only">{t('app_title')}</SheetTitle>
                        <SheetDescription className="sr-only">{t('navigation_menu')}</SheetDescription>
                        <div className="flex h-full flex-col">
                            <div className="flex items-center gap-2 border-b p-4 font-bold text-xl">
                                <Wallet className="h-6 w-6" />
                                <span>{t('app_title')}</span>
                            </div>
                            <nav className="flex-1 space-y-1 p-2">
                                {navigation.map((item) => {
                                    const isActive = location.pathname === item.href;
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => handleNavClick(item.href)}
                                            className={cn(
                                                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left',
                                                isActive
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            {item.name}
                                        </button>
                                    );
                                })}
                            </nav>
                            <div className="border-t p-4">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                                    onClick={handleSignOut}
                                >
                                    <LogOut className="h-4 w-4" />
                                    {t('logout')}
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
                <div className="flex items-center gap-2 font-bold text-xl">
                    <Wallet className="h-6 w-6" />
                    <span>{t('app_title')}</span>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden w-64 flex-col border-r bg-muted/10 md:flex">
                <div className="flex h-14 items-center border-b px-4 font-bold text-xl">
                    <Wallet className="mr-2 h-6 w-6" />
                    <span>{t('app_title')}</span>
                </div>
                <nav className="flex-1 space-y-1 p-2">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
                <div className="border-t p-4">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                        onClick={handleSignOut}
                    >
                        <LogOut className="h-4 w-4" />
                        {t('logout')}
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                {children}
            </main>
        </div>
    );
}
