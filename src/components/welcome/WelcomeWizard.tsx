import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { useTranslation } from "react-i18next";
import confetti from "canvas-confetti";
import {
    LayoutDashboard,
    Receipt,
    FolderTree,
    Tags,
    Users,
    BarChart3,
    CloudDownload,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    Squirrel,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WelcomeStep } from "./WelcomeStep";
import { demoData, getDemoStats } from "@/lib/demoData";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";

interface WelcomeWizardProps {
    open: boolean;
    onComplete: () => void;
    onSkip: () => void;
}

// Step definitions
const STEPS = [
    {
        id: "welcome",
        icon: Squirrel,
        iconColor: "#f97316",
        titleKey: "welcome.step_welcome_title",
        descKey: "welcome.step_welcome_desc",
    },
    {
        id: "dashboard",
        icon: LayoutDashboard,
        iconColor: "#3b82f6",
        titleKey: "welcome.step_dashboard_title",
        descKey: "welcome.step_dashboard_desc",
    },
    {
        id: "transactions",
        icon: Receipt,
        iconColor: "#22c55e",
        titleKey: "welcome.step_transactions_title",
        descKey: "welcome.step_transactions_desc",
    },
    {
        id: "categories",
        icon: FolderTree,
        iconColor: "#a855f7",
        titleKey: "welcome.step_categories_title",
        descKey: "welcome.step_categories_desc",
    },
    {
        id: "contexts",
        icon: Tags,
        iconColor: "#f59e0b",
        titleKey: "welcome.step_contexts_title",
        descKey: "welcome.step_contexts_desc",
    },
    {
        id: "groups",
        icon: Users,
        iconColor: "#ec4899",
        titleKey: "welcome.step_groups_title",
        descKey: "welcome.step_groups_desc",
    },
    {
        id: "statistics",
        icon: BarChart3,
        iconColor: "#06b6d4",
        titleKey: "welcome.step_statistics_title",
        descKey: "welcome.step_statistics_desc",
    },
    {
        id: "offline",
        icon: CloudDownload,
        iconColor: "#64748b",
        titleKey: "welcome.step_offline_title",
        descKey: "welcome.step_offline_desc",
    },
    {
        id: "encryption",
        icon: ShieldCheck,
        iconColor: "#10b981",
        titleKey: "welcome.step_encryption_title",
        descKey: "welcome.step_encryption_desc",
    },
] as const;

// Direction for slide animation
type Direction = 1 | -1;

// Confetti celebration effect
const fireConfetti = () => {
    const count = 200;
    const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
        confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
        });
    }

    fire(0.25, {
        spread: 26,
        startVelocity: 55,
    });
    fire(0.2, {
        spread: 60,
    });
    fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
    });
    fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
    });
    fire(0.1, {
        spread: 120,
        startVelocity: 45,
    });
};

export function WelcomeWizard({ open, onComplete, onSkip }: WelcomeWizardProps) {
    const { t, i18n } = useTranslation();
    const { updateSettings } = useSettings();
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState<Direction>(1);
    const constraintsRef = useRef<HTMLDivElement>(null);

    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === STEPS.length - 1;
    const progress = ((currentStep + 1) / STEPS.length) * 100;

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setCurrentStep(0);
            setDirection(1);
        }
    }, [open]);

    const handleComplete = useCallback(() => {
        fireConfetti();
        // Small delay to let confetti start before closing
        setTimeout(() => {
            onComplete();
        }, 300);
    }, [onComplete]);

    const goNext = useCallback(() => {
        if (isLastStep) {
            handleComplete();
        } else {
            setDirection(1);
            setCurrentStep((prev) => prev + 1);
        }
    }, [isLastStep, handleComplete]);

    const goPrevious = useCallback(() => {
        if (!isFirstStep) {
            setDirection(-1);
            setCurrentStep((prev) => prev - 1);
        }
    }, [isFirstStep]);

    const handleSkip = useCallback(() => {
        onSkip();
    }, [onSkip]);

    // Swipe gesture handler
    const handleDragEnd = useCallback(
        (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            const threshold = 50;
            const velocity = 0.3;

            if (info.offset.x < -threshold || info.velocity.x < -velocity) {
                // Swiped left -> go next
                if (!isLastStep) {
                    setDirection(1);
                    setCurrentStep((prev) => prev + 1);
                }
            } else if (info.offset.x > threshold || info.velocity.x > velocity) {
                // Swiped right -> go previous
                if (!isFirstStep) {
                    setDirection(-1);
                    setCurrentStep((prev) => prev - 1);
                }
            }
        },
        [isFirstStep, isLastStep]
    );

    const currentStepData = STEPS[currentStep];

    // Slide animation variants - fast transitions
    const slideVariants = {
        enter: (dir: Direction) => ({
            x: dir > 0 ? 150 : -150,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (dir: Direction) => ({
            x: dir < 0 ? 150 : -150,
            opacity: 0,
        }),
    };

    // Render demo preview for specific steps
    const renderPreview = (stepId: string) => {
        const stats = getDemoStats();

        switch (stepId) {
            case "dashboard":
                return (
                    <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{t("total_expenses")}</span>
                            <span className="font-semibold text-destructive">
                                -{demoData.settings.currency}{stats.totalExpenses.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">{t("total_income")}</span>
                            <span className="font-semibold text-green-500">
                                +{demoData.settings.currency}{stats.totalIncome.toFixed(2)}
                            </span>
                        </div>
                        <Progress value={stats.budgetUsed} className="h-2 mt-2" />
                        <p className="text-xs text-muted-foreground text-center">
                            {stats.budgetUsed.toFixed(0)}% {t("budget_used")}
                        </p>
                    </div>
                );

            case "transactions":
                return (
                    <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                        {demoData.transactions.slice(1, 4).map((tx) => (
                            <div key={tx.id} className="flex justify-between items-center text-sm">
                                <span className="truncate max-w-[180px]">{tx.description}</span>
                                <span className={cn(
                                    "font-medium",
                                    tx.type === "expense" ? "text-destructive" : "text-green-500"
                                )}>
                                    {tx.type === "expense" ? "-" : "+"}{demoData.settings.currency}{tx.amount.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                );

            case "categories":
                return (
                    <div className="flex flex-wrap gap-2 justify-center">
                        {demoData.categories.filter(c => !c.parent_id).slice(0, 5).map((cat) => (
                            <div
                                key={cat.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                                style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                            >
                                {cat.name}
                            </div>
                        ))}
                    </div>
                );

            case "contexts":
                return (
                    <div className="flex gap-3 justify-center">
                        {demoData.contexts.map((ctx) => (
                            <div
                                key={ctx.id}
                                className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg"
                            >
                                <span className="text-xl">{ctx.name}</span>
                                <span className="text-sm text-muted-foreground">{ctx.description}</span>
                            </div>
                        ))}
                    </div>
                );

            case "groups":
                return (
                    <div className="bg-muted/50 rounded-xl p-4 text-left">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">{demoData.groups[0].name}</p>
                                <p className="text-xs text-muted-foreground">{demoData.groupMembers.length} {t("members")}</p>
                            </div>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>{t("your_share")}</span>
                            <span className="font-medium">50%</span>
                        </div>
                    </div>
                );

            case "statistics":
                return (
                    <div className="flex gap-2 justify-center">
                        {stats.categoryBreakdown.slice(0, 4).map((cat, i) => (
                            <div
                                key={i}
                                className="flex flex-col items-center gap-1"
                            >
                                <div
                                    className="w-12 rounded-t"
                                    style={{
                                        height: `${Math.max(20, cat.percentage * 1.5)}px`,
                                        backgroundColor: ["#f97316", "#ef4444", "#3b82f6", "#a855f7"][i]
                                    }}
                                />
                                <span className="text-xs text-muted-foreground">{cat.percentage}%</span>
                            </div>
                        ))}
                    </div>
                );

            case "encryption":
                return (
                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium">{t("welcome.encryption_preview_title")}</p>
                                <p className="text-xs text-muted-foreground">{t("welcome.encryption_preview_subtitle")}</p>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{t("transactions")}</span>
                                <span className="font-mono text-emerald-500">🔒 {t("encrypted")}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{t("categories")}</span>
                                <span className="font-mono text-emerald-500">🔒 {t("encrypted")}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{t("settings")}</span>
                                <span className="font-mono text-emerald-500">🔒 {t("encrypted")}</span>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent
                className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[90vh] [&>button]:hidden"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogTitle className="sr-only">{t("welcome.title")}</DialogTitle>
                <DialogDescription className="sr-only">{t("welcome.description")}</DialogDescription>

                {/* Progress bar with step name and language toggle */}
                <div className="px-4 sm:px-6 pt-4 sm:pt-6">
                    <Progress value={progress} className="h-1.5 sm:h-2" />
                    <div className="flex justify-between items-center mt-1.5 sm:mt-2">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {currentStep + 1} / {STEPS.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] sm:text-xs font-medium text-primary truncate max-w-[120px] sm:max-w-none">
                                {t(currentStepData.titleKey)}
                            </p>
                            {/* Language toggle */}
                            <button
                                onClick={() => {
                                    const newLang = i18n.language === "it" ? "en" : "it";
                                    i18n.changeLanguage(newLang);
                                    updateSettings({ language: newLang });
                                }}
                                className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border border-muted-foreground/30 hover:border-muted-foreground/50"
                            >
                                {i18n.language === "it" ? "EN" : "IT"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Step content with swipe gesture */}
                <div ref={constraintsRef} className="relative min-h-[360px] sm:min-h-[400px] overflow-hidden touch-pan-y">
                    <AnimatePresence mode="popLayout" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 500, damping: 35 },
                                opacity: { duration: 0.15 },
                            }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={handleDragEnd}
                            className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
                        >
                            <WelcomeStep
                                icon={currentStepData.icon}
                                iconColor={currentStepData.iconColor}
                                title={t(currentStepData.titleKey)}
                                description={t(currentStepData.descKey)}
                            >
                                {renderPreview(currentStepData.id)}
                            </WelcomeStep>
                        </motion.div>
                    </AnimatePresence>

                    {/* Swipe hint on first step */}
                    {currentStep === 0 && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            className="absolute bottom-2 left-0 right-0 text-center text-xs text-muted-foreground"
                        >
                            👆 {t("welcome.swipe_hint")}
                        </motion.p>
                    )}
                </div>

                {/* Navigation buttons - all on same row */}
                <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t">
                    <div className="flex items-center justify-between gap-2">
                        {/* Skip button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSkip}
                            className="text-muted-foreground text-xs"
                        >
                            {t("welcome.skip")}
                        </Button>

                        {/* Navigation: back + next */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={goPrevious}
                                disabled={isFirstStep}
                                className="h-9 w-9 sm:h-10 sm:w-10"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <Button
                                onClick={goNext}
                                className="min-w-[100px] sm:min-w-[120px]"
                            >
                                {isLastStep ? t("welcome.finish") : t("welcome.next")}
                                {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
