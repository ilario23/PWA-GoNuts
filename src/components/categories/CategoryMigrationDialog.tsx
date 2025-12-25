import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CategorySelector } from "@/components/CategorySelector";
import { useTranslation } from "react-i18next";
import type { Category } from "@/lib/db";

interface CategoryMigrationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    migrationData: {
        oldCategoryId: string;
        transactionCount: number;
        recurringCount: number;
    } | null;
    migrationTargetId: string;
    setMigrationTargetId: (id: string) => void;
    categories: Category[] | undefined;
    onResolve: () => void;
    onDeleteAll: () => void;
}

export function CategoryMigrationDialog({
    open,
    onOpenChange,
    migrationData,
    migrationTargetId,
    setMigrationTargetId,
    categories,
    onResolve,
    onDeleteAll,
}: CategoryMigrationDialogProps) {
    const { t } = useTranslation();

    const oldCategory = categories?.find(
        (c) => c.id === migrationData?.oldCategoryId
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("delete_category_with_data")}</DialogTitle>
                    <DialogDescription>
                        {t("category_has_data_warning", {
                            transactions: migrationData?.transactionCount || 0,
                            recurring: migrationData?.recurringCount || 0,
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <label className="text-sm font-medium mb-2 block">
                        {t("select_new_category")}
                    </label>
                    <CategorySelector
                        value={migrationTargetId}
                        onChange={setMigrationTargetId}
                        excludeId={migrationData?.oldCategoryId}
                        type={oldCategory?.type}
                        groupId={oldCategory?.group_id}
                        modal
                    />
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("cancel")}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={onResolve}
                        disabled={!migrationTargetId}
                    >
                        {t("migrate_and_delete")}
                    </Button>
                </div>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            {t("or")}
                        </span>
                    </div>
                </div>

                <div className="p-4 border border-destructive rounded-md">
                    <h4 className="text-sm font-medium text-destructive mb-2">
                        {t("danger_zone")}
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                        {t("delete_category_data_desc")}
                    </p>
                    <Button
                        variant="destructive"
                        className="w-full"
                        onClick={onDeleteAll}
                    >
                        {t("delete_all_transactions")}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
