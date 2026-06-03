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
  { href: "/groups", icon: Users, labelKey: "groups", descKey: "groups_desc", iconBg: "bg-blue-100 dark:bg-blue-950", iconColor: "text-blue-600 dark:text-blue-400" },
  { href: "/categories", icon: Tags, labelKey: "categories", descKey: "categories_desc", iconBg: "bg-amber-100 dark:bg-amber-950", iconColor: "text-amber-600 dark:text-amber-400" },
  { href: "/contexts", icon: Layers, labelKey: "contexts", descKey: "contexts_desc", iconBg: "bg-violet-100 dark:bg-violet-950", iconColor: "text-violet-600 dark:text-violet-400" },
  { href: "/recurring", icon: Repeat, labelKey: "recurring", descKey: "recurring_desc", iconBg: "bg-emerald-100 dark:bg-emerald-950", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { href: "/settings", icon: Settings, labelKey: "settings", descKey: "settings_desc", iconBg: "bg-slate-100 dark:bg-slate-800", iconColor: "text-slate-600 dark:text-slate-400" },
  { href: "/profile", icon: User2, labelKey: "profile", descKey: "profile_desc", iconBg: "bg-rose-100 dark:bg-rose-950", iconColor: "text-rose-600 dark:text-rose-400" },
  { href: "/changelog", icon: FileText, labelKey: "changelog", descKey: "changelog_desc", iconBg: "bg-orange-100 dark:bg-orange-950", iconColor: "text-orange-600 dark:text-orange-400" },
];

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
                  <div className={`rounded-[14px] p-2.5 shrink-0 ${item.iconBg} ${item.iconColor}`}>
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
