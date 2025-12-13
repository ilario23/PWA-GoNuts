import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { StatsBurnRateCard } from "./StatsBurnRateCard";
// Mock translation
jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => {
            if (key === "spending_projection_desc") return `Proiezioni per ${options?.period}`;
            return key;
        },
    }),
}));

// Mock CountUp to render value directly
jest.mock("@/components/ui/count-up", () => ({
    CountUp: ({ value }: { value: number }) => <span>{value}</span>,
}));

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
    Activity: () => <span>Activity</span>,
    AlertCircle: () => <span>AlertCircle</span>,
    TrendingDown: () => <span>TrendingDown</span>,
    TrendingUp: () => <span>TrendingUp</span>,
}));

// Mock AnimatedProgress to render value directly for checking
// function MockProgress({ value, className }: { value: number; className?: string }) {
//     return <div data-testid="progress-bar" data-value={value} className={className} />;
// }

// We need to mock the internal AnimatedProgress component which is not exported usually.
// However, since we are testing the exported component, we can't easily mock the internal one if it's defined in the same file.
// But looking at the file, AnimatedProgress uses importing Progress from "@/components/ui/progress".
// So we can mock that instead.

jest.mock("@/components/ui/progress", () => ({
    Progress: ({ value, className }: { value: number; className?: string }) => (
        <div data-testid="progress-bar" data-value={value} className={className} />
    ),
}));

describe("StatsBurnRateCard", () => {
    const defaultProps = {
        spending: 500,
        budget: 1000,
        periodName: "December 2025",
        daysInPeriod: 31,
        daysElapsed: 15,
        daysRemaining: 16,
    };

    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("renders correctly with budget under limit", () => {
        render(<StatsBurnRateCard {...defaultProps} spending={500} budget={1000} />);

        act(() => {
            jest.advanceTimersByTime(200);
        });

        // Check budget used text
        // 500 / 1000 = 50%
        expect(screen.getByText(/budget_used/)).toBeInTheDocument();
        expect(screen.getByText(/50%/)).toBeInTheDocument();

        // Check progress bar
        const progressBar = screen.getAllByTestId("progress-bar")[0]; // First one is budget used
        expect(progressBar).toHaveAttribute("data-value", "50");
    });

    it("renders correctly with budget over limit", () => {
        // Spending 1500, Budget 1000 => 150% used
        render(<StatsBurnRateCard {...defaultProps} spending={1500} budget={1000} />);

        act(() => {
            jest.advanceTimersByTime(200);
        });

        // This assertion should FAIL currently if code clamps to 100%, but PASS after fix
        // We expect to see 150% in text
        expect(screen.getByText(/budget_used/)).toBeInTheDocument();
        expect(screen.getByText(/150%/)).toBeInTheDocument();

        // But progress bar should be capped at 100
        const progressBar = screen.getAllByTestId("progress-bar")[0];
        expect(progressBar).toHaveAttribute("data-value", "100");
    });

    it("renders correctly without budget", () => {
        render(<StatsBurnRateCard {...defaultProps} budget={null} />);

        expect(screen.getByText("no_budget_set_hint")).toBeInTheDocument();
        expect(screen.queryByText(/budget_used/)).not.toBeInTheDocument();
    });
});
