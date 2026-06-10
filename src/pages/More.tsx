import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthProvider";
import { useProfile } from "@/hooks/useProfiles";
import { UserAvatar } from "@/components/UserAvatar";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, Tags, Repeat, Layers, Users, Settings, User2, FileText } from "lucide-react";

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  descKey: string;
  iconBg: string;
  iconColor: string;
  fullWidth?: boolean;
};

// Semantic color coding: hue carries conceptual meaning, not pure decoration.
// blue=social/people, amber=organization, purple=tagging/context,
// green=recurring/time, coral=personal identity, slate=system info.
const ITEMS: NavItem[] = [
  {
    href: "/groups",
    icon: Users,
    labelKey: "groups",
    descKey: "groups_desc",
    iconBg: "oklch(47% 0.19 245 / 0.13)",
    iconColor: "oklch(47% 0.19 245)",
  },
  {
    href: "/categories",
    icon: Tags,
    labelKey: "categories",
    descKey: "categories_desc",
    iconBg: "oklch(52% 0.16 75 / 0.13)",
    iconColor: "oklch(52% 0.16 75)",
  },
  {
    href: "/contexts",
    icon: Layers,
    labelKey: "contexts",
    descKey: "contexts_desc",
    iconBg: "oklch(48% 0.19 300 / 0.13)",
    iconColor: "oklch(48% 0.19 300)",
  },
  {
    href: "/recurring",
    icon: Repeat,
    labelKey: "recurring",
    descKey: "recurring_desc",
    iconBg: "oklch(46% 0.17 155 / 0.13)",
    iconColor: "oklch(46% 0.17 155)",
  },
  {
    href: "/settings",
    icon: Settings,
    labelKey: "settings",
    descKey: "settings_desc",
    iconBg: "oklch(36% 0.04 45 / 0.10)",
    iconColor: "oklch(36% 0.04 45)",
  },
  {
    href: "/profile",
    icon: User2,
    labelKey: "profile",
    descKey: "profile_desc",
    iconBg: "hsl(var(--ring) / 0.13)",
    iconColor: "hsl(var(--ring))",
  },
  {
    href: "/changelog",
    icon: FileText,
    labelKey: "changelog",
    descKey: "changelog_desc",
    iconBg: "oklch(43% 0.08 220 / 0.12)",
    iconColor: "oklch(43% 0.08 220)",
    fullWidth: true,
  },
];

export function MorePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const profile = useProfile(user?.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("more_options")}</h1>

      <Link to="/profile" className="block">
        <Card className="transition-all duration-150 active:scale-[0.98] hover:brightness-[0.98]">
          <CardContent className="p-4 flex items-center gap-4">
            <UserAvatar
              userId={user?.id || ""}
              className="h-14 w-14 rounded-full shrink-0"
              avatarClassName="h-14 w-14 rounded-full"
              fallbackName={profile?.full_name || user?.email}
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg leading-tight truncate">
                {profile?.full_name ||
                  user?.email?.split("@")[0] ||
                  t("user", { defaultValue: "User" })}
              </p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        {ITEMS.filter((item) => !item.fullWidth).map((item) => (
          <Link key={item.href} to={item.href}>
            <Card className="h-full transition-all duration-150 active:scale-[0.98] hover:brightness-[0.98]">
              <CardContent className="p-4 flex flex-col gap-4 h-full">
                <div className="flex items-start justify-between">
                  <div
                    className="rounded-[14px] p-2.5 shrink-0"
                    style={{
                      backgroundColor: item.iconBg,
                      color: item.iconColor,
                    }}
                  >
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

        {ITEMS.filter((item) => item.fullWidth).map((item) => (
          <Link key={item.href} to={item.href} className="col-span-2">
            <Card className="transition-all duration-150 active:scale-[0.98] hover:brightness-[0.98]">
              <CardContent className="p-4 flex items-center gap-4">
                <div
                  className="rounded-[14px] p-2.5 shrink-0"
                  style={{
                    backgroundColor: item.iconBg,
                    color: item.iconColor,
                  }}
                >
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{t(item.labelKey)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {t(item.descKey, { defaultValue: "" })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
