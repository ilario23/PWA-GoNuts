import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'gonuts_welcome_wizard';
const SYNC_EVENT = 'welcome_wizard_sync';

interface WelcomeWizardState {
    completed: boolean;
    skipped: boolean;
    completedAt: string | null;
}

const defaultState: WelcomeWizardState = {
    completed: false,
    skipped: false,
    completedAt: null,
};

function getStoredState(): WelcomeWizardState {
    if (typeof window === 'undefined') return defaultState;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore errors
    }
    return defaultState;
}

function setStoredState(state: WelcomeWizardState): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Ignore errors
    }
}

// Dispatch custom event to sync all instances
function dispatchSyncEvent(isOpen: boolean) {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { isOpen } }));
}

export function useWelcomeWizard() {
    const [state, setState] = useState<WelcomeWizardState>(defaultState);
    const [isOpen, setIsOpen] = useState(false);

    // Load state on mount and listen for sync events
    useEffect(() => {
        const stored = getStoredState();
        setState(stored);

        // Show wizard if not completed or skipped
        if (!stored.completed && !stored.skipped) {
            setIsOpen(true);
        }

        // Listen for sync events from other instances
        const handleSync = (event: Event) => {
            const customEvent = event as CustomEvent<{ isOpen: boolean }>;
            setIsOpen(customEvent.detail.isOpen);
            // Also refresh state from storage
            setState(getStoredState());
        };

        window.addEventListener(SYNC_EVENT, handleSync);
        return () => window.removeEventListener(SYNC_EVENT, handleSync);
    }, []);

    const complete = useCallback(() => {
        const newState: WelcomeWizardState = {
            completed: true,
            skipped: false,
            completedAt: new Date().toISOString(),
        };
        setState(newState);
        setStoredState(newState);
        setIsOpen(false);
        dispatchSyncEvent(false);
    }, []);

    const skip = useCallback(() => {
        const newState: WelcomeWizardState = {
            completed: false,
            skipped: true,
            completedAt: null,
        };
        setState(newState);
        setStoredState(newState);
        setIsOpen(false);
        dispatchSyncEvent(false);
    }, []);

    const reset = useCallback(() => {
        const newState = defaultState;
        setState(newState);
        setStoredState(newState);
        setIsOpen(true);
        dispatchSyncEvent(true);
    }, []);

    const show = useCallback(() => {
        setIsOpen(true);
        dispatchSyncEvent(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        dispatchSyncEvent(false);
    }, []);

    return {
        isCompleted: state.completed,
        isSkipped: state.skipped,
        completedAt: state.completedAt,
        shouldShow: isOpen,
        complete,
        skip,
        reset,
        show,
        close,
    };
}
