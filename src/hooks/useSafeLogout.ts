import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { useSync } from "@/hooks/useSync";
import { useNavigate } from "react-router-dom";

export function useSafeLogout() {
    const { signOut } = useAuth();
    const { pendingCount } = useSync();
    const navigate = useNavigate();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const performLogout = useCallback(async () => {
        await signOut();
        navigate("/auth");
    }, [signOut, navigate]);

    const requestLogout = useCallback((requireConfirmation = false) => {
        if (pendingCount > 0 || requireConfirmation) {
            setIsDialogOpen(true);
        } else {
            performLogout();
        }
    }, [pendingCount, performLogout]);

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
