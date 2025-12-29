import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { GroupFormValues, groupSchema } from "@/lib/schemas";
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

interface GroupFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: GroupFormValues & { id?: string } | null;
    onSubmit: (data: GroupFormValues) => Promise<void>;
    isSubmitting?: boolean;
}

export function GroupFormDialog({
    open,
    onOpenChange,
    initialData,
    onSubmit,
    isSubmitting = false,
}: GroupFormDialogProps) {
    const { t } = useTranslation();

    const form = useForm<GroupFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(groupSchema) as any,
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

    const handleSubmit = async (data: GroupFormValues) => {
        await onSubmit(data);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {initialData ? t("edit_group") : t("add_group")}
                    </DialogTitle>
                    <DialogDescription>
                        {initialData
                            ? t("edit_group_desc") || "Edit group details"
                            : t("add_group_desc")}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField<GroupFormValues, "name">
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("name")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("group_name_placeholder")}
                                            {...field}
                                            value={field.value ?? ""}
                                            data-testid="group-name-input"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField<GroupFormValues, "description">
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("description")}</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={t("group_description_placeholder")}
                                            {...field}
                                            value={field.value ?? ""}
                                            data-testid="group-description-input"
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
                            <Button type="submit" disabled={isSubmitting} data-testid="save-group-button">
                                {isSubmitting ? t("saving") : t("save")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
