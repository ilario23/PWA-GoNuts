import { useTranslation } from "react-i18next";
import { User, Wallet, Sun, Moon, Monitor } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Theme } from "@/lib/types";

interface SetupStepProps {
    userName: string;
    setUserName: (name: string) => void;
    monthlyBudget: string;
    setMonthlyBudget: (budget: string) => void;
    currentTheme: Theme;
    setTheme: (theme: Theme) => void;
}

export function SetupStep({
    userName,
    setUserName,
    monthlyBudget,
    setMonthlyBudget,
    currentTheme,
    setTheme,
}: SetupStepProps) {
    const { t } = useTranslation();

    return (
        <div className="w-full max-w-sm mx-auto space-y-6 px-4">
            {/* User Name Input */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
            >
                <Label htmlFor="name" className="text-muted-foreground">
                    {t("welcome.whats_your_name")}
                </Label>
                <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder={t("welcome.your_name")}
                        className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
                        autoComplete="off"
                    />
                </div>
            </motion.div>

            {/* Monthly Budget Input */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
            >
                <Label htmlFor="budget" className="text-muted-foreground">
                    {t("welcome.monthly_budget")}
                </Label>
                <div className="relative">
                    <Wallet className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="budget"
                        type="number"
                        value={monthlyBudget}
                        onChange={(e) => setMonthlyBudget(e.target.value)}
                        placeholder={t("welcome.budget_placeholder")}
                        className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
                    />
                </div>
            </motion.div>

            {/* Theme Selection */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
            >
                <Label className="text-muted-foreground">
                    {t("welcome.select_theme")}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setTheme("light")}
                        className={cn(
                            "h-16 flex flex-col gap-1 items-center justify-center border-2 transition-all px-0",
                            currentTheme === "light"
                                ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                                : "border-muted hover:border-orange-200 hover:bg-orange-50/50 dark:hover:bg-orange-950/10"
                        )}
                    >
                        <Sun className={cn("h-5 w-5", currentTheme === "light" ? "text-orange-500 fill-orange-500" : "text-muted-foreground")} />
                        <span className="font-medium text-[10px]">{t("light")}</span>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setTheme("dark")}
                        className={cn(
                            "h-16 flex flex-col gap-1 items-center justify-center border-2 transition-all px-0",
                            currentTheme === "dark"
                                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400"
                                : "border-muted hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/10"
                        )}
                    >
                        <Moon className={cn("h-5 w-5", currentTheme === "dark" ? "text-indigo-500 fill-indigo-500" : "text-muted-foreground")} />
                        <span className="font-medium text-[10px]">{t("dark")}</span>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setTheme("system")}
                        className={cn(
                            "h-16 flex flex-col gap-1 items-center justify-center border-2 transition-all px-0",
                            currentTheme === "system"
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-muted hover:bg-accent/50"
                        )}
                    >
                        <Monitor className={cn("h-5 w-5", currentTheme === "system" ? "text-primary" : "text-muted-foreground")} />
                        <span className="font-medium text-[10px]">{t("system")}</span>
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
