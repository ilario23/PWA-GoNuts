import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Receipt, PieChart, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthProvider";
import { TransactionDialog, TransactionFormData } from "@/components/TransactionDialog";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
          "bg-foreground dark:bg-[hsl(25_13%_12%)]",
          "rounded-[28px] h-16",
          "shadow-[0_8px_32px_-4px_rgba(26,23,20,0.36),0_2px_8px_-2px_rgba(26,23,20,0.24)]",
          "flex items-center justify-around px-2"
        )}
        role="navigation"
        aria-label={t("main_navigation", { defaultValue: "Main navigation" })}
      >
        <NavTab {...tabs[0]} />
        <NavTab {...tabs[1]} />

        <button
          onClick={() => setIsDialogOpen(true)}
          aria-label={t("add_transaction")}
          className={cn(
            "flex items-center justify-center",
            "w-16 h-16 -translate-y-1.5 shrink-0",
            "bg-[hsl(var(--gonuts-orange))] text-white",
            "rounded-[24px]",
            "shadow-[0_4px_16px_-2px_rgba(230,106,60,0.50)]",
            "transition-transform duration-150 active:scale-95"
          )}
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </button>

        <NavTab {...tabs[2]} />
        <NavTab {...tabs[3]} />
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

function NavTab({ href, icon: Icon, label, active }: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
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
          active ? "bg-[hsl(var(--gonuts-orange))] opacity-100" : "opacity-0"
        )}
      />
      <Icon
        className={cn(
          "w-5 h-5 transition-colors duration-150",
          active ? "text-[hsl(var(--gonuts-orange))]" : "text-white/55"
        )}
      />
      <span
        className={cn(
          "text-[10px] font-semibold leading-none transition-colors duration-150",
          active ? "text-[hsl(var(--gonuts-orange))]" : "text-white/55"
        )}
      >
        {label}
      </span>
    </Link>
  );
}
