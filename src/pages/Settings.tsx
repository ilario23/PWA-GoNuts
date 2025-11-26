import React, { useState, useRef } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useSync } from '@/hooks/useSync';
import { useOnlineSync } from '@/hooks/useOnlineSync';
import { useAuth } from '@/hooks/useAuth';
import { db, Transaction, Category } from '@/lib/db';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SyncIndicator } from '@/components/SyncStatus';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Sun, Moon, Monitor, Copy, Check, Trash2, AlertTriangle, Upload, FileJson } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { THEME_COLORS } from '@/lib/theme-colors';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { syncManager } from '@/lib/sync';
import { v4 as uuidv4 } from 'uuid';

export function SettingsPage() {
    const { settings, updateSettings } = useSettings();
    const { isSyncing: autoSyncing, sync } = useSync();
    const { isOnline, isSyncing: onlineSyncing } = useOnlineSync();
    const { user } = useAuth();
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();
    const [lastSyncTime, setLastSyncTime] = useState<Date | undefined>();
    const [manualSyncing, setManualSyncing] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [copiedUserId, setCopiedUserId] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [importingData, setImportingData] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true);
    }, []);

    const isSyncing = autoSyncing || onlineSyncing || manualSyncing;

    const handleManualSync = async () => {
        setManualSyncing(true);
        await sync();
        setLastSyncTime(new Date());
        setManualSyncing(false);
    };

    const copyUserId = async () => {
        if (!user) return;
        await navigator.clipboard.writeText(user.id);
        setCopiedUserId(true);
        setTimeout(() => setCopiedUserId(false), 2000);
        toast.success(t('user_id_copied'));
    };

    const handleClearCache = async () => {
        setClearingCache(true);
        try {
            await db.clearLocalCache();
            toast.success(t('cache_cleared'));
            // Trigger a sync to repopulate from server
            await sync();
        } catch (error) {
            toast.error(t('cache_clear_error') || 'Failed to clear cache');
        } finally {
            setClearingCache(false);
        }
    };

    const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        setImportingData(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate structure
            if (!data.transactions && !data.categories) {
                throw new Error('Invalid format: must contain transactions and/or categories');
            }

            let importedTransactions = 0;
            let importedCategories = 0;

            // Import categories first (transactions may depend on them)
            if (data.categories && Array.isArray(data.categories)) {
                for (const cat of data.categories) {
                    const category: Category = {
                        id: cat.id || uuidv4(),
                        user_id: user.id,
                        name: cat.name,
                        icon: cat.icon || 'CircleDollarSign',
                        color: cat.color || '#6366f1',
                        type: cat.type || 'expense',
                        parent_id: cat.parent_id,
                        active: 1,
                        deleted_at: null,
                        pendingSync: 1,
                    };
                    await db.categories.put(category);
                    importedCategories++;
                }
            }

            // Import transactions
            if (data.transactions && Array.isArray(data.transactions)) {
                for (const tx of data.transactions) {
                    const transaction: Transaction = {
                        id: tx.id || uuidv4(),
                        user_id: user.id,
                        category_id: tx.category_id || '',
                        type: tx.type || 'expense',
                        amount: parseFloat(tx.amount) || 0,
                        date: tx.date || new Date().toISOString().split('T')[0],
                        year_month: tx.date?.substring(0, 7) || new Date().toISOString().substring(0, 7),
                        description: tx.description || '',
                        context_id: tx.context_id,
                        group_id: tx.group_id,
                        paid_by_user_id: tx.paid_by_user_id,
                        deleted_at: null,
                        pendingSync: 1,
                    };
                    await db.transactions.put(transaction);
                    importedTransactions++;
                }
            }

            toast.success(t('import_success', { 
                transactions: importedTransactions, 
                categories: importedCategories 
            }) || `Imported ${importedTransactions} transactions and ${importedCategories} categories`);

            // Sync to server
            await syncManager.sync();

        } catch (error: any) {
            toast.error(t('import_error') || `Import failed: ${error.message}`);
        } finally {
            setImportingData(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
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
                        <CardTitle>{t('settings_account')}</CardTitle>
                        <CardDescription>
                            {t('settings_account_desc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="user-id">{t('user_id')}</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="user-id"
                                    value={user?.id || ''}
                                    readOnly
                                    className="font-mono text-sm"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={copyUserId}
                                >
                                    {copiedUserId ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('user_id_share_hint')}
                            </p>
                        </div>
                    </CardContent>
                </Card>

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
                        <Separator />
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                {mounted && resolvedTheme === 'dark' ? (
                                    <Moon className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <Sun className="h-4 w-4 text-muted-foreground" />
                                )}
                                <Label className="text-sm font-medium">{t('theme')} & {t('accent_color')}</Label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="theme" className="text-xs text-muted-foreground">{t('theme')}</Label>
                                    <Select
                                        value={settings.theme}
                                        onValueChange={(value) => updateSettings({ theme: value })}
                                    >
                                        <SelectTrigger id="theme">
                                            <SelectValue placeholder={t('select_theme')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="light">
                                                <div className="flex items-center gap-2">
                                                    <Sun className="h-4 w-4" />
                                                    {t('light')}
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="dark">
                                                <div className="flex items-center gap-2">
                                                    <Moon className="h-4 w-4" />
                                                    {t('dark')}
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="system">
                                                <div className="flex items-center gap-2">
                                                    <Monitor className="h-4 w-4" />
                                                    {t('system')}
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="accentColor" className="text-xs text-muted-foreground">{t('accent_color')}</Label>
                                    <Select
                                        value={settings.accentColor || 'slate'}
                                        onValueChange={(value) => updateSettings({ accentColor: value })}
                                    >
                                        <SelectTrigger id="accentColor">
                                            <SelectValue placeholder={t('select_accent_color')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.values(THEME_COLORS).map((color) => (
                                                <SelectItem key={color.name} value={color.name}>
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="h-4 w-4 rounded-full border"
                                                            style={{
                                                                backgroundColor: `hsl(${color.light.primary})`
                                                            }}
                                                        />
                                                        {t(color.name)}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <Separator />
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
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="investments-total" className="text-base">
                                    {t('include_investments')}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('include_investments_desc')}
                                </p>
                            </div>
                            <div className="pl-2">
                                <Switch
                                    id="investments-total"
                                    checked={settings.include_investments_in_expense_totals}
                                    onCheckedChange={(checked) => updateSettings({ include_investments_in_expense_totals: checked })}
                                />
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="group-expenses" className="text-base">
                                    {t('include_group_expenses')}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('include_group_expenses_desc')}
                                </p>
                            </div>
                            <div className="pl-2">
                                <Switch
                                    id="group-expenses"
                                    checked={settings.include_group_expenses ?? false}
                                    onCheckedChange={(checked) => updateSettings({ include_group_expenses: checked })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('data_management')}</CardTitle>
                        <CardDescription>
                            {t('data_management_desc')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Clear Local Cache */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base flex items-center gap-2">
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    {t('clear_local_cache')}
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('clear_local_cache_desc')}
                                </p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" disabled={clearingCache}>
                                        {clearingCache ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                            t('clear')
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-destructive" />
                                            {t('clear_cache_confirm_title')}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('clear_cache_confirm_desc')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClearCache} className="bg-destructive text-destructive-foreground">
                                            {t('clear')}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>

                        <Separator />

                        {/* Import Data (Dev Feature) */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base flex items-center gap-2">
                                    <Upload className="h-4 w-4 text-muted-foreground" />
                                    {t('import_data')}
                                    <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-1.5 py-0.5 rounded">DEV</span>
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('import_data_desc')}
                                </p>
                            </div>
                            <div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".json"
                                    onChange={handleImportData}
                                    className="hidden"
                                />
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={importingData}
                                >
                                    {importingData ? (
                                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <FileJson className="h-4 w-4 mr-2" />
                                    )}
                                    {t('import_json')}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
