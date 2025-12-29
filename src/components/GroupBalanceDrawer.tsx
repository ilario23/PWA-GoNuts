import { useTranslation } from "react-i18next";
import { GroupWithMembers } from "@/hooks/useGroups";
import { useIsMobile } from "@/hooks/use-mobile";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/UserAvatar";
import {
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2,
    ListOrdered,
    Users,
    Share2,
} from "lucide-react";

type BalanceData = {
    userId: string;
    share: number;
    shouldPay: number;
    hasPaid: number;
    balance: number;
    displayName?: string;
};

type Settlement = {
    from: string;
    to: string;
    amount: number;
};

interface GroupBalanceDrawerProps {
    group: GroupWithMembers | null;
    balanceData: {
        totalExpenses: number;
        balances: Record<string, BalanceData>;
        members: unknown[];
    } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserId: string;
    onMarkPaid?: (settlement: Settlement) => void;
}

function calculateSettlement(
    balances: Record<string, BalanceData>
): Settlement[] {
    const settlements: Settlement[] = [];
    const people = Object.values(balances).map(p => ({ ...p }));
    const creditors = people.filter((p) => p.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const debtors = people.filter((p) => p.balance < -0.01).sort((a, b) => a.balance - b.balance);

    let i = 0;
    let j = 0;

    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];
        const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

        if (amount > 0.01) {
            settlements.push({
                from: debtor.userId,
                to: creditor.userId,
                amount,
            });
        }

        creditor.balance -= amount;
        debtor.balance += amount;

        if (Math.abs(creditor.balance) < 0.01) i++;
        if (Math.abs(debtor.balance) < 0.01) j++;
    }

    return settlements;
}

export function GroupBalanceDrawer({
    group,
    balanceData,
    open,
    onOpenChange,
    currentUserId,
    onMarkPaid,
}: GroupBalanceDrawerProps) {
    const { t } = useTranslation();
    const isMobile = useIsMobile();

    if (!group || !balanceData) return null;

    const settlements = calculateSettlement(balanceData.balances);
    const myBalance = balanceData.balances[currentUserId];
    const netBalance = myBalance?.balance || 0;

    const isSettled = Math.abs(netBalance) < 0.01;
    const isOwed = netBalance > 0.01;

    const getStatusConfig = () => {
        if (isSettled) {
            return {
                color: "text-muted-foreground",
                gradientBg: "bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-950 dark:to-slate-900",
                icon: CheckCircle2,
                label: t("all_settled"),
                badgeVariant: "secondary" as const,
            };
        }
        if (isOwed) {
            return {
                color: "text-green-600 dark:text-green-400",
                gradientBg: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900",
                icon: ArrowUpRight,
                label: t("owed_to_you"),
                badgeVariant: "default" as const,
            };
        }
        return {
            color: "text-red-600 dark:text-red-400",
            gradientBg: "bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950 dark:to-rose-900",
            icon: ArrowDownRight,
            label: t("you_owe"),
            badgeVariant: "destructive" as const,
        };
    };

    const config = getStatusConfig();
    const IconComponent = config.icon;

    const mySettlements = settlements.filter(
        (s) => s.from === currentUserId || s.to === currentUserId
    );

    const MainContent = (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Hero Balance Card */}
            <Card className={`${config.gradientBg} border-0 shadow-sm`}>
                <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{group.name}</h3>
                        <Badge variant={config.badgeVariant} className="shrink-0">
                            {config.label}
                        </Badge>
                    </div>

                    {/* Total Expenses */}
                    <p className="text-sm text-muted-foreground">
                        {t("total_expenses")}: <span className="font-medium">€{balanceData.totalExpenses.toFixed(2)}</span>
                    </p>

                    {/* Net Balance - Large Display */}
                    <div className="flex items-center gap-4 pt-2">
                        <div
                            className={`rounded-full p-3 bg-background/50 backdrop-blur-sm border-2 border-current ${config.color}`}
                        >
                            <IconComponent className="h-7 w-7" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-1">{t("net_balance")}</p>
                            <p className={`text-4xl font-bold ${config.color}`}>
                                {isSettled ? (
                                    "€0.00"
                                ) : (
                                    <>
                                        {isOwed ? "+" : ""}€{Math.abs(netBalance).toFixed(2)}
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Accordion Navigation */}
            <Accordion
                type="single"
                collapsible
                defaultValue={mySettlements.length > 0 ? "settlement" : "members"}
                className="w-full"
            >
                {/* Settlement Plan Section */}
                {mySettlements.length > 0 && (
                    <AccordionItem value="settlement" className="border-b-0">
                        <AccordionTrigger className="py-3 hover:no-underline text-sm font-medium">
                            <span className="flex items-center gap-2">
                                <ListOrdered className="h-4 w-4" />
                                {t("settlement_plan")}
                                <Badge className="ml-2">{mySettlements.length}</Badge>
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-2 pt-2 px-1">
                            {mySettlements.map((settlement, index) => {
                                const iAmPayer = settlement.from === currentUserId;
                                const otherUserId = iAmPayer ? settlement.to : settlement.from;
                                const otherBalance = balanceData.balances[otherUserId];

                                return (
                                    <Card
                                        key={index}
                                        className="bg-card/50 backdrop-blur-sm border hover:bg-card/80 transition-colors"
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <UserAvatar userId={otherUserId} className="h-10 w-10 shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-sm truncate">
                                                            {otherUserId === currentUserId
                                                                ? t("you")
                                                                : otherBalance?.displayName || otherUserId.substring(0, 8) + "..."}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {iAmPayer ? t("you_pay") : t("pays_you")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className={`text-right shrink-0 ${iAmPayer ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                                                    <p className="text-lg font-bold">€{settlement.amount.toFixed(2)}</p>
                                                </div>
                                            </div>
                                            {iAmPayer && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => onMarkPaid?.(settlement)}
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                                    {t("mark_as_paid")}
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </AccordionContent>
                    </AccordionItem>
                )}

                {/* Member Details Section */}
                <AccordionItem value="members" className="border-b-0 border-t">
                    <AccordionTrigger className="py-3 hover:no-underline text-sm font-medium">
                        <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {t("member_details")}
                            <Badge className="ml-2">{Object.keys(balanceData.balances).length}</Badge>
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2 px-1">
                        {Object.values(balanceData.balances).map((balance) => (
                            <Card key={balance.userId} className="bg-card/50 backdrop-blur-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <UserAvatar userId={balance.userId} className="h-10 w-10" />
                                            <div>
                                                <span className="font-medium text-sm">
                                                    {balance.userId === currentUserId ? (
                                                        t("you")
                                                    ) : (
                                                        balance.displayName || balance.userId.slice(0, 8) + "..."
                                                    )}
                                                </span>
                                                <Badge className="ml-2 h-5 text-xs">{balance.share}%</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <p className="text-muted-foreground text-xs mb-1">
                                                {t("should_pay")}
                                            </p>
                                            <p className="font-medium">€{balance.shouldPay.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs mb-1">
                                                {t("has_paid")}
                                            </p>
                                            <p className="font-medium">€{balance.hasPaid.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-xs mb-1">
                                                {t("balance")}
                                            </p>
                                            <p
                                                className={`font-bold flex items-center gap-1 ${balance.balance >= 0
                                                    ? "text-green-600 dark:text-green-400"
                                                    : "text-red-600 dark:text-red-400"
                                                    }`}
                                            >
                                                {balance.balance >= 0 ? (
                                                    <ArrowUpRight className="h-3 w-3" />
                                                ) : (
                                                    <ArrowDownRight className="h-3 w-3" />
                                                )}
                                                €{Math.abs(balance.balance).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="h-[85vh] font-sans">
                    <DrawerHeader className="border-b">
                        <DrawerTitle>{t("group_balance")}</DrawerTitle>
                        <DrawerDescription className="sr-only">
                            {t("balance_breakdown_for")} {group.name}
                        </DrawerDescription>
                    </DrawerHeader>

                    {MainContent}

                    <DrawerFooter className="border-t pt-3 pb-3">
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" disabled>
                                <Share2 className="h-4 w-4 mr-2" />
                                {t("share_plan")}
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="default" className="flex-1">
                                    {t("close")}
                                </Button>
                            </DrawerClose>
                        </div>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-6">
                <DialogHeader>
                    <DialogTitle>{t("group_balance")}</DialogTitle>
                    <DialogDescription>
                        {t("balance_breakdown_for")} {group.name}
                    </DialogDescription>
                </DialogHeader>

                {MainContent}

                <DialogFooter className="pt-2">
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                        <Button variant="outline" className="flex-1" disabled>
                            <Share2 className="h-4 w-4 mr-2" />
                            {t("share_plan")}
                        </Button>
                        <Button variant="default" className="flex-1" onClick={() => onOpenChange(false)}>
                            {t("close")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
