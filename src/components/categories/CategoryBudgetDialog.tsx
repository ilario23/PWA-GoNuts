import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CategoryBudgetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    budgetAmount: string;
    setBudgetAmount: (value: string) => void;
    hasExistingBudget: boolean;
    onSave: () => void;
    onRemove: () => void;
}

export function CategoryBudgetDialog({
    open,
    onOpenChange,
    budgetAmount,
    setBudgetAmount,
    hasExistingBudget,
    onSave,
    onRemove,
}: CategoryBudgetDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm w-[95vw] rounded-lg">
                <DialogHeader>
                    <DialogTitle>{t("set_budget")}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {t("set_budget_description")}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t("monthly_limit")}</label>
                        <Input
                            type="number"
                            value={budgetAmount}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || parseFloat(value) >= 0) {
                                    setBudgetAmount(e.target.value);
                                }
                            }}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <div className="flex gap-2">
                        {hasExistingBudget && (
                            <Button
                                variant="destructive"
                                onClick={onRemove}
                                className="flex-1"
                            >
                                <X className="h-4 w-4 mr-2" />
                                {t("remove_budget")}
                            </Button>
                        )}
                        <Button
                            onClick={onSave}
                            disabled={!budgetAmount}
                            className="flex-1"
                        >
                            {t("save")}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
