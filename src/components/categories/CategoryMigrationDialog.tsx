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
}

export function CategoryMigrationDialog({
    open,
    onOpenChange,
    migrationData,
    migrationTargetId,
    setMigrationTargetId,
    categories,
    onResolve,
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
            </DialogContent>
        </Dialog>
    );
}
