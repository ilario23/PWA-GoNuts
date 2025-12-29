import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ListFilter, SlidersHorizontal, ChevronUp } from "lucide-react";
import { CategorySelector } from "@/components/CategorySelector";
import { IconSelector } from "@/components/IconSelector";
import { useTranslation } from "react-i18next";
import { Group } from "@/lib/db";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, CategoryFormValues } from "@/lib/schemas";

interface CategoryFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData: CategoryFormValues | null;
    editingId: string | null; // Used to exclude self from parent selector
    groups: Group[];
    onSubmit: (data: CategoryFormValues) => void;
    isUsed?: boolean;
}


export function CategoryFormDialog({
    open,
    onOpenChange,
    initialData,
    editingId,
    groups,
    onSubmit,
    isUsed = false,
}: CategoryFormDialogProps) {
    const { t } = useTranslation();
    const [activeSection, setActiveSection] = useState("main");

    const form = useForm<CategoryFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(categorySchema) as any,
        defaultValues: {
            name: "",
            color: "#000000",
            type: "expense",
            icon: "",
            parent_id: null,
            active: true,
            budget: 0,
            group_id: null,
        },
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                form.reset(initialData);
                // Logic to set active section based on data
                if (
                    initialData.group_id ||
                    (initialData.budget && Number(initialData.budget) > 0) ||
                    initialData.active === false
                ) {
                    setActiveSection("more");
                } else {
                    setActiveSection("main");
                }
            } else {
                form.reset({
                    name: "",
                    color: "#000000",
                    type: "expense",
                    icon: "",
                    parent_id: null,
                    active: true,
                    budget: 0,
                    group_id: null,
                });
                setActiveSection("main");
            }
        }
    }, [open, initialData, form]);

    const watchedGroupId = form.watch("group_id");
    const watchedName = form.watch("name");
    const watchedIcon = form.watch("icon");
    const watchedType = form.watch("type");

    // Reset parent_id when group_id changes (original logic)
    // "if (formData.name || formData.icon)" was the condition in original.
    // This seems to implied: "if we are editing or creating and have started typing, and group changes, reset parent"
    // Let's implement it similar to the original effect.
    useEffect(() => {
        if (watchedName || watchedIcon) {
            form.setValue("parent_id", null);
        }
    }, [watchedGroupId, form]); // Missing watchedName/Icon dependecy but original likely relied on closure or just group change trigger. 
    // Actually, including watchedName/Icon would trigger reset on every keystroke if group is set? No. only when group changes.
    // The dependency array should be [watchedGroupId].

    const handleFormSubmit = (data: CategoryFormValues) => {
        // Validation for icon is handled by schema (optional?)
        // Original code had manual check: if (!formData.icon) alert...
        // Schema currently says icon is optional in `categorySchema`. 
        // Wait, original: `if (!formData.icon) { alert(t("icon_required")); return; }`
        // I should make icon required in schema or check here.
        // Let's update component to handle it or rely on z.string().min(1) if I updated schema.
        // I defined icon as optional in schema steps ago. I should probably treat it as required if my schema allows optional. 
        // But let's check input validation manually if schema is loose.
        if (!data.icon) {
            // RHF doesn't show alert, we should maybe set error or alert.
            // Better: define it required in schema. But I already wrote schema.
            // I can use setError manually.
            form.setError("icon", { type: "manual", message: t("icon_required") || "Icon is required" });
            return;
        }

        onSubmit(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] w-[95vw] rounded-lg">
                <DialogHeader>
                    <DialogTitle>
                        {editingId ? t("edit_category") : t("add_category")}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {editingId
                            ? t("edit_category_description")
                            : t("add_category_description")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
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
                                        {t("category_details")}
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 px-1">
                                    {/* NAME */}
                                    <FormField<CategoryFormValues, "name">
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("name")}</FormLabel>
                                                <FormControl>
                                                    <Input {...field} required value={field.value || ""} data-testid="category-name-input" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* COLOR */}
                                    <FormField<CategoryFormValues, "color">
                                        control={form.control}
                                        name="color"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("color")}</FormLabel>
                                                <FormControl>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type="color"
                                                            {...field}
                                                            // Ensure value is hex color
                                                            value={field.value || "#000000"}
                                                            className="h-10 w-20 p-1"
                                                            data-testid="category-color-picker"
                                                        />
                                                        <Input
                                                            {...field}
                                                            value={field.value || ""}
                                                            className="flex-1"
                                                        />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* TYPE */}
                                    <FormField<CategoryFormValues, "type">
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("type")}</FormLabel>
                                                <FormControl>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            disabled={isUsed}
                                                            className={`w-full ${field.value === "expense"
                                                                ? "bg-red-500 hover:bg-red-600 text-white"
                                                                : ""
                                                                }`}
                                                            onClick={() => field.onChange("expense")}
                                                            data-testid="category-type-expense"
                                                        >
                                                            {t("expense")}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            disabled={isUsed}
                                                            className={`w-full ${field.value === "income"
                                                                ? "bg-green-500 hover:bg-green-600 text-white"
                                                                : ""
                                                                }`}
                                                            onClick={() => field.onChange("income")}
                                                            data-testid="category-type-income"
                                                        >
                                                            {t("income")}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            disabled={isUsed}
                                                            className={`w-full ${field.value === "investment"
                                                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                                                : ""
                                                                }`}
                                                            onClick={() => field.onChange("investment")}
                                                            data-testid="category-type-investment"
                                                        >
                                                            {t("investment")}
                                                        </Button>
                                                    </div>
                                                </FormControl>
                                                {isUsed && <p className="text-xs text-muted-foreground mt-1">{t("category_in_use_type_locked", "Cannot change type because this category is in use.")}</p>}
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* ICON */}
                                    <FormField<CategoryFormValues, "icon">
                                        control={form.control}
                                        name="icon"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("icon")}</FormLabel>
                                                <FormControl>
                                                    <IconSelector
                                                        value={field.value || ""}
                                                        onChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* PARENT CATEGORY */}
                                    <FormField<CategoryFormValues, "parent_id">
                                        control={form.control}
                                        name="parent_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t("parent_category")}</FormLabel>
                                                <FormControl>
                                                    <CategorySelector
                                                        value={field.value || ""}
                                                        onChange={(val) => field.onChange(val || null)}
                                                        type={watchedType}
                                                        excludeId={editingId || undefined}
                                                        groupId={watchedGroupId || null}
                                                        modal
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </AccordionContent>
                            </AccordionItem>

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
                                                    const groupName = watchedGroupId
                                                        ? groups?.find(g => g.id === watchedGroupId)?.name
                                                        : null;

                                                    return groupName || t("personal_category");
                                                })()}
                                            </>
                                        )}
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2 px-1">
                                    {/* GROUP SELECTION */}
                                    {groups.length > 0 && (
                                        <FormField<CategoryFormValues, "group_id">
                                            control={form.control}
                                            name="group_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("group")}</FormLabel>
                                                    <Select
                                                        value={field.value || "none"}
                                                        onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                                                        disabled={isUsed}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={t("select_group")} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none">
                                                                {t("personal_category")}
                                                            </SelectItem>
                                                            {groups.map((group) => (
                                                                <SelectItem key={group.id} value={group.id}>
                                                                    {group.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {isUsed && <p className="text-xs text-muted-foreground mt-1">{t("category_in_use_group_locked", "Cannot change group because this category is in use.")}</p>}
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {/* BUDGET */}
                                    {watchedType === "expense" && (
                                        <FormField<CategoryFormValues, "budget">
                                            control={form.control}
                                            name="budget"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t("budget")}</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            {...field}
                                                            placeholder="0.00"
                                                            value={field.value ?? ""}
                                                            onChange={e => field.onChange(e.target.value)} // ensure string usually or coerce in schema
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {/* ACTIVE */}
                                    <FormField<CategoryFormValues, "active">
                                        control={form.control}
                                        name="active"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">
                                                        {t("active")}
                                                    </FormLabel>
                                                    <div className="text-[0.8rem] text-muted-foreground">
                                                        {t("active_description")}
                                                    </div>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <Button type="submit" className="w-full" autoFocus data-testid="save-category-button">
                            {t("save")}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
