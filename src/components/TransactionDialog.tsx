import { useState, useEffect, useRef } from "react";
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { CategorySelector } from "@/components/CategorySelector";
import { SlidersHorizontal, Calculator as CalculatorIcon, ChevronUp } from "lucide-react";
import { Calculator } from "@/components/Calculator";
import { Label } from "@/components/ui/label";
import { useCategoryBudgets } from "@/hooks/useCategoryBudgets";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema, TransactionFormValues } from "@/lib/schemas";

// Re-export this for backward compatibility if needed, though RHF generic handles it
export type TransactionFormData = TransactionFormValues;

interface TransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: TransactionFormValues) => Promise<void>;
    editingTransaction?: {
        id: string;
        amount: number;
        description: string;
        type: "income" | "expense" | "investment";
        category_id: string;
        date: string;
        context_id?: string | null;
        group_id?: string | null;
        paid_by_member_id?: string | null;
    } | null;
    defaultGroupId?: string | null;
    defaultType?: "income" | "expense" | "investment";
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

    // Calculator State
    const [calcState, setCalcState] = useState<{
        prevValue: number | null;
        operation: string | null;
    }>({ prevValue: null, operation: null });
    const [showCalculator, setShowCalculator] = useState(false);
    const amountInputRef = useRef<HTMLInputElement>(null);
    const calculatorContainerRef = useRef<HTMLDivElement>(null);

    // Budget Hook
    const { getBudgetForCategory } = useCategoryBudgets();

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema) as any,
        defaultValues: {
            amount: 0,
            description: "",
            type: defaultType,
            category_id: "",
            date: new Date().toISOString().split("T")[0],
            context_id: null,
            group_id: defaultGroupId,
            paid_by_member_id: null,
        },
    });

    // Reset/Init form
    useEffect(() => {
        if (open) {
            if (editingTransaction) {
                form.reset({
                    amount: editingTransaction.amount,
                    description: editingTransaction.description || "",
                    type: editingTransaction.type,
                    category_id: editingTransaction.category_id || "",
                    date: editingTransaction.date,
                    context_id: editingTransaction.context_id || null,
                    group_id: editingTransaction.group_id || null,
                    paid_by_member_id: editingTransaction.paid_by_member_id || null,
                });
                if (editingTransaction.group_id || editingTransaction.context_id) {
                    setActiveSection("more");
                } else {
                    setActiveSection("main");
                }
            } else {
                form.reset({
                    amount: 0, // String input via controlled component needs handling or default to 0/empty
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
            // Reset calculator
            setCalcState({ prevValue: null, operation: null });
            setShowCalculator(false);
        }
    }, [open, editingTransaction, defaultGroupId, defaultType, form]);

    // Watched values for effects
    const watchedGroupId = form.watch("group_id");
    const watchedType = form.watch("type");
    const watchedCategoryId = form.watch("category_id");
    const watchedAmount = form.watch("amount");

    // Attempt to set default paid_by_member_id if group is selected but not set yet
    useEffect(() => {
        const currentPaidBy = form.getValues("paid_by_member_id");
        if (open && !editingTransaction && watchedGroupId && !currentPaidBy && user?.id && groups) {
            const group = groups.find(g => g.id === watchedGroupId);
            const myMember = group?.members.find(m => m.user_id === user.id);
            if (myMember) {
                form.setValue("paid_by_member_id", myMember.id);
            }
        }
    }, [open, editingTransaction, watchedGroupId, groups, user?.id, form]);

    // Reset category when type changes (only when creating new transaction)
    useEffect(() => {
        if (!editingTransaction && watchedCategoryId) {
            // Check if current category is valid for new type? 
            // The original logic simply reset it.
            // form.setValue("category_id", ""); 
            // Actually, keep it simple: if type changes, we might want to clear category if it doesn't match type
            // But let's stick to original behavior:
            form.setValue("category_id", "");
        }
    }, [watchedType, editingTransaction, form]);

    // Reset paid_by when group changes to null/undefined
    useEffect(() => {
        if (editingTransaction === null || editingTransaction === undefined) {
            if (!watchedGroupId) {
                form.setValue("paid_by_member_id", null);
            }
        }
    }, [watchedGroupId, editingTransaction, form]);

    const handleFormSubmit = async (data: TransactionFormValues) => {
        // Ensure paid_by_member_id is set if group_id is set
        // If not set via select (e.g. quick add), default to current user's member ID
        let finalData = { ...data };
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

    const performCalculation = (currentValue: number, prevValue: number, op: string) => {
        switch (op) {
            case "+": return prevValue + currentValue;
            case "-": return prevValue - currentValue;
            case "*": return prevValue * currentValue;
            case "/": return prevValue / currentValue;
            default: return currentValue;
        }
    };

    const handleOperation = (op: string) => {
        // Get current value from form
        const currentVal = Number(form.getValues("amount"));
        if (isNaN(currentVal)) return;

        if (calcState.prevValue !== null && calcState.operation) {
            const result = performCalculation(currentVal, calcState.prevValue, calcState.operation);
            setCalcState({ prevValue: result, operation: op });
            // Clear visible input to be ready for next number? 
            // In original logic: setFormData(prev => ({ ...prev, amount: "" }));
            // Here, we can set amount to 0 or keep it? Original cleared it. RHF works with numbers usually. 
            // If we set it to 0, user sees 0. If we effectively want "empty", we might need to handle that or just select the text.
            // Let's set to 0 for now and maybe select it? Or rely on user typing.
            form.setValue("amount", 0);
        } else {
            setCalcState({ prevValue: currentVal, operation: op });
            form.setValue("amount", 0);
        }

        amountInputRef.current?.focus();
    };

    const handleEqual = () => {
        const currentVal = Number(form.getValues("amount"));
        if (isNaN(currentVal) || calcState.prevValue === null || !calcState.operation) return;

        const result = performCalculation(currentVal, calcState.prevValue, calcState.operation);
        const formatted = Math.round(result * 100) / 100;

        form.setValue("amount", formatted);
        setCalcState({ prevValue: null, operation: null });

        amountInputRef.current?.focus();
    };

    const handleBlur = (e: React.FocusEvent) => {
        if (
            calculatorContainerRef.current &&
            !calculatorContainerRef.current.contains(e.relatedTarget as Node)
        ) {
            setShowCalculator(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] w-[95vw] rounded-lg">
                <DialogHeader>
                    <DialogTitle>
                        {editingTransaction ? t("edit_transaction") : t("add_transaction")}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {editingTransaction
                            ? t("edit_transaction_description")
                            : t("add_transaction_description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                        <Accordion
                            type="single"
                            collapsible
                            value={activeSection}
                            onValueChange={(val) => setActiveSection(val || "main")}
                            className="w-full"
                        >
                            <AccordionItem value="main" className="border-b-0">
                                <AccordionTrigger className="hidden">
                                    {t("transaction_details")}
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 px-1">
                                    {/* TYPE */}
                                    <FormField<TransactionFormValues, "type">
                                        control={form.control as any}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <FormLabel>{t("type")}</FormLabel>
                                                <FormControl>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={`w-full ${field.value === "expense" ? getTypeColor("expense") : ""}`}
                                                            onClick={() => field.onChange("expense")}
                                                        >
                                                            {t("expense")}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={`w-full ${field.value === "income" ? getTypeColor("income") : ""}`}
                                                            onClick={() => field.onChange("income")}
                                                        >
                                                            {t("income")}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={`w-full ${field.value === "investment" ? getTypeColor("investment") : ""}`}
                                                            onClick={() => field.onChange("investment")}
                                                        >
                                                            {t("investment")}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* AMOUNT & CALCULATOR */}
                                    <div
                                        className="space-y-2"
                                        ref={calculatorContainerRef}
                                        onBlur={handleBlur}
                                    >
                                        <div className="flex justify-between items-center">
                                            <Label className="text-sm font-medium">{t("amount")}</Label>
                                            {calcState.prevValue !== null && calcState.operation && (
                                                <span className="text-xs text-muted-foreground animate-pulse">
                                                    {calcState.prevValue} {calcState.operation} ...
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <FormField<TransactionFormValues, "amount">
                                                control={form.control as any}
                                                name="amount"
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                ref={(e) => {
                                                                    field.ref(e);
                                                                    // @ts-ignore
                                                                    amountInputRef.current = e;
                                                                }}
                                                                type="number"
                                                                inputMode="decimal"
                                                                step="0.01"
                                                                placeholder={calcState.operation ? "..." : "0.00"}
                                                                required
                                                                value={field.value ?? ""}
                                                                onChange={(e) => {
                                                                    // Handle raw input if needed, but RHF number coercion works usually
                                                                    field.onChange(e);
                                                                }}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <Button
                                                type="button"
                                                variant={showCalculator ? "secondary" : "outline"}
                                                size="icon"
                                                className="shrink-0"
                                                onClick={() => {
                                                    const newState = !showCalculator;
                                                    setShowCalculator(newState);
                                                    if (newState) {
                                                        setTimeout(() => amountInputRef.current?.focus(), 0);
                                                    }
                                                }}
                                            >
                                                <CalculatorIcon className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div
                                            className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${showCalculator ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                                }`}
                                        >
                                            <div className="overflow-hidden">
                                                <div className="pt-1">
                                                    <Calculator
                                                        onOperation={handleOperation}
                                                        onEqual={handleEqual}
                                                        activeOperation={calcState.operation}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CATEGORY */}
                                    <FormField<TransactionFormValues, "category_id">
                                        control={form.control as any}
                                        name="category_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("category")}</FormLabel>
                                                <FormControl>
                                                    <CategorySelector
                                                        value={field.value || ""}
                                                        onChange={field.onChange}
                                                        type={watchedType}
                                                        groupId={watchedGroupId}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* DATE */}
                                    <FormField<TransactionFormValues, "date">
                                        control={form.control as any}
                                        name="date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("date")}</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} value={field.value ?? ""} required />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* DESCRIPTION */}
                                    <FormField<TransactionFormValues, "description">
                                        control={form.control as any}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("description")}</FormLabel>
                                                <FormControl>
                                                    {/* Ensure value is never null/undefined if we controlled it */}
                                                    <Input {...field} value={field.value || ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* BUDGET FEEDBACK */}
                                    {watchedCategoryId && watchedType === "expense" && (() => {
                                        const budget = getBudgetForCategory(watchedCategoryId);
                                        if (!budget || budget.amount <= 0) return null;

                                        const amount = Number(watchedAmount) || 0;
                                        let currentSpent = budget.spent;
                                        if (editingTransaction && editingTransaction.category_id === watchedCategoryId) {
                                            const oldAmount = editingTransaction.amount;
                                            currentSpent = Math.max(0, currentSpent - oldAmount);
                                        }

                                        const projectedSpent = currentSpent + amount;
                                        const remainingBefore = budget.amount - currentSpent;
                                        const remainingAfter = budget.amount - projectedSpent;
                                        const isOver = remainingAfter < 0;
                                        const willBeOver = !budget.isOverBudget && isOver;

                                        if (remainingBefore <= 0) {
                                            return (
                                                <div className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-900 mt-1">
                                                    {t("budget_feedback_exceeded", { amount: Math.abs(remainingAfter).toFixed(2) })}
                                                </div>
                                            );
                                        }
                                        if (willBeOver) {
                                            return (
                                                <div className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded border border-amber-200 dark:border-amber-900 mt-1">
                                                    {t("budget_feedback_will_exceed", { amount: Math.abs(remainingAfter).toFixed(2) })}
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950/20 p-2 rounded border border-green-200 dark:border-green-900 mt-1">
                                                {t("budget_feedback_remaining", { amount: remainingAfter.toFixed(2) })}
                                            </div>
                                        );
                                    })()}

                                </AccordionContent>
                            </AccordionItem>

                            {/* MORE OPTIONS */}
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
                                                    const groupId = form.getValues("group_id");
                                                    const contextId = form.getValues("context_id");

                                                    const groupName = groupId
                                                        ? groups?.find(g => g.id === groupId)?.name
                                                        : null;
                                                    const contextName = contextId
                                                        ? contexts?.find(c => c.id === contextId)?.name
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
                                    {(groups && groups.length > 0) || (contexts && contexts.length > 0) ? (
                                        <>
                                            {/* GROUP SELECTION */}
                                            {groups && groups.length > 0 && (
                                                <>
                                                    <FormField<TransactionFormValues, "group_id">
                                                        control={form.control as any}
                                                        name="group_id"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-2">
                                                                <FormLabel>{t("group")}</FormLabel>
                                                                <Select
                                                                    value={field.value || "none"}
                                                                    onValueChange={(value) => {
                                                                        const newVal = value === "none" ? null : value;
                                                                        field.onChange(newVal);
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

                                                    {watchedGroupId && (
                                                        <FormField<TransactionFormValues, "paid_by_member_id">
                                                            control={form.control as any}
                                                            name="paid_by_member_id"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-2">
                                                                    <FormLabel>{t("paid_by")}</FormLabel>
                                                                    <Select
                                                                        value={field.value || ""}
                                                                        onValueChange={field.onChange}
                                                                    >
                                                                        <FormControl>
                                                                            <SelectTrigger>
                                                                                <SelectValue placeholder={t("select_payer")} />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent>
                                                                            {groups
                                                                                .find((g) => g.id === watchedGroupId)
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
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    )}
                                                </>
                                            )}

                                            {/* CONTEXT SELECTION */}
                                            {contexts && contexts.length > 0 && (
                                                <FormField<TransactionFormValues, "context_id">
                                                    control={form.control as any}
                                                    name="context_id"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-2">
                                                            <FormLabel>{t("context")}</FormLabel>
                                                            <Select
                                                                value={field.value || "none"}
                                                                onValueChange={(value) => {
                                                                    field.onChange(value === "none" ? null : value);
                                                                }}
                                                            >
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder={t("select_context")} />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="none">
                                                                        {t("no_contexts")}
                                                                    </SelectItem>
                                                                    {contexts
                                                                        .filter(c => c.active !== 0 || c.id === field.value)
                                                                        .map((ctx) => (
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
                                        </>
                                    ) : (
                                        <div className="text-sm text-muted-foreground p-2 text-center">
                                            {t("no_additional_options")}
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <Button type="submit" className="w-full" autoFocus>
                            {t("save")}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
