import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthProvider";
import { useGroups } from "@/hooks/useGroups";
import { useContexts } from "@/hooks/useContexts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { CategorySelector } from "@/components/CategorySelector";
import { ListFilter, SlidersHorizontal } from "lucide-react";

// ... (imports remain)

interface TransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: TransactionFormData) => Promise<void>;
    editingTransaction?: {
        id: string;
        amount: number;
        description: string;
        type: "income" | "expense" | "investment";
        category_id: string;
        date: string;
        context_id?: string | null;
        group_id?: string | null;
        // paid_by_user_id removed
        paid_by_member_id?: string | null;
    } | null;
    defaultGroupId?: string | null;
    defaultType?: "income" | "expense" | "investment";
}

export interface TransactionFormData {
    amount: string;
    description: string;
    type: "income" | "expense" | "investment";
    category_id: string;
    date: string;
    context_id: string | null;
    group_id: string | null;
    // paid_by_user_id removed
    paid_by_member_id: string | null;
}

export function TransactionDialog({
    open,
    onOpenChange,
    onSubmit,
    editingTransaction,
    defaultGroupId = null,
    defaultType = "expense",
}: TransactionDialogProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { groups } = useGroups();
    const { contexts } = useContexts();

    const [activeSection, setActiveSection] = useState("main");
    const [formData, setFormData] = useState<TransactionFormData>({
        amount: "",
        description: "",
        type: defaultType,
        category_id: "",
        date: new Date().toISOString().split("T")[0],
        context_id: null,
        group_id: defaultGroupId,
        paid_by_member_id: null, // Initial value, computed if needed
    });

    // Reset form when dialog opens/closes or editing transaction changes
    useEffect(() => {
        if (open && editingTransaction) {
            setFormData({
                amount: editingTransaction.amount.toString(),
                description: editingTransaction.description || "",
                type: editingTransaction.type,
                category_id: editingTransaction.category_id || "",
                date: editingTransaction.date,
                context_id: editingTransaction.context_id || null,
                group_id: editingTransaction.group_id || null,
                paid_by_member_id: editingTransaction.paid_by_member_id || null,
            });
            // Auto-open 'more' if advanced fields are present
            if (editingTransaction.group_id || editingTransaction.context_id) {
                setActiveSection("more");
            } else {
                setActiveSection("main");
            }
        } else if (open && !editingTransaction) {
            setFormData({
                amount: "",
                description: "",
                type: defaultType,
                category_id: "",
                date: new Date().toISOString().split("T")[0],
                context_id: null,
                group_id: defaultGroupId,
                paid_by_member_id: null,
            });
            if (defaultGroupId) {
                setActiveSection("more");
            } else {
                setActiveSection("main");
            }
        }
    }, [open, editingTransaction, defaultGroupId, defaultType]); // removed user?.id dep

    // Attempt to set default paid_by_member_id if group is selected but not set yet
    useEffect(() => {
        if (open && !editingTransaction && formData.group_id && !formData.paid_by_member_id && user?.id && groups) {
            const group = groups.find(g => g.id === formData.group_id);
            const myMember = group?.members.find(m => m.user_id === user.id);
            if (myMember) {
                setFormData(prev => ({ ...prev, paid_by_member_id: myMember.id }));
            }
        }
    }, [open, editingTransaction, formData.group_id, groups, user?.id, formData.paid_by_member_id]);

    // Reset category when type changes (only when creating new transaction)
    useEffect(() => {
        if (!editingTransaction && formData.category_id) {
            setFormData((prev) => ({ ...prev, category_id: "" }));
        }
    }, [formData.type, editingTransaction]);

    // Reset components when group changes
    useEffect(() => {
        if (editingTransaction === null || editingTransaction === undefined) {
            // Logic kept simple
            // If group changes to null, paid_by should reset to null
            if (!formData.group_id) {
                setFormData(prev => ({ ...prev, paid_by_member_id: null }));
            }
        }
    }, [formData.group_id, editingTransaction]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.category_id) {
            alert(t("select_category_required"));
            return;
        }

        // Ensure paid_by_member_id is set if group_id is set
        // If not set via select (e.g. quick add), default to current user's member ID
        let finalData = { ...formData };
        if (finalData.group_id && !finalData.paid_by_member_id && groups && user?.id) {
            const group = groups.find(g => g.id === finalData.group_id);
            const member = group?.members.find(m => m.user_id === user.id);
            if (member) {
                finalData.paid_by_member_id = member.id;
            }
        }

        await onSubmit(finalData);
        onOpenChange(false);
    };

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

    // Helper to handle Payer Selection change
    const handlePayerChange = (memberId: string) => {
        setFormData({
            ...formData,
            paid_by_member_id: memberId,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-lg">
                <DialogHeader>
                    <DialogTitle>
                        {editingTransaction ? t("edit_transaction") : t("add_transaction")}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {editingTransaction
                            ? t("edit_transaction_description") ||
                            "Edit transaction details"
                            : t("add_transaction_description") || "Add a new transaction"}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Accordion
                        type="single"
                        collapsible
                        value={activeSection}
                        onValueChange={setActiveSection}
                        className="w-full"
                    >
                        <AccordionItem value="main" className="border-b-0">
                            <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
                                <span className="flex items-center gap-2">
                                    <ListFilter className="h-4 w-4" />
                                    {t("transaction_details") || "Details"}
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2 px-1">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("type")}</label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`w-full ${formData.type === "expense" ? getTypeColor("expense") : ""
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
                                            onClick={() => setFormData({ ...formData, type: "income" })}
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
                                    <label className="text-sm font-medium">{t("amount")}</label>
                                    <Input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            // Limit to 2 decimal places
                                            const match = value.match(/^-?\d*\.?\d{0,2}$/);
                                            if (match || value === "") {
                                                setFormData({ ...formData, amount: value });
                                            }
                                        }}
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
                                        groupId={formData.group_id}
                                        modal
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("date")}</label>
                                    <Input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) =>
                                            setFormData({ ...formData, date: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("description")}</label>
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

                        {/* More Options Section - Group & Context */}
                        <AccordionItem value="more" className="border-b-0 border-t">
                            <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
                                <span className="flex items-center gap-2">
                                    <SlidersHorizontal className="h-4 w-4" />
                                    {t("more_options") || "More Options"}
                                    {(formData.group_id || formData.context_id) && (
                                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded ml-2">
                                            {
                                                [formData.group_id, formData.context_id].filter(
                                                    Boolean
                                                ).length
                                            }
                                        </span>
                                    )}
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-3 pt-2 px-1">
                                {(groups && groups.length > 0) || (contexts && contexts.length > 0) ? (
                                    <>
                                        {/* Group Selection */}
                                        {groups && groups.length > 0 && (
                                            <>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">
                                                        {t("group")}
                                                    </label>
                                                    <Select
                                                        value={formData.group_id || "none"}
                                                        onValueChange={(value) => {
                                                            const newGroupId = value === "none" ? null : value;
                                                            // When group changes, reset payer to current user (as default Member) if in group
                                                            // or null if none
                                                            let newMemberId: string | null = null;

                                                            if (newGroupId && user?.id && groups) {
                                                                const group = groups.find(g => g.id === newGroupId);
                                                                const member = group?.members.find(m => m.user_id === user.id);
                                                                if (member) {
                                                                    newMemberId = member.id;
                                                                }
                                                            }

                                                            setFormData({
                                                                ...formData,
                                                                group_id: newGroupId,
                                                                paid_by_member_id: newMemberId,
                                                            })
                                                        }}
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
                                                            onValueChange={handlePayerChange}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t("select_payer")} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {groups
                                                                    .find((g) => g.id === formData.group_id)
                                                                    ?.members.map((member) => (
                                                                        <SelectItem
                                                                            key={member.id}
                                                                            value={member.id}
                                                                        >
                                                                            {member.is_guest
                                                                                ? (member.guest_name || "Guest")
                                                                                : (member.user_id === user?.id
                                                                                    ? t("me")
                                                                                    : member.displayName || member.user_id?.substring(0, 8))}
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
                                                            context_id: value === "none" ? null : value,
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t("select_context")} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            {t("no_context") || "No Context"}
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
                                    </>
                                ) : (
                                    <div className="text-sm text-muted-foreground p-2 text-center">
                                        {t("no_additional_options") || "No additional options available"}
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <Button type="submit" className="w-full" autoFocus>
                        {t("save")}
                    </Button>
                </form>
            </DialogContent>
        </Dialog >
    );
}
