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
        resolver: zodResolver(contextSchema) as any,
        defaultValues: {
            name: "",
            description: "",
        },
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                form.reset({
                    name: initialData.name,
                    description: initialData.description || "",
                });
            } else {
                form.reset({
                    name: "",
                    description: "",
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
                            control={form.control as any}
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
                            control={form.control as any}
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
