import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { syncManager } from "@/lib/sync";
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
import { Eye, EyeOff } from "lucide-react";
import { usePasswordStrength } from "@/hooks/usePasswordStrength";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Password strength hook
  const { score: strengthScore, feedback: strengthFeedback } = usePasswordStrength(password);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          toast.error(t("passwords_mismatch"));
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success(t("check_email"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Sync data from Supabase after successful login
        toast.success(t("sign_in_success"));
        toast.loading(t("syncing"));
        await syncManager.sync();
        toast.dismiss();

        // Redirect to dashboard after successful sign in and sync
        navigate("/");
      }
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
            {isSignUp ? t("sign_up") : t("sign_in")}
          </CardTitle>
          <CardDescription>{t("auth_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
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
                data-testid="auth-email-input"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {t("password")}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                  data-testid="auth-password-input"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t("hide_password") : t("show_password")}
                  aria-controls="password"
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {showPassword ? t("hide_password") : t("show_password")}
                  </span>
                </Button>
              </div>
            </div>

            {/* Password Strength Meter (Sign Up Only) */}
            {isSignUp && password && (
              <div className="space-y-2 pt-1 transition-all animate-in fade-in slide-in-from-top-1">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full transition-all duration-500 ease-out ${strengthScore <= 1 ? "bg-red-500 w-[25%]" :
                        strengthScore === 2 ? "bg-orange-500 w-[50%]" :
                          strengthScore === 3 ? "bg-yellow-500 w-[75%]" :
                            "bg-green-500 w-full"
                      }`}
                  />
                </div>
                <p className={`text-xs font-medium ${strengthScore <= 1 ? "text-red-500" :
                    strengthScore === 2 ? "text-orange-500" :
                      strengthScore === 3 ? "text-yellow-500" :
                        "text-green-500"
                  }`}>
                  {strengthFeedback.warning || strengthFeedback.suggestions[0] ||
                    (strengthScore <= 1 ? t("strength_weak") :
                      strengthScore === 2 ? t("strength_fair") :
                        strengthScore === 3 ? t("strength_good") :
                          t("strength_strong"))}
                </p>
              </div>
            )}
            {!isSignUp && (
              <div className="flex justify-end">
                <Link
                  to="/auth/reset-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t("forgot_password")}
                </Link>
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  {t("confirm_password")}
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? t("hide_password") : t("show_password")}
                    aria-controls="confirmPassword"
                    aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    <span className="sr-only">
                      {showConfirmPassword
                        ? t("hide_password")
                        : t("show_password")}
                    </span>
                  </Button>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading} data-testid="auth-submit-button">
              {loading ? t("loading") : isSignUp ? t("sign_up") : t("sign_in")}
            </Button>
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="underline hover:text-primary"
              >
                {isSignUp
                  ? t("already_have_account")
                  : t("need_account")}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
