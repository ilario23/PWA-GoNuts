import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ArrowLeft } from "lucide-react";

export function RequestPasswordResetPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });
            if (error) throw error;
            toast.success(t("reset_link_sent"));
            // Optional: Navigate back or stay to let user know
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("auth_error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-muted/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] safe-y relative overflow-y-auto">
            <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-[calc(1rem+env(safe-area-inset-right))]">
                <LanguageSwitcher />
            </div>
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">
                        {t("reset_password")}
                    </CardTitle>
                    <CardDescription>
                        {t("auth_desc")}
                        {/* Using auth_desc temporarily or we can just say "Enter email" */}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleReset} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                {t("email")}
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                data-testid="reset-email-input"
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading} data-testid="reset-submit-button">
                            {loading ? t("loading") : t("send_reset_link")}
                        </Button>

                        <div className="text-center text-sm">
                            <Link
                                to="/auth"
                                className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {t("back_to_login")}
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
