import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SessionExpiredModalProps {
    open: boolean;
    onLogin: () => void;
}

export function SessionExpiredModal({ open, onLogin }: SessionExpiredModalProps) {
    const { t } = useTranslation();

    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="sm:max-w-[425px]">
                <AlertDialogHeader className="flex flex-col items-center text-center">
                    <div className="rounded-full bg-amber-100 p-3 mb-2 dark:bg-amber-900/30">
                        <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <AlertDialogTitle className="text-xl">
                        {t("session_expired", "Session Expired")}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center pt-2">
                        {t(
                            "session_expired_soft_description",
                            "Your session has expired. Please log in again to continue syncing your data. Your local changes are safe."
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center mt-4">
                    <AlertDialogAction onClick={onLogin} className="w-full sm:w-auto min-w-[120px]">
                        {t("login", "Log In")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
