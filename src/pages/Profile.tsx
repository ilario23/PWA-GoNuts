import React, { useState } from "react";
import { useUpdateProfile, useProfile } from "@/hooks/useProfiles";
import { useAuth } from "@/contexts/AuthProvider";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Loader2, LogOut, User2, Camera, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSafeLogout } from "@/hooks/useSafeLogout";
import { SafeLogoutDialog } from "@/components/SafeLogoutDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { AvatarUploadDialog } from "@/components/AvatarUploadDialog";

const MotionCard = motion.create(Card);

export function ProfilePage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { handleLogout, isDialogOpen, setIsDialogOpen, confirmLogout, pendingCount } = useSafeLogout();
    const { updateProfile } = useUpdateProfile();
    const profile = useProfile(user?.id);
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<'collapsed' | 'expanded' | 'editing'>('collapsed');
    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
    const [isDeleteAvatarDialogOpen, setIsDeleteAvatarDialogOpen] = useState(false);

    const handleAvatarUpdate = async (url: string) => {
        try {
            await updateProfile({ avatar_url: url });
        } catch (error) {
            console.error("Failed to update profile with new avatar", error);
        }
    };

    const handleRemoveAvatarClick = () => {
        setIsDeleteAvatarDialogOpen(true);
    };

    const confirmRemoveAvatar = async () => {
        try {
            await updateProfile({ avatar_url: null });
        } catch (error) {
            console.error("Failed to remove avatar", error);
        }
    };


    // Update state when profile loads
    React.useEffect(() => {
        if (profile?.full_name) {
            setFullName(profile.full_name);
        }
    }, [profile?.full_name]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            await updateProfile({
                full_name: fullName.trim() || undefined,
            });
        } catch (_) {
            // Error already handled by toast in hook
        } finally {
            setSaving(false);
            setMode('expanded'); // Return to detail view
        }
    };


    return (
        <div className="space-y-6 pb-10">
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight">{t("profile")}</h2>
                <p className="text-muted-foreground">
                    {t("profile_desc", {
                        defaultValue: "Manage your profile information and account"
                    })}
                </p>
            </div>

            <div className="grid gap-6">
                {/* Profile Information */}
                <MotionCard
                    layout
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={`overflow-hidden ${mode === 'collapsed' ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50' : ''}`}
                    onClick={() => {
                        if (mode === 'collapsed') setMode('expanded');
                    }}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <motion.div
                            layout="position"
                            className={`space-y-1 ${mode === 'expanded' ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
                            onClick={(e) => {
                                if (mode === 'expanded') {
                                    e.stopPropagation();
                                    setMode('collapsed');
                                }
                            }}
                        >
                            <CardTitle className="flex items-center gap-2">
                                <User2 className="h-5 w-5" />
                                {t("profile_information", { defaultValue: "Profile Information" })}
                            </CardTitle>
                            <CardDescription>
                                {t("profile_information_desc", {
                                    defaultValue: "Update your personal information"
                                })}
                            </CardDescription>
                        </motion.div>
                        {mode === 'collapsed' && (
                            <motion.div
                                layoutId="profile-avatar"
                                className="flex items-center gap-2"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                            >
                                <UserAvatar
                                    userId={user?.id || ""}
                                    className="ring-2 ring-border rounded-full"
                                    avatarClassName="h-10 w-10"
                                />
                            </motion.div>
                        )}
                        {mode === 'expanded' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="flex items-center gap-2"
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMode('editing');
                                    }}
                                    className="h-8 w-8 p-0"
                                >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">{t("edit")}</span>
                                </Button>
                            </motion.div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <AnimatePresence mode="popLayout" initial={false}>
                            {mode === 'collapsed' ? (
                                <motion.div
                                    key="collapsed"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                    className="flex flex-col items-start gap-1 py-2"
                                >
                                    {!profile ? (
                                        <>
                                            <Skeleton className="h-7 w-32 mb-1" />
                                            <Skeleton className="h-4 w-48" />
                                        </>
                                    ) : (
                                        <>
                                            <motion.h3
                                                layoutId="profile-name"
                                                className="text-xl font-bold"
                                            >
                                                {profile?.full_name || t("app_user")}
                                            </motion.h3>
                                            <motion.p
                                                layoutId="profile-email"
                                                className="text-muted-foreground"
                                            >
                                                {user?.email}
                                            </motion.p>
                                        </>
                                    )}
                                </motion.div>
                            ) : mode === 'expanded' ? (
                                <motion.div
                                    key="expanded"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2, delay: 0.1 }}
                                    className="space-y-4 pt-4"
                                >
                                    <div className="flex flex-col items-center sm:flex-row gap-6 mb-6">
                                        <motion.div layoutId="profile-avatar">
                                            <UserAvatar
                                                userId={user?.id || ""}
                                                className="ring-2 ring-border rounded-full"
                                                avatarClassName="h-24 w-24 sm:h-24 sm:w-24 text-4xl"
                                            />
                                        </motion.div>
                                        <div className="flex-1 space-y-1 text-center sm:text-left">
                                            {!profile ? (
                                                <div className="flex flex-col gap-2 items-center sm:items-start">
                                                    <Skeleton className="h-8 w-48" />
                                                    <Skeleton className="h-5 w-64" />
                                                </div>
                                            ) : (
                                                <>
                                                    <motion.h3
                                                        layoutId="profile-name"
                                                        className="text-2xl font-bold tracking-tight"
                                                    >
                                                        {profile?.full_name || t("app_user")}
                                                    </motion.h3>
                                                    <motion.p
                                                        layoutId="profile-email"
                                                        className="text-muted-foreground"
                                                    >
                                                        {user?.email}
                                                    </motion.p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="editing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2, delay: 0.1 }}
                                >
                                    <form onSubmit={handleSave} className="space-y-4 pt-4">
                                        <div className="flex flex-col items-center sm:flex-row gap-6 mb-6">
                                            <div className="relative group">
                                                <motion.div layoutId="profile-avatar">
                                                    <UserAvatar
                                                        userId={user?.id || ""}
                                                        className="ring-2 ring-border rounded-full"
                                                        avatarClassName="h-24 w-24 sm:h-24 sm:w-24 text-4xl"
                                                    />
                                                </motion.div>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute bottom-0 right-0 rounded-full shadow-lg h-8 w-8 opacity-90 hover:opacity-100"
                                                    onClick={() => setIsAvatarDialogOpen(true)}
                                                    title={t("change_photo", { defaultValue: "Change Photo" })}
                                                >
                                                    <Camera className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="flex-1 space-y-1 text-center sm:text-left">
                                                <p className="font-medium">{t("update_profile_picture", { defaultValue: "Update Profile Picture" })}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {t("photo_requirements", { defaultValue: "JPG, GIF or PNG. 1MB max." })}
                                                </p>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setIsAvatarDialogOpen(true)}
                                                    className="mt-2"
                                                >
                                                    {t("change_photo", { defaultValue: "Change Photo" })}
                                                </Button>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="grid gap-2">
                                            <Label htmlFor="full-name">
                                                {t("full_name")}
                                            </Label>
                                            <Input
                                                id="full-name"
                                                type="text"
                                                placeholder={t("full_name_placeholder", {
                                                    defaultValue: "Enter your full name"
                                                })}
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="email" className="text-muted-foreground">
                                                {t("email")}
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={user?.email || ""}
                                                disabled
                                                className="bg-muted/20"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {t("email_readonly", {
                                                    defaultValue: "Email cannot be changed"
                                                })}
                                            </p>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setMode('expanded')}
                                                disabled={saving}
                                            >
                                                {t("cancel")}
                                            </Button>
                                            <Button type="submit" disabled={saving}>
                                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {t("save")}
                                            </Button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </MotionCard>

                {/* Account Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t("account_actions", { defaultValue: "Account Actions" })}</CardTitle>
                        <CardDescription>
                            {t("account_actions_desc", {
                                defaultValue: "Manage your account and session"
                            })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="destructive"
                            className="w-full sm:w-auto"
                            onClick={() => handleLogout(true)}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            {t("logout")}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <SafeLogoutDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onConfirm={confirmLogout}
                pendingCount={pendingCount}
            />

            <AvatarUploadDialog
                open={isAvatarDialogOpen}
                onOpenChange={setIsAvatarDialogOpen}
                onUploadComplete={handleAvatarUpdate}
                onRemove={handleRemoveAvatarClick}
                hasCurrentAvatar={!!profile?.avatar_url}
            />

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
