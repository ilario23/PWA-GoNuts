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
import { Separator } from "@/components/ui/separator";
import { Loader2, LogOut, User2 } from "lucide-react";
import { useSafeLogout } from "@/hooks/useSafeLogout";
import { SafeLogoutDialog } from "@/components/SafeLogoutDialog";

export function ProfilePage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { handleLogout, isDialogOpen, setIsDialogOpen, confirmLogout, pendingCount } = useSafeLogout();
    const { updateProfile } = useUpdateProfile();
    const profile = useProfile(user?.id);
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [saving, setSaving] = useState(false);

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
        } catch (error) {
            // Error already handled by toast in hook
        } finally {
            setSaving(false);
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
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User2 className="h-5 w-5" />
                            {t("profile_information", { defaultValue: "Profile Information" })}
                        </CardTitle>
                        <CardDescription>
                            {t("profile_information_desc", {
                                defaultValue: "Update your personal information"
                            })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-4">
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

                            <Separator />

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

                            <div className="flex justify-end">
                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t("save")}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

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
        </div>
    );
}
