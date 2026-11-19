import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildInviteLink,
  createGuestInvite,
  InviteError,
} from "@/lib/guestInvites";

type InviteMember = { id: string; guest_name?: string | null };

interface GuestInviteDialogProps {
  /** Guest member to invite; dialog is open while this is set. */
  member: InviteMember | null;
  onClose: () => void;
}

/**
 * Generates a single-use invite link that lets a real user take over a guest
 * member, keeping all the guest's expenses and balances.
 */
export function GuestInviteDialog({ member, onClose }: GuestInviteDialogProps) {
  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {/* Mounted only while open, so each open generates a fresh link with clean state. */}
        {member && <InviteBody member={member} />}
      </DialogContent>
    </Dialog>
  );
}

function InviteBody({ member }: { member: InviteMember }) {
  const { t } = useTranslation();
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createGuestInvite(member.id)
      .then((token) => !cancelled && setLink(buildInviteLink(token)))
      .catch((e) => {
        if (cancelled) return;
        const code = e instanceof InviteError ? e.code : "unknown";
        setError(t(`join_error_${code}`, { defaultValue: t("error_occurred") }));
      });
    return () => {
      cancelled = true;
    };
  }, [member.id, t]);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the field is selectable */
    }
  };

  const share = async () => {
    if (!link) return;
    try {
      await navigator.share({
        title: "GoNuts",
        text: t("invite_guest_share_text", { name: member.guest_name }),
        url: link,
      });
    } catch {
      /* dismissed */
    }
  };

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {t("invite_guest_title", { name: member.guest_name })}
        </DialogTitle>
        <DialogDescription>
          {t("invite_guest_description", { name: member.guest_name })}
        </DialogDescription>
      </DialogHeader>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !link ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          <Input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={t("invite_guest_link")}
          />
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={copy}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? t("invite_guest_copied") : t("invite_guest_copy")}
            </Button>
            {canShare && (
              <Button className="flex-1" onClick={share}>
                <Share2 className="mr-2 h-4 w-4" />
                {t("invite_guest_share")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("invite_guest_expiry_hint")}
          </p>
        </div>
      )}
    </>
  );
}
