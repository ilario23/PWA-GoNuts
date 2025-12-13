import React, { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { AlertTriangle, LogOut } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SafeLogoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    pendingCount: number;
}

export function SafeLogoutDialog({
    open,
    onOpenChange,
    onConfirm,
    pendingCount,
}: SafeLogoutDialogProps) {
    const { t } = useTranslation();
    const [confirmedLoss, setConfirmedLoss] = useState(false);

    const hasPendingChanges = pendingCount > 0;

    // Reset confirmation state when dialog closes
    React.useEffect(() => {
        if (!open) {
            setConfirmedLoss(false);
        }
    }, [open]);

    const handleConfirm = (e: React.MouseEvent) => {
        e.preventDefault();
        onConfirm();
        onOpenChange(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        {hasPendingChanges ? (
                            <>
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                {t("logout_warning_pending_title")}
                            </>
                        ) : (
                            <>
                                <LogOut className="h-5 w-5" />
                                {t("confirm_logout")}
                            </>
                        )}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        {hasPendingChanges
                            ? t("logout_warning_pending_desc", { count: pendingCount })
                            : t("confirm_logout_desc")}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {hasPendingChanges && (
                    <div className="flex items-center space-x-2 py-4">
                        <Switch
                            id="confirm-loss"
                            checked={confirmedLoss}
                            onCheckedChange={setConfirmedLoss}
                        />
                        <Label
                            htmlFor="confirm-loss"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-destructive"
                        >
                            {t("logout_loss_confirmation")}
                        </Label>
                    </div>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={hasPendingChanges && !confirmedLoss}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {t("logout")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
