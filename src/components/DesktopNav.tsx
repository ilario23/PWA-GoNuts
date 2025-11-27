import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineSync } from "@/hooks/useOnlineSync";
import packageJson from "../../package.json";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface DesktopNavProps {
  navigation: NavItem[];
}

export function DesktopNav({ navigation }: DesktopNavProps) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline } = useOnlineSync();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <aside
      className="hidden w-64 flex-col border-r bg-muted/10 md:flex h-full shrink-0"
      role="navigation"
      aria-label={t("main_navigation")}
    >
      <div className="flex h-14 items-center border-b px-4 font-bold text-xl shrink-0">
        <Wallet
          className={cn("mr-2 h-6 w-6", !isOnline && "text-destructive")}
          aria-hidden="true"
        />
        <span className="text-primary">{t("app_title")}</span>
        {!isOnline && <span className="sr-only">{t("offline_mode")}</span>}
      </div>
      <nav
        className="flex-1 space-y-1 p-2 overflow-y-auto"
        aria-label={t("main_menu")}
      >
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="text-xs text-muted-foreground px-3 text-center">
        {t("version")} {packageJson.version}
      </div>
      <div className="border-t p-4 shrink-0 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
          aria-label={t("logout")}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {t("logout")}
        </Button>
      </div>
    </aside>
  );
}
