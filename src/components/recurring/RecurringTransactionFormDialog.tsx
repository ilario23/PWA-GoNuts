import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ListFilter, SlidersHorizontal, ChevronUp } from "lucide-react";
import { CategorySelector } from "@/components/CategorySelector";
import { useTranslation } from "react-i18next";
import { User } from "@supabase/supabase-js";
import { Context } from "@/lib/db";
import { GroupWithMembers } from "@/hooks/useGroups";

interface RecurringTransactionFormData {
    amount: string;
    description: string;
    type: "income" | "expense" | "investment";
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    start_date: string;
    category_id: string;
    context_id: string;
    group_id: string | null;
    paid_by_member_id: string | null;
}

interface RecurringTransactionFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingId: string | null;
    formData: RecurringTransactionFormData;
    setFormData: React.Dispatch<React.SetStateAction<RecurringTransactionFormData>>;
    activeSection: string;
    setActiveSection: React.Dispatch<React.SetStateAction<string>>;
    groups: GroupWithMembers[];
    contexts: Context[] | undefined;
    user: User | null;
    onSubmit: (e: React.FormEvent) => void;
}

export function RecurringTransactionFormDialog({
    open,
    onOpenChange,
    editingId,
    formData,
    setFormData,
    activeSection,
    setActiveSection,
    groups,
    contexts,
    user,
    onSubmit,
}: RecurringTransactionFormDialogProps) {
    const { t } = useTranslation();

    const getTypeColor = (type: string) => {
        switch (type) {
            case "expense":
                return "bg-red-500 hover:bg-red-600 text-white";
            case "income":
                return "bg-green-500 hover:bg-green-600 text-white";
            case "investment":
                return "bg-blue-500 hover:bg-blue-600 text-white";
            default:
                return "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] w-[95vw] rounded-lg">
                <DialogHeader>
                    <DialogTitle>
                        {editingId ? t("edit_recurring") : t("add_recurring")}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {editingId
                            ? t("edit_recurring_description")
                            : t("add_recurring_description")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <Accordion
                        type="single"
                        collapsible
                        value={activeSection}
                        onValueChange={(value) => setActiveSection(value || "main")}
                        className="w-full"
                    >
                        <AccordionItem value="main" className="border-b-0">
                            <AccordionTrigger className="hidden">
                                <span className="flex items-center gap-2">
                                    <ListFilter className="h-4 w-4" />
                                    {t("transaction_details")}
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2 px-1">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("type")}</label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`w-full ${formData.type === "expense"
                                                ? getTypeColor("expense")
                                                : ""
                                                }`}
                                            onClick={() =>
                                                setFormData({ ...formData, type: "expense" })
                                            }
                                        >
                                            {t("expense")}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`w-full ${formData.type === "income" ? getTypeColor("income") : ""
                                                }`}
                                            onClick={() =>
                                                setFormData({ ...formData, type: "income" })
                                            }
                                        >
                                            {t("income")}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`w-full ${formData.type === "investment"
                                                ? getTypeColor("investment")
                                                : ""
                                                }`}
                                            onClick={() =>
                                                setFormData({ ...formData, type: "investment" })
                                            }
                                        >
                                            {t("investment")}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        {t("frequency")}
                                    </label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={formData.frequency}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                frequency: e.target.value as any,
                                            })
                                        }
                                    >
                                        <option value="daily">{t("daily")}</option>
                                        <option value="weekly">{t("weekly")}</option>
                                        <option value="monthly">{t("monthly")}</option>
                                        <option value="yearly">{t("yearly")}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("amount")}</label>
                                    <Input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            const match = value.match(/^\d*\.?\d{0,2}$/);
                                            if (match) {
                                                setFormData({ ...formData, amount: value });
                                            }
                                        }}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        {t("start_date")}
                                    </label>
                                    <Input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, start_date: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("category")}</label>
                                    <CategorySelector
                                        value={formData.category_id}
                                        onChange={(value) =>
                                            setFormData({ ...formData, category_id: value })
                                        }
                                        type={formData.type}
                                        groupId={formData.group_id || null}
                                        modal
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        {t("description")}
                                    </label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({ ...formData, description: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {(groups.length > 0 || (contexts && contexts.length > 0)) && (
                            <AccordionItem value="more" className="border-b-0 border-t">
                                <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
                                    <span className="flex items-center gap-2">
                                        {activeSection === "more" ? (
                                            <>
                                                <ChevronUp className="h-4 w-4" />
                                                {t("back_to_details")}
                                            </>
                                        ) : (
                                            <>
                                                <SlidersHorizontal className="h-4 w-4" />
                                                {(() => {
                                                    const groupName = formData.group_id
                                                        ? groups?.find(g => g.id === formData.group_id)?.name
                                                        : null;
                                                    const contextName = formData.context_id
                                                        ? contexts?.find(c => c.id === formData.context_id)?.name
                                                        : null;

                                                    if (groupName && contextName) {
                                                        return `${groupName} • ${contextName}`;
                                                    } else if (groupName) {
                                                        return groupName;
                                                    } else if (contextName) {
                                                        return `${t("personal_expense")} • ${contextName}`;
                                                    } else {
                                                        return t("personal_expense");
                                                    }
                                                })()}
                                            </>
                                        )}
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-3 pt-2 px-1">
                                    {/* Group Selection */}
                                    {groups.length > 0 && (
                                        <>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">
                                                    {t("group")}
                                                </label>
                                                <Select
                                                    value={formData.group_id || "none"}
                                                    onValueChange={(value) =>
                                                        setFormData({
                                                            ...formData,
                                                            group_id: value === "none" ? "" : value,
                                                            paid_by_member_id:
                                                                value === "none"
                                                                    ? ""
                                                                    : (() => {
                                                                        const group = groups.find(
                                                                            (g) => g.id === value
                                                                        );
                                                                        const member = group?.members.find(
                                                                            (m) => m.user_id === user?.id
                                                                        );
                                                                        return member?.id || "";
                                                                    })(),
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t("select_group")} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            {t("personal_expense")}
                                                        </SelectItem>
                                                        {groups.map((group) => (
                                                            <SelectItem key={group.id} value={group.id}>
                                                                {group.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {formData.group_id && (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">
                                                        {t("paid_by")}
                                                    </label>
                                                    <Select
                                                        value={formData.paid_by_member_id || ""}
                                                        onValueChange={(value) =>
                                                            setFormData({
                                                                ...formData,
                                                                paid_by_member_id: value,
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t("select_payer")} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {groups
                                                                .find((g) => g.id === formData.group_id)
                                                                ?.members.map((member) => (
                                                                    <SelectItem key={member.id} value={member.id}>
                                                                        {member.is_guest
                                                                            ? member.guest_name || "Guest"
                                                                            : member.user_id === user?.id
                                                                                ? t("me")
                                                                                : member.displayName ||
                                                                                member.user_id?.substring(0, 8)}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Context Selection */}
                                    {contexts && contexts.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                {t("context")}
                                            </label>
                                            <Select
                                                value={formData.context_id || "none"}
                                                onValueChange={(value) =>
                                                    setFormData({
                                                        ...formData,
                                                        context_id: value === "none" ? "" : value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t("select_context")} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">
                                                        {t("no_contexts")}
                                                    </SelectItem>
                                                    {contexts.map((ctx) => (
                                                        <SelectItem key={ctx.id} value={ctx.id}>
                                                            {ctx.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        )}
                    </Accordion>

                    <Button type="submit" className="w-full" autoFocus>
                        {t("save")}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
