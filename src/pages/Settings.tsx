import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useSync } from '@/hooks/useSync';
import { useOnlineSync } from '@/hooks/useOnlineSync';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SyncIndicator } from '@/components/SyncStatus';
import { Skeleton } from '@/components/ui/skeleton';
// import { Separator } from '@/components/ui/separator';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SettingsPage() {
    const { settings, updateSettings } = useSettings();
    const { isSyncing: autoSyncing, sync } = useSync();
    const { isOnline, isSyncing: onlineSyncing } = useOnlineSync();
    const { t } = useTranslation();
    const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
    const [manualSyncing, setManualSyncing] = useState(false);

    const isSyncing = autoSyncing || onlineSyncing || manualSyncing;

    const handleManualSync = async () => {
        setManualSyncing(true);
        await sync();
        setLastSyncTime(new Date());
        setManualSyncing(false);
    };

    if (!settings) {
        return (
            <div className="space-y-6 pb-10">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-[400px] w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">{t('settings')}</h2>
                <p className="text-muted-foreground">
                    {t('settings_general_desc')}
                </p>
            </div>
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('sync')}</CardTitle>
                        <CardDescription>
                            {t('sync_desc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <SyncIndicator
                                isSyncing={isSyncing}
                                isOnline={isOnline}
                                lastSyncTime={lastSyncTime}
                            />
                            <Button
                                onClick={handleManualSync}
                                disabled={isSyncing || !isOnline}
                                size="sm"
                                variant="outline"
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                {t('sync_now')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings_general')}</CardTitle>
                        <CardDescription>
                            {t('settings_general_desc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="language">{t('language')}</Label>
                            <Select
                                value={settings.language || 'en'}
                                onValueChange={(value) => {
                                    updateSettings({ language: value });
                                    import('@/i18n').then(({ default: i18n }) => {
                                        i18n.changeLanguage(value);
                                    });
                                }}
                            >
                                <SelectTrigger id="language" className="max-w-[200px]">
                                    <SelectValue placeholder={t('select_language')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="it">Italiano</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="theme">{t('theme')}</Label>
                            <Select
                                value={settings.theme}
                                onValueChange={(value) => updateSettings({ theme: value })}
                            >
                                <SelectTrigger id="theme" className="max-w-[200px]">
                                    <SelectValue placeholder={t('select_theme')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="light">{t('light')}</SelectItem>
                                    <SelectItem value="dark">{t('dark')}</SelectItem>
                                    <SelectItem value="system">{t('system')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="start_of_week">{t('start_of_week')}</Label>
                            <Select
                                value={settings.start_of_week}
                                onValueChange={(value) => updateSettings({ start_of_week: value })}
                            >
                                <SelectTrigger id="start_of_week" className="max-w-[200px]">
                                    <SelectValue placeholder={t('select_start_day')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monday">{t('monday')}</SelectItem>
                                    <SelectItem value="sunday">{t('sunday')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings_calculations')}</CardTitle>
                        <CardDescription>
                            {t('settings_calculations_desc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="investments-total" className="flex flex-col space-y-1">
                                <span>{t('include_investments')}</span>
                                <span className="font-normal text-muted-foreground">
                                    {t('include_investments_desc')}
                                </span>
                            </Label>
                            <Switch
                                id="investments-total"
                                checked={settings.include_investments_in_expense_totals}
                                onCheckedChange={(checked) => updateSettings({ include_investments_in_expense_totals: checked })}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
