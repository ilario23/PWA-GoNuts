import { useState } from "react";
import { flushSync } from "react-dom";
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

export function BottomNav({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const { addTransaction } = useTransactions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
          "left-3 right-3 bottom-[max(1.125rem,env(safe-area-inset-bottom))]"
          // No transform on this fixed element: iOS Safari positions a fixed
          // element that has a `transform` relative to the document instead of
          // the viewport, which makes the pill drift upward while scrolled. The
          // collapse scale lives on the inner pill below instead.
        )}
        role="navigation"
        aria-label={t("main_navigation", { defaultValue: "Main navigation" })}
      >
        <div
          className={cn(
            "nav-glass",
            "rounded-[28px] h-16",
            "flex items-center justify-around px-2",
            // Shrink the whole pill (FAB included) while scrolling down through
            // content; transform-origin keeps it anchored to the bottom edge.
            "origin-bottom transition-transform duration-300 ease-out motion-reduce:transition-none",
            collapsed && "scale-[0.82]"
          )}
        >
          <NavTab {...tabs[0]} />
          <NavTab {...tabs[1]} />

          <button
            onClick={openAdd}
            aria-label={t("add_transaction")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 w-16 h-full",
              "text-[rgba(255,255,255,0.82)]",
              "transition-transform duration-150 active:scale-95 motion-reduce:transition-none"
            )}
            style={{
              // Shared morph target with the add sheet (dropped while open so the
              // name lives on exactly one element during the transition).
              viewTransitionName: isDialogOpen ? "none" : "add-fab",
            }}
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            <span className="text-[10px] font-semibold leading-none">{t("add")}</span>
          </button>

          <NavTab {...tabs[2]} />
          <NavTab {...tabs[3]} />
        </div>
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
      className="relative flex flex-col items-center justify-center gap-0.5 w-16 h-full"
      aria-current={active ? "page" : undefined}
    >
      {/* Frosted capsule behind the active tab (iOS liquid-glass "lens"),
          neutral like the system tab bar: selection reads as material, not
          color. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0.5 inset-y-2 rounded-full bg-white/[0.16]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]",
          "transition-opacity duration-200 motion-reduce:transition-none",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <Icon
        className="relative w-5 h-5 transition-colors duration-150"
        style={{
          color: active ? "rgba(255, 255, 255, 0.98)" : "rgba(255, 255, 255, 0.82)"
        }}
      />
      <span
        className="relative text-[10px] font-semibold leading-none transition-colors duration-150"
        style={{
          color: active ? "rgba(255, 255, 255, 0.98)" : "rgba(255, 255, 255, 0.82)"
        }}
      >
        {label}
      </span>
    </Link>
  );
}
