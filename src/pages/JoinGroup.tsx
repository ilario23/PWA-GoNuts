import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  clearPendingInvite,
  claimGuestInvite,
  InviteError,
  previewGuestInvite,
  savePendingInvite,
  type InvitePreview,
} from "@/lib/guestInvites";
import { syncManager } from "@/lib/sync";

/**
 * Landing page for a guest-invite link (/join/:token).
 * Not logged in -> remember the token and go to /auth (resumed after login).
 * Logged in -> show what is being joined and let the user confirm.
 */
export function JoinGroupPage() {
  const { token = "" } = useParams<{ token: string }>();
  const { user, loading } = useAuth();

  if (loading) return <JoinLoader />;

  if (!user) {
    savePendingInvite(token);
    return <Navigate to="/auth" replace />;
  }

  return <JoinGroupContent token={token} />;
}

function JoinLoader() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function JoinGroupContent({ token }: { token: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    previewGuestInvite(token)
      .then((p) => !cancelled && setPreview(p))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const errorKey = (code: string) => `join_error_${code}`;

  const handleJoin = async () => {
    setJoining(true);
    try {
      const groupId = await claimGuestInvite(token);
      clearPendingInvite();
      toast.success(t("join_success"));
      // The member row changed server-side and the user's delta-sync cursor may
      // be past the group's older rows, so pull everything once.
      await syncManager.fullSync();
      navigate(`/groups/${groupId}`, { replace: true });
    } catch (error) {
      const code = error instanceof InviteError ? error.code : "unknown";
      if (code !== "unknown" && code !== "not_authenticated") {
        // Terminal states: don't resume this invite after the next login.
        clearPendingInvite();
      }
      toast.error(t(errorKey(code), { defaultValue: t("error_occurred") }));
      setJoining(false);
    }
  };

  const leave = () => {
    clearPendingInvite();
    navigate("/", { replace: true });
  };

  if (!preview && !loadError) return <JoinLoader />;

  const valid = preview?.status === "valid";

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCheck className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {valid ? t("join_title") : t("join_invalid_title")}
          </CardTitle>
          <CardDescription>
            {valid
              ? t("join_description", {
                  group: preview?.groupName,
                  guest: preview?.guestName,
                })
              : t(
                  errorKey(
                    loadError
                      ? "unknown"
                      : preview?.status === "claimed"
                        ? "invite_already_claimed"
                        : preview?.status === "expired"
                          ? "invite_expired"
                          : preview?.status === "revoked"
                            ? "invite_revoked"
                            : "invite_not_found"
                  )
                )}
          </CardDescription>
        </CardHeader>
        {valid && (
          <CardContent className="text-sm text-muted-foreground">
            {t("join_note")}
          </CardContent>
        )}
        <CardFooter className="flex flex-col gap-2">
          {valid && (
            <Button className="w-full" onClick={handleJoin} disabled={joining}>
              {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("join_confirm")}
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={leave}>
            {valid ? t("cancel") : t("join_back_home")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
