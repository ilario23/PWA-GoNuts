import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Wallet, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineSync } from '@/hooks/useOnlineSync';
import packageJson from '../../package.json';

// Temporary interface until we centralize types
interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
}

interface MobileNavProps {
    navigation: NavItem[];
}

export function MobileNav({ navigation }: MobileNavProps) {
    const { t } = useTranslation();
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { isOnline } = useOnlineSync();
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    const handleNavClick = (href: string) => {
        navigate(href);
        setIsSheetOpen(false);
    };

    return (
        <div className="flex items-center justify-between border-b p-2 md:hidden bg-background sticky top-0 z-50">
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t('open_menu')}>
                        <Menu className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0" hideClose={true}>
                    <SheetTitle className="sr-only">{t('app_title')}</SheetTitle>
                    <SheetDescription className="sr-only">{t('navigation_menu')}</SheetDescription>
                    <div className="flex h-full flex-col">
                        <div className="flex items-center gap-2 border-b p-4 font-bold text-xl">
                            <Wallet className={cn("h-6 w-6", !isOnline && "text-destructive")} />
                            <span className="text-primary">{t('app_title')}</span>
                        </div>
                        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
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
                        <div className="border-t p-4 space-y-2">
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
                                onClick={handleSignOut}
                            >
                                <LogOut className="h-4 w-4" />
                                {t('logout')}
                            </Button>
                            <div className="text-xs text-muted-foreground text-center pt-2">
                                v{packageJson.version}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 font-bold text-lg">
                <Wallet className={cn("h-5 w-5", !isOnline && "text-destructive")} />
                <span className="text-primary">{t('app_title')}</span>
            </div>
            {/* Placeholder for right side actions if needed, e.g. profile or add */}
            <div className="w-9" />
        </div>
    );
}
