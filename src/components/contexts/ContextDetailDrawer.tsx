import { useTranslation } from "react-i18next";
import { Context, db } from "@/lib/db";
import {
    Drawer,
    DrawerContent,
    DrawerClose,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tag, Receipt, X, Hash, Calendar } from "lucide-react";
import { useMobile } from "@/hooks/useMobile";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { parseISO, startOfMonth, startOfYear } from "date-fns";

interface ContextDetailDrawerProps {
    context: Context | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ContextDetailDrawer({
    context,
    open,
    onOpenChange,
}: ContextDetailDrawerProps) {
    const { t } = useTranslation();
    const isMobile = useMobile();
    const navigate = useNavigate();

    // Fetch stats for this context
    const stats = useLiveQuery(async () => {
        if (!context) return { count: 0, expensesMonth: 0, expensesYear: 0 };

        const transactions = await db.transactions
            .where("context_id")
            .equals(context.id)
            .toArray();

        const count = transactions.length;

        const now = new Date();
        const dateStartMonth = startOfMonth(now);
        const dateStartYear = startOfYear(now);

        let expensesMonth = 0;
        let expensesYear = 0;

        transactions.forEach(t => {
            if (t.type === 'expense') {
                const d = parseISO(t.date);
                if (d >= dateStartMonth) expensesMonth += t.amount;
                if (d >= dateStartYear) expensesYear += t.amount;
            }
        });

        return { count, expensesMonth, expensesYear };
    }, [context?.id]);

    if (!context) return null;

    const handleViewTransactions = () => {
        navigate(`/transactions?contextId=${context.id}`);
        onOpenChange(false);
    };

    const Content = (
        <div className="w-full max-w-sm mx-auto">
            {/* Header Section */}
            <div className="text-center pt-8 pb-4 relative">
                <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Tag className="h-8 w-8 text-primary" />
                    </div>
                </div>
                <div className="px-4">
                    <h2 className="text-2xl font-bold truncate">{context.name}</h2>
                    {context.description && (
                        <p className="text-muted-foreground mt-1">{context.description}</p>
                    )}
                </div>
                {/* Status Badge & Count */}
                <div className="mt-3 flex justify-center gap-2 items-center">
                    {context.active === 0 && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            {t("archived") || "Archived"}
                        </Badge>
                    )}
                    {context.active !== 0 && (
                        <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            {t("active")}
                        </Badge>
                    )}
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {stats?.count || 0}
                    </Badge>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="px-4 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 p-3 rounded-lg border flex flex-col items-center justify-center text-center">
                        <div className="flex items-center text-muted-foreground text-xs mb-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {t("current_month")}
                        </div>
                        <div className="text-xl font-bold text-red-500">
                            {(stats?.expensesMonth || 0).toFixed(2)} €
                        </div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg border flex flex-col items-center justify-center text-center">
                        <div className="flex items-center text-muted-foreground text-xs mb-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {t("current_year")}
                        </div>
                        <div className="text-xl font-bold text-red-500">
                            {(stats?.expensesYear || 0).toFixed(2)} €
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                    <Button className="w-full justify-start h-12" onClick={handleViewTransactions}>
                        <Receipt className="mr-3 h-5 w-5" />
                        <span className="flex-1 text-left">{t("view_transactions_context")}</span>
                    </Button>
                </div>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <DrawerHeader className="sr-only">
                        <DrawerTitle>{context.name}</DrawerTitle>
                        <DrawerDescription>{t("context_details")}</DrawerDescription>
                    </DrawerHeader>
                    {/* Close Button Mobile */}
                    <DrawerClose asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-4 top-4 h-8 w-8 rounded-full opacity-70 hover:opacity-100 z-10"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">{t("close")}</span>
                        </Button>
                    </DrawerClose>
                    {Content}
                    <div className="mb-6"></div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader className="sr-only">
                    <DialogTitle>{context.name}</DialogTitle>
                    <DialogDescription>{t("context_details")}</DialogDescription>
                </DialogHeader>
                {Content}
            </DialogContent>
        </Dialog>
    );
}
