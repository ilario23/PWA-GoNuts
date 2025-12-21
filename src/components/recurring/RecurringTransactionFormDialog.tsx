import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
    recurringTransactionSchema,
    RecurringTransactionFormValues,
} from "@/lib/schemas";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

interface RecurringTransactionFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: RecurringTransactionFormValues | null;
    activeSection: string;
    setActiveSection: React.Dispatch<React.SetStateAction<string>>;
    groups: GroupWithMembers[];
    contexts: Context[] | undefined;
    user: User | null;
    onSubmit: (data: RecurringTransactionFormValues) => void;
    isSubmitting?: boolean;
}

export function RecurringTransactionFormDialog({
    open,
    onOpenChange,
    initialData,
    activeSection,
    setActiveSection,
    groups,
    contexts,
    user,
    onSubmit,
    isSubmitting,
}: RecurringTransactionFormDialogProps) {
    const { t } = useTranslation();

    const form = useForm<RecurringTransactionFormValues>({
        resolver: zodResolver(recurringTransactionSchema) as any,
        defaultValues: {
            amount: 0,
            description: "",
            type: "expense",
            frequency: "monthly",
            start_date: new Date().toISOString().split("T")[0],
            category_id: "",
            context_id: "",
            group_id: null,
            paid_by_member_id: null,
        },
    });

    const { reset, control, watch, setValue } = form;
    const type = watch("type");
    const groupId = watch("group_id");

    // Reset form when opening/closing or when initialData changes
    useEffect(() => {
        if (open) {
            if (initialData) {
                reset({
                    ...initialData,
                    context_id: initialData.context_id || "", // Ensure string for controlled input
                    group_id: initialData.group_id || null, // Ensure string/null
                });
            } else {
                reset({
                    amount: 0,
                    description: "",
                    type: "expense",
                    frequency: "monthly",
                    start_date: new Date().toISOString().split("T")[0],
                    category_id: "",
                    context_id: "",
                    group_id: null,
                    paid_by_member_id: null,
                });
            }
        }
    }, [open, initialData, reset]);

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
                        {initialData ? t("edit_recurring") : t("add_recurring")}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {initialData
                            ? t("edit_recurring_description")
                            : t("add_recurring_description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                    {/* Type Selection */}
                                    <div className="space-y-2">
                                        <FormLabel>{t("type")}</FormLabel>
                                        <div className="flex gap-2">
                                            {["expense", "income", "investment"].map((tOption) => (
                                                <Button
                                                    key={tOption}
                                                    type="button"
                                                    variant="outline"
                                                    className={`w-full ${type === tOption ? getTypeColor(tOption) : ""
                                                        }`}
                                                    onClick={() => setValue("type", tOption as any)}
                                                >
                                                    {t(tOption)}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Frequency */}
                                    <FormField<RecurringTransactionFormValues, "frequency">
                                        control={control as any}
                                        name="frequency"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("frequency")}</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    value={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t("frequency")} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="daily">{t("daily")}</SelectItem>
                                                        <SelectItem value="weekly">{t("weekly")}</SelectItem>
                                                        <SelectItem value="monthly">{t("monthly")}</SelectItem>
                                                        <SelectItem value="yearly">{t("yearly")}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Amount */}
                                    <FormField<RecurringTransactionFormValues, "amount">
                                        control={control as any}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("amount")}</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.01"
                                                        {...field}
                                                        value={field.value ?? ""}
                                                        onChange={(e) => {
                                                            // Let zod coerce handle it, but keep string for simple input
                                                            field.onChange(e);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Start Date */}
                                    <FormField<RecurringTransactionFormValues, "start_date">
                                        control={control as any}
                                        name="start_date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("start_date")}</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Category */}
                                    <FormField<RecurringTransactionFormValues, "category_id">
                                        control={control as any}
                                        name="category_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("category")}</FormLabel>
                                                <FormControl>
                                                    <CategorySelector
                                                        value={field.value || ""}
                                                        onChange={field.onChange}
                                                        type={type}
                                                        groupId={groupId || null}
                                                        modal
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Description */}
                                    <FormField<RecurringTransactionFormValues, "description">
                                        control={control as any}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("description")}</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </AccordionContent>
                            </AccordionItem>

                            {/* More Options Section */}
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
                                                        const currentGroupId = watch("group_id");
                                                        const currentContextId = watch("context_id");

                                                        const groupName = currentGroupId
                                                            ? groups?.find((g) => g.id === currentGroupId)
                                                                ?.name
                                                            : null;
                                                        const contextName = currentContextId
                                                            ? contexts?.find(
                                                                (c) => c.id === currentContextId
                                                            )?.name
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
                                                <FormField<RecurringTransactionFormValues, "group_id">
                                                    control={control as any}
                                                    name="group_id"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>{t("group")}</FormLabel>
                                                            <Select
                                                                value={field.value || "none"}
                                                                onValueChange={(value) => {
                                                                    field.onChange(value === "none" ? null : value);
                                                                    // Reset paid_by when group changes
                                                                    setValue(
                                                                        "paid_by_member_id",
                                                                        value === "none"
                                                                            ? null
                                                                            : // Default to current user if found in group
                                                                            (() => {
                                                                                const group = groups.find(
                                                                                    (g) => g.id === value
                                                                                );
                                                                                const member = group?.members.find(
                                                                                    (m) => m.user_id === user?.id
                                                                                );
                                                                                return member?.id || null;
                                                                            })()
                                                                    );
                                                                }}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder={t("select_group")} />
                                                                    </SelectTrigger>
                                                                </FormControl>
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
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />

                                                {/* Paid By Selection (Conditional) */}
                                                {groupId && (
                                                    <FormField<RecurringTransactionFormValues, "paid_by_member_id">
                                                        control={control as any}
                                                        name="paid_by_member_id"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>{t("paid_by")}</FormLabel>
                                                                <Select
                                                                    value={field.value || ""}
                                                                    onValueChange={(val) =>
                                                                        field.onChange(val || null)
                                                                    }
                                                                >
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue
                                                                                placeholder={t("select_payer")}
                                                                            />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {groups
                                                                            .find((g) => g.id === groupId)
                                                                            ?.members.map((member) => (
                                                                                <SelectItem
                                                                                    key={member.id}
                                                                                    value={member.id}
                                                                                >
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
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </>
                                        )}

                                        {/* Context Selection */}
                                        {contexts && contexts.length > 0 && (
                                            <FormField<RecurringTransactionFormValues, "context_id">
                                                control={control as any}
                                                name="context_id"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t("context")}</FormLabel>
                                                        <Select
                                                            value={field.value || "none"}
                                                            onValueChange={(value) =>
                                                                field.onChange(value === "none" ? "" : value)
                                                            }
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue
                                                                        placeholder={t("select_context")}
                                                                    />
                                                                </SelectTrigger>
                                                            </FormControl>
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
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                        </Accordion>

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? t("saving") + "..." : t("save")}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
