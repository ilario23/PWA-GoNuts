import { useState, useMemo } from "react";
import { flushSync } from "react-dom";
import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Receipt, PieChart, MoreHorizontal, Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthProvider";
import { TransactionDialog, TransactionFormData } from "@/components/TransactionDialog";
import { THEME_COLORS } from "@/lib/theme-colors";

function isSecondaryRoute(pathname: string): boolean {
  return ["/groups", "/categories", "/contexts", "/recurring",
    "/settings", "/profile", "/changelog", "/more"]
    .some(p => pathname === p || pathname.startsWith(p + "/"));
}

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const { addTransaction } = useTransactions();
  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const accentColorValue = useMemo(() => {
    if (!settings?.accentColor) return "24.6 95% 53.1%";
    const theme = THEME_COLORS[settings.accentColor];
    if (!theme) return "24.6 95% 53.1%";

    const isDark = resolvedTheme === "dark";
    return isDark ? theme.dark.primary : theme.light.primary;
  }, [settings?.accentColor, resolvedTheme]);

  // Morph the FAB into the add sheet via the View Transitions API when the
  // browser supports it and motion is allowed. The FAB and the add sheet share
  // `view-transition-name: add-fab`, so the platform tweens between them.
  // Progressive enhancement: any unsupported/guarded path opens the sheet the
  // normal way (Radix slide-up), so the sacred add flow never depends on this.
  const openAdd = () => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof doc.startViewTransition === "function" && !reduce) {
      doc.startViewTransition(() => {
        flushSync(() => setIsDialogOpen(true));
      });
    } else {
      setIsDialogOpen(true);
    }
  };

  const handleSubmit = async (data: TransactionFormData) => {
    if (!user) return;
    const groupId = data.group_id || undefined;
    const paidByMemberId = groupId ? data.paid_by_member_id : undefined;
    const contextId = data.context_id || undefined;
    await addTransaction({
      user_id: user.id,
      amount: data.amount,
      description: data.description || "",
      type: data.type,
      category_id: data.category_id,
      date: data.date,
      year_month: data.date.substring(0, 7),
      context_id: contextId,
      group_id: groupId,
      paid_by_member_id: paidByMemberId,
    });
    setIsDialogOpen(false);
  };

  const tabs = [
    { href: "/",             icon: LayoutDashboard, label: t("dashboard"),    active: location.pathname === "/" },
    { href: "/transactions", icon: Receipt,          label: t("transactions"), active: location.pathname === "/transactions" },
    { href: "/statistics",   icon: PieChart,         label: t("statistics"),   active: location.pathname === "/statistics" },
    { href: "/more",         icon: MoreHorizontal,   label: t("more_options"), active: isSecondaryRoute(location.pathname) },
  ];

  return (
    <>
      <nav
        className={cn(
          "md:hidden fixed z-50",
          "left-3 right-3 bottom-[max(1.125rem,env(safe-area-inset-bottom))]",
          "bg-foreground",
          "rounded-[28px] h-16",
          "shadow-[0_8px_32px_-4px_rgba(26,23,20,0.36),0_2px_8px_-2px_rgba(26,23,20,0.24)]",
          "flex items-center justify-around px-2"
        )}
        style={{ "--accent-color": accentColorValue } as React.CSSProperties}
        role="navigation"
        aria-label={t("main_navigation", { defaultValue: "Main navigation" })}
      >
        <NavTab {...tabs[0]} accentColor={accentColorValue} />
        <NavTab {...tabs[1]} accentColor={accentColorValue} />

        <button
          onClick={openAdd}
          aria-label={t("add_transaction")}
          className={cn(
            "flex items-center justify-center",
            "w-16 h-16 -translate-y-1.5 shrink-0",
            "text-white",
            "rounded-[24px]",
            "transition-transform duration-150 active:scale-95"
          )}
          style={{
            backgroundColor: `hsl(${accentColorValue})`,
            boxShadow: `0 4px 16px -2px hsl(${accentColorValue} / 0.5)`,
            // Shared morph target with the add sheet (dropped while open so the
            // name lives on exactly one element during the transition).
            viewTransitionName: isDialogOpen ? "none" : "add-fab",
          }}
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </button>

        <NavTab {...tabs[2]} accentColor={accentColorValue} />
        <NavTab {...tabs[3]} accentColor={accentColorValue} />
      </nav>

      <TransactionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleSubmit}
        editingTransaction={null}
      />
    </>
  );
}

function NavTab({ href, icon: Icon, label, active, accentColor }: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  accentColor: string;
}) {
  return (
    <Link
      to={href}
      className="relative flex flex-col items-center justify-center gap-0.5 w-14 h-full"
      aria-current={active ? "page" : undefined}
    >
      <span
        className={cn(
          "absolute top-1 w-6 h-0.5 rounded-full transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0"
        )}
        style={{ backgroundColor: active ? `hsl(${accentColor})` : undefined }}
      />
      <Icon
        className="w-5 h-5 transition-colors duration-150"
        style={{
          color: active ? `hsl(${accentColor})` : "rgba(255, 255, 255, 0.75)"
        }}
      />
      <span
        className="text-[10px] font-semibold leading-none transition-colors duration-150"
        style={{
          color: active ? `hsl(${accentColor})` : "rgba(255, 255, 255, 0.75)"
        }}
      >
        {label}
      </span>
    </Link>
  );
}
