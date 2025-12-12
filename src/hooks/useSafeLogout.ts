import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSync } from "@/hooks/useSync";
import { useNavigate } from "react-router-dom";

export function useSafeLogout() {
    const { signOut } = useAuth();
    const { pendingCount } = useSync();
    const navigate = useNavigate();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const requestLogout = useCallback((requireConfirmation = false) => {
        if (pendingCount > 0 || requireConfirmation) {
            setIsDialogOpen(true);
        } else {
            performLogout();
        }
    }, [pendingCount]);

    const performLogout = async () => {
        await signOut();
        navigate("/auth");
    };

    const confirmLogout = async () => {
        await performLogout();
        setIsDialogOpen(false);
    };

    const cancelLogout = () => {
        setIsDialogOpen(false);
    };

    return {
        handleLogout: requestLogout, // Expose as handleLogout for simplicity
        isDialogOpen,
        setIsDialogOpen, // Expose setter if needed
        confirmLogout,
        cancelLogout,
        pendingCount
    };
}
