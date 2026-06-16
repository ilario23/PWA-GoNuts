import React, { useState, lazy, Suspense } from "react";
import { useUpdateProfile, useProfile } from "@/hooks/useProfiles";
import { useAuth } from "@/contexts/AuthProvider";
import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, LogOut, Camera, Pencil } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useSafeLogout } from "@/hooks/useSafeLogout";
import { SafeLogoutDialog } from "@/components/SafeLogoutDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { UserAvatar } from "@/components/UserAvatar";
// Lazy: the avatar dialog pulls react-easy-crop + browser-image-compression
// (~60KB gzip). Load that chunk only when the user actually opens the dialog.
const AvatarUploadDialog = lazy(() =>
    import("@/components/AvatarUploadDialog").then((m) => ({ default: m.AvatarUploadDialog }))
);

// The identity spark tracks the user's chosen accent (the same token the
// FAB and active nav read), so the profile stays on one accent per screen.
const ACCENT = "hsl(var(--ring))";

export function ProfilePage() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { handleLogout, isDialogOpen, setIsDialogOpen, confirmLogout, pendingCount } = useSafeLogout();
    const { updateProfile } = useUpdateProfile();
    const profile = useProfile(user?.id);
    const reduceMotion = useReducedMotion();

    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const [isDeleteAvatarDialogOpen, setIsDeleteAvatarDialogOpen] = useState(false);

    // Honest ledger figures: what this account actually holds.
    const stats = useLiveQuery(async () => {
        if (!user?.id) return null;
        const [entries, categories] = await Promise.all([
            db.transactions.where("user_id").equals(user.id).filter((tx) => !tx.deleted_at).count(),
            db.categories.where("user_id").equals(user.id).filter((c) => !c.deleted_at).count(),
        ]);
        return { entries, categories };
    }, [user?.id]);

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString(i18n.language, { month: "short", year: "numeric" })
        : null;

    const handleAvatarUpdate = async (url: string) => {
        try {
            await updateProfile({ avatar_url: url });
        } catch (error) {
            console.error("Failed to update profile with new avatar", error);
        }
    };

    const confirmRemoveAvatar = async () => {
        try {
            await updateProfile({ avatar_url: null });
        } catch (error) {
            console.error("Failed to remove avatar", error);
        }
    };

    // Keep the editable name in sync once the profile loads.
    React.useEffect(() => {
        if (profile?.full_name) setFullName(profile.full_name);
    }, [profile?.full_name]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        try {
            await updateProfile({ full_name: fullName.trim() || undefined });
        } catch {
            // Error already surfaced via toast in the hook.
        } finally {
            setSaving(false);
            setIsEditing(false);
        }
    };

    const cancelEdit = () => {
        setFullName(profile?.full_name || "");
        setIsEditing(false);
    };

    const swap = {
        initial: { opacity: 0, y: reduceMotion ? 0 : 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: reduceMotion ? 0 : -8 },
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
    };

    const ledger: { label: string; value: string | null }[] = [
        { label: t("member_since", { defaultValue: "Member since" }), value: memberSince },
        {
            label: t("entries_logged", { defaultValue: "Entries logged" }),
            value: stats ? stats.entries.toLocaleString(i18n.language) : null,
        },
        {
            label: t("categories"),
            value: stats ? stats.categories.toLocaleString(i18n.language) : null,
        },
    ];

    return (
        <div className="mx-auto max-w-2xl space-y-6 pb-10">
            <h1 className="text-2xl font-bold tracking-tight">{t("profile")}</h1>

            {/* Identity — the title page of the user's ledger */}
            <Card className="overflow-hidden border-border/50 shadow-card">
                <CardContent className="p-0">
                    <AnimatePresence mode="wait" initial={false}>
                        {isEditing ? (
                            <motion.form
                                key="edit"
                                onSubmit={handleSave}
                                className="space-y-5 p-5 sm:p-6"
                                {...swap}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative shrink-0">
                                        <UserAvatar
                                            userId={user?.id || ""}
                                            className="rounded-full ring-2 ring-[hsl(var(--ring))]/40 ring-offset-2 ring-offset-[hsl(var(--card))]"
                                            avatarClassName="h-16 w-16 text-2xl sm:h-20 sm:w-20"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setIsAvatarDialogOpen(true)}
                                            aria-label={t("change_photo", { defaultValue: "Change Photo" })}
                                            className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full text-white transition-transform duration-150 active:scale-95"
                                            style={{ backgroundColor: ACCENT, boxShadow: "0 4px 16px -2px hsl(var(--ring) / 0.5)" }}
                                        >
                                            <Camera className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold leading-tight">
                                            {t("update_profile_picture", { defaultValue: "Update Profile Picture" })}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {t("photo_requirements", { defaultValue: "JPG, GIF or PNG. 1MB max." })}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="full-name">{t("full_name")}</Label>
                                    <Input
                                        id="full-name"
                                        type="text"
                                        autoFocus
                                        placeholder={t("full_name_placeholder", { defaultValue: "Enter your full name" })}
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-muted-foreground">{t("email")}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={user?.email || ""}
                                        disabled
                                        className="bg-muted/30"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        {t("email_readonly", { defaultValue: "Email cannot be changed" })}
                                    </p>
                                </div>

                                <div className="flex justify-end gap-2 pt-1">
                                    <Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>
                                        {t("cancel")}
                                    </Button>
                                    <Button type="submit" disabled={saving}>
                                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t("save")}
                                    </Button>
                                </div>
                            </motion.form>
                        ) : (
                            <motion.div key="view" className="p-5 sm:p-6" {...swap}>
                                <div className="flex items-center gap-4">
                                    <UserAvatar
                                        userId={user?.id || ""}
                                        className="shrink-0 rounded-full ring-2 ring-[hsl(var(--ring))]/40 ring-offset-2 ring-offset-[hsl(var(--card))]"
                                        avatarClassName="h-16 w-16 text-2xl sm:h-20 sm:w-20"
                                    />
                                    <div className="min-w-0 flex-1">
                                        {!profile ? (
                                            <>
                                                <Skeleton className="mb-2 h-7 w-40" />
                                                <Skeleton className="h-4 w-52" />
                                            </>
                                        ) : (
                                            <>
                                                <h2 className="truncate text-xl font-bold leading-tight tracking-tight sm:text-2xl">
                                                    {profile?.full_name || t("app_user")}
                                                </h2>
                                                <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                                            </>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditing(true)}
                                        className="shrink-0 gap-1.5"
                                    >
                                        <Pencil className="h-4 w-4" />
                                        <span className="hidden sm:inline">{t("edit")}</span>
                                    </Button>
                                </div>

                                {/* Ledger rows: account summarized in tabular figures */}
                                <dl className="mt-5">
                                    {ledger.map((row, i) => (
                                        <div
                                            key={row.label}
                                            className={`flex items-center justify-between py-3 ${
                                                i === 0 ? "" : "border-t border-border/45"
                                            }`}
                                        >
                                            <dt className="text-sm text-muted-foreground">{row.label}</dt>
                                            <dd>
                                                {row.value === null ? (
                                                    <Skeleton className="h-4 w-14" />
                                                ) : (
                                                    <span className="num text-[15px] font-bold tabular-nums">
                                                        {row.value}
                                                    </span>
                                                )}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>

            {/* Account */}
            <section className="space-y-2">
                <h2 className="px-1 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {t("account", { defaultValue: "Account" })}
                </h2>
                <Card className="overflow-hidden border-border/50 shadow-card">
                    <button
                        type="button"
                        onClick={() => handleLogout(true)}
                        className="flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 hover:bg-muted/50 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--gonuts-bad))]/10 text-[hsl(var(--gonuts-bad))]">
                            <LogOut className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold leading-tight text-[hsl(var(--gonuts-bad))]">
                                {t("sign_out", { defaultValue: "Sign out" })}
                            </span>
                            <span className="block truncate text-[13px] text-muted-foreground">
                                {t("sign_out_desc", { defaultValue: "End your session on this device" })}
                            </span>
                        </span>
                    </button>
                </Card>
            </section>

            <SafeLogoutDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onConfirm={confirmLogout}
                pendingCount={pendingCount}
            />

            {isAvatarDialogOpen && (
                <Suspense fallback={null}>
                    <AvatarUploadDialog
                        open={isAvatarDialogOpen}
                        onOpenChange={setIsAvatarDialogOpen}
                        onUploadComplete={handleAvatarUpdate}
                        onRemove={() => setIsDeleteAvatarDialogOpen(true)}
                        hasCurrentAvatar={!!profile?.avatar_url}
                    />
                </Suspense>
            )}

            <DeleteConfirmDialog
                open={isDeleteAvatarDialogOpen}
                onOpenChange={setIsDeleteAvatarDialogOpen}
                onConfirm={confirmRemoveAvatar}
                title={t("remove_photo", { defaultValue: "Remove Photo" })}
                description={t("confirm_remove_avatar", { defaultValue: "Are you sure you want to remove your profile picture?" })}
            />
        </div>
    );
}
