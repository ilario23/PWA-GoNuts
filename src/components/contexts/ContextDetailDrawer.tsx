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
import { DetailDrawerActions } from "@/components/ui/DetailDrawerActions";
import {
    DetailHeader,
    DetailEyebrow,
    DetailIcon,
    DetailHeadline,
    StatePill,
    MetaPill,
    DetailGrid,
    DetailCell,
} from "@/components/ui/DetailDrawerLayout";
import { Tag, Receipt, X } from "lucide-react";
import { useMobile } from "@/hooks/useMobile";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { parseISO, startOfMonth, startOfYear } from "date-fns";

interface ContextDetailDrawerProps {
    context: Context | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit?: (context: Context) => void;
    onDelete?: (id: string) => void;
}

export function ContextDetailDrawer({
    context,
    open,
    onOpenChange,
    onEdit,
    onDelete,
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

    const isActive = context.active !== 0;

    const Content = (
        <div className="w-full max-w-sm mx-auto pb-2">
            <DetailHeader>
                <DetailEyebrow>
                    <DetailIcon fallbackIcon={Tag} />
                    <StatePill
                        active={isActive}
                        activeLabel={t("active")}
                        inactiveLabel={t("archived") || "Archived"}
                    />
                    <MetaPill label={`${stats?.count || 0} ${t("transactions")}`} />
                </DetailEyebrow>

                <DetailHeadline>{context.name}</DetailHeadline>
                {context.description && (
                    <p className="mt-1.5 break-words text-sm leading-snug text-muted-foreground">
                        {context.description}
                    </p>
                )}
            </DetailHeader>

            <DetailGrid>
                <DetailCell label={t("current_month")} mono valueClassName="text-[hsl(var(--gonuts-bad))] text-lg font-bold">
                    €{(stats?.expensesMonth || 0).toFixed(2)}
                </DetailCell>
                <DetailCell label={t("current_year")} mono valueClassName="text-[hsl(var(--gonuts-bad))] text-lg font-bold">
                    €{(stats?.expensesYear || 0).toFixed(2)}
                </DetailCell>
            </DetailGrid>

            <div className="px-5 pt-4">
                <Button variant="outline" className="w-full justify-start h-12" onClick={handleViewTransactions}>
                    <Receipt className="mr-3 h-5 w-5" />
                    <span className="flex-1 text-left">{t("view_transactions_context")}</span>
                </Button>
            </div>

            {(onEdit || onDelete) && (
                <DetailDrawerActions
                    onClose={() => onOpenChange(false)}
                    onEdit={() => onEdit?.(context)}
                    onDelete={() => onDelete?.(context.id)}
                />
            )}
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
