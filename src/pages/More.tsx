import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthProvider";
import { useProfile } from "@/hooks/useProfiles";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Tags, Repeat, Layers, Users, Settings, User2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  {
    href: "/groups",
    icon: Users,
    labelKey: "groups",
    descKey: "groups_desc",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  {
    href: "/categories",
    icon: Tags,
    labelKey: "categories",
    descKey: "categories_desc",
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-400",
  },
  {
    href: "/contexts",
    icon: Layers,
    labelKey: "contexts",
    descKey: "contexts_desc",
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  {
    href: "/recurring",
    icon: Repeat,
    labelKey: "recurring",
    descKey: "recurring_desc",
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-700 dark:text-teal-400",
  },
  {
    href: "/settings",
    icon: Settings,
    labelKey: "settings",
    descKey: "settings_desc",
    bg: "bg-muted",
    text: "text-foreground",
  },
  {
    href: "/profile",
    icon: User2,
    labelKey: "profile",
    descKey: "profile_desc",
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
  },
  {
    href: "/changelog",
    icon: FileText,
    labelKey: "changelog",
    descKey: "changelog_desc",
    bg: "bg-muted",
    text: "text-muted-foreground",
  },
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
                  <div className={cn("rounded-[14px] p-2.5 shrink-0", item.bg, item.text)}>
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
