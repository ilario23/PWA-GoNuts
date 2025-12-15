
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WelcomeWizard } from "../WelcomeWizard";

// Mocks
jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: "en", changeLanguage: jest.fn() },
    }),
}));

jest.mock("@/hooks/useSettings", () => ({
    useSettings: () => ({
        settings: { currency: "EUR", theme: "light" },
        updateSettings: jest.fn(),
    }),
}));

jest.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({
        user: { id: "test-user" },
    }),
}));

jest.mock("@/hooks/useProfiles", () => ({
    useProfile: () => ({
        full_name: "Test User",
    }),
    useUpdateProfile: () => ({
        updateProfile: jest.fn(),
    }),
}));

jest.mock("canvas-confetti", () => jest.fn());

// ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

describe("WelcomeWizard", () => {
    const onComplete = jest.fn();
    const onSkip = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders welcome step initially", () => {
        render(
            <WelcomeWizard open={true} onComplete={onComplete} onSkip={onSkip} />
        );
        expect(screen.getAllByText("welcome.step_welcome_title").length).toBeGreaterThan(0);
    });

    it("navigates to setup step and allows interaction", async () => {
        render(
            <WelcomeWizard open={true} onComplete={onComplete} onSkip={onSkip} />
        );

        // Click next
        const nextBtn = screen.getByText("welcome.next");
        fireEvent.click(nextBtn);

        // Should be on setup step
        await waitFor(() => {
            expect(screen.getAllByText("welcome.step_setup_title").length).toBeGreaterThan(0);
        }, { timeout: 2000 });

        // Check inputs exist
        expect(screen.getByPlaceholderText("welcome.your_name")).toBeDefined();
    });

    it("calls onComplete when finished", async () => {
        render(
            <WelcomeWizard open={true} onComplete={onComplete} onSkip={onSkip} />
        );

        // Fast forward through steps (9 steps total currently)
        const nextBtn = screen.getByText("welcome.next");

        // Step 1 -> 2 (Setup)
        fireEvent.click(nextBtn);
        // Step 2 -> 3 (Dashboard)
        fireEvent.click(nextBtn);
        // Step 3 -> 4 (Transactions)
        fireEvent.click(nextBtn);
        // Step 4 -> 5 (Categories)
        fireEvent.click(nextBtn);
        // Step 5 -> 6 (Contexts)
        fireEvent.click(nextBtn);
        // Step 6 -> 7 (Groups)
        fireEvent.click(nextBtn);
        // Step 7 -> 8 (Statistics)
        fireEvent.click(nextBtn);
        // Step 8 -> 9 (Offline)
        fireEvent.click(nextBtn);

        // Now button should be "Finish"
        await waitFor(() => {
            expect(screen.getByText("welcome.finish")).toBeDefined();
        });

        fireEvent.click(screen.getByText("welcome.finish"));

        await waitFor(() => {
            expect(onComplete).toHaveBeenCalled();
        });
    });
});
