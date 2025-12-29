import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { ContextFormValues, contextSchema } from "@/lib/schemas";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";

interface ContextFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: ContextFormValues & { id?: string } | null;
    onSubmit: (data: ContextFormValues) => Promise<void>;
    isSubmitting?: boolean;
}

export function ContextFormDialog({
    open,
    onOpenChange,
    initialData,
    onSubmit,
    isSubmitting = false,
}: ContextFormDialogProps) {
    const { t } = useTranslation();

    const form = useForm<ContextFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(contextSchema) as any,
        defaultValues: {
            name: "",
            description: "",
            active: true,
        },
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                form.reset({
                    name: initialData.name,
                    description: initialData.description || "",
                    active: initialData.active !== undefined ? initialData.active : true,
                });
            } else {
                form.reset({
                    name: "",
                    description: "",
                    active: true,
                });
            }
        }
    }, [open, initialData, form]);

    const handleSubmit = async (data: ContextFormValues) => {
        await onSubmit(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {initialData ? t("edit_context") : t("add_context")}
                    </DialogTitle>
                    <DialogDescription>
                        {initialData
                            ? t("edit_context_desc") || "Edit context details"
                            : t("add_context_desc")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField<ContextFormValues, "name">
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("name")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("context_name_placeholder")}
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField<ContextFormValues, "description">
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("description")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("context_description_placeholder")}
                                            {...field}
                                            value={field.value ?? ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField<ContextFormValues, "active">
                            control={form.control}
                            name="active"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">{t("active")}</FormLabel>
                                        <div className="text-sm text-muted-foreground">
                                            {t("context_active_desc") || "Enable or disable this context"}
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

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                {t("cancel")}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? t("saving") : t("save")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
