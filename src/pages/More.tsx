import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthProvider";
import { useProfile } from "@/hooks/useProfiles";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Tags, Repeat, Layers, Users, Settings, User2, FileText } from "lucide-react";

// Color here would be decoration, not meaning: every tile is already
// distinguished by its icon and label, so the hub stays on the warm neutral
// system and leaves coral for actions (the One Coral Rule).
const ITEMS = [
  { href: "/groups", icon: Users, labelKey: "groups", descKey: "groups_desc" },
  { href: "/categories", icon: Tags, labelKey: "categories", descKey: "categories_desc" },
  { href: "/contexts", icon: Layers, labelKey: "contexts", descKey: "contexts_desc" },
  { href: "/recurring", icon: Repeat, labelKey: "recurring", descKey: "recurring_desc" },
  { href: "/settings", icon: Settings, labelKey: "settings", descKey: "settings_desc" },
  { href: "/profile", icon: User2, labelKey: "profile", descKey: "profile_desc" },
  { href: "/changelog", icon: FileText, labelKey: "changelog", descKey: "changelog_desc" },
] as const;

export function MorePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const profile = useProfile(user?.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("more_options")}</h1>

      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <UserAvatar
            userId={user?.id || ""}
            className="h-14 w-14 rounded-full shrink-0"
            avatarClassName="h-14 w-14 rounded-full"
            fallbackName={profile?.full_name || user?.email}
          />
          <div className="min-w-0">
            <p className="font-semibold text-lg leading-tight truncate">
              {profile?.full_name || user?.email?.split("@")[0] || t("user", { defaultValue: "User" })}
            </p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {ITEMS.map((item) => (
          <Link key={item.href} to={item.href}>
            <Card className="h-full transition-all duration-150 active:scale-[0.98] hover:brightness-[0.98]">
              <CardContent className="p-4 flex flex-col gap-4 h-full">
                <div className="flex items-start justify-between">
                  <div className="rounded-[14px] p-2.5 shrink-0 bg-secondary text-foreground">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t(item.labelKey)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {t(item.descKey, { defaultValue: "" })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
