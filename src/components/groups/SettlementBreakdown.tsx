import { useTranslation } from "react-i18next";
import { Check, Clock } from "lucide-react";
import {
  BalanceSnapshotEntry,
  GroupExpenseLineItem,
} from "@/hooks/useGroups";

interface SettlementBreakdownProps {
  /** The member who owes (the "from" side of the settlement edge). */
  debtor: BalanceSnapshotEntry;
  /** Display name of the member receiving this payment (the "to" side). */
  creditorName: string;
  /** This specific edge's amount (may be only part of the debtor's net). */
  edgeAmount: number;
  /** Total of all group expenses (the shared pool). */
  totalExpenses: number;
  /** Every group expense, newest first. */
  expenses: GroupExpenseLineItem[];
  /** True when the debtor is the current user (drives "you" labelling). */
  isMe: boolean;
}

const EPS = 0.01;

/** `−€12.34` / `+€12.34`, sign reflecting effect on the running balance. */
function signed(value: number): string {
  const sign = value < -EPS ? "−" : value > EPS ? "+" : "";
  return `${sign}€${Math.abs(value).toFixed(2)}`;
}

function toneClass(value: number): string {
  if (value > EPS) return "text-[hsl(var(--gonuts-good))]";
  if (value < -EPS) return "text-[hsl(var(--gonuts-bad))]";
  return "text-muted-foreground";
}

/**
 * Inline ledger that explains a settlement amount end to end:
 * a reconciliation header (#1) followed by an expense-by-expense
 * breakdown (#2). Every figure traces back to the net the user pays.
 *
 * The settlement plan nets the whole group, so this shows the debtor's
 * full position; the specific edge is one payment toward it.
 */
export function SettlementBreakdown({
  debtor,
  creditorName,
  edgeAmount,
  totalExpenses,
  expenses,
  isMe,
}: SettlementBreakdownProps) {
  const { t } = useTranslation();

  const owner = isMe ? t("you") : debtor.displayName;
  // Header components, signed by their effect on the running balance.
  // balance = hasPaid − shouldPay + settlementSent − settlementReceived
  const shareCost = -debtor.shouldPay;
  const paidUp = debtor.hasPaid;
  const settlementsNet = debtor.settlementSent - debtor.settlementReceived;
  const hasSettlements = Math.abs(settlementsNet) > EPS;
  const net = debtor.balance;
  const totalOwed = Math.abs(net);
  const coversFull = Math.abs(edgeAmount - totalOwed) < EPS;

  // Expense subtotal == hasPaid − shouldPay; the ledger rows sum to this.
  const expenseSubtotal = debtor.hasPaid - debtor.shouldPay;

  return (
    <div className="space-y-3 pt-3">
      {/* Honest framing: this nets the whole group position. */}
      <p className="text-xs text-muted-foreground">
        {isMe
          ? t("settlement_breakdown_routed", { name: creditorName })
          : t("settlement_breakdown_routed_other", {
              from: owner,
              to: creditorName,
            })}
      </p>

      {/* #1 — The math */}
      <dl className="rounded-[var(--radius-md)] bg-muted/40 p-3.5 text-sm">
        <BreakdownRow
          label={t("settlement_breakdown_pool")}
          value={`€${totalExpenses.toFixed(2)}`}
        />
        <BreakdownRow
          label={t("settlement_breakdown_share", { share: debtor.share })}
          value={signed(shareCost)}
          tone={toneClass(shareCost)}
        />
        {paidUp > EPS && (
          <BreakdownRow
            label={t("settlement_breakdown_paid")}
            value={signed(paidUp)}
            tone={toneClass(paidUp)}
          />
        )}
        {hasSettlements && (
          <BreakdownRow
            label={t("settlement_breakdown_settlements")}
            value={signed(settlementsNet)}
            tone={toneClass(settlementsNet)}
          />
        )}
        <div className="mt-2.5 flex items-baseline justify-between border-t border-border/60 pt-2.5">
          <dt className="text-sm font-semibold">
            {t("settlement_breakdown_net")}
          </dt>
          <dd className={`num text-lg font-bold ${toneClass(net)}`}>
            {signed(net)}
          </dd>
        </div>
      </dl>

      {/* Edge context: this payment vs. the full balance */}
      <p className="text-xs text-muted-foreground">
        {coversFull
          ? t("settlement_breakdown_clears")
          : t("settlement_breakdown_this_payment", {
              amount: edgeAmount.toFixed(2),
              total: totalOwed.toFixed(2),
            })}
      </p>

      {/* #2 — Expense by expense */}
      <div className="space-y-2">
        <p className="px-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {t("settlement_breakdown_line_items")}
        </p>

        {expenses.length === 0 ? (
          <p className="rounded-[var(--radius-md)] border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
            {t("settlement_breakdown_empty")}
          </p>
        ) : (
          <>
            <ul className="overflow-hidden rounded-[var(--radius-md)] border border-border/60 bg-card">
              {expenses.map((e) => {
                const yourShare = (e.amount * debtor.share) / 100;
                const paidThis = e.payerMemberId === debtor.memberId;
                return (
                  <li
                    key={e.id}
                    className="relative flex items-center gap-3 px-3.5 py-2.5 first:before:hidden before:absolute before:inset-x-3.5 before:top-0 before:h-px before:bg-border/45"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.9375rem] font-medium leading-tight">
                        {e.description || t("transaction")}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <SettledTag settled={e.settled} />
                        <span className="truncate">
                          {e.date}
                          {" · "}
                          {t("settlement_breakdown_paid_by", {
                            name: paidThis && isMe ? t("you") : e.payerName,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num text-sm font-semibold leading-tight tabular-nums">
                        €{e.amount.toFixed(2)}
                      </p>
                      <p className="mt-0.5 flex items-center justify-end gap-1.5 text-[0.6875rem] leading-tight">
                        <span className={toneClass(-yourShare)}>
                          {signed(-yourShare)}
                        </span>
                        {paidThis && (
                          <span className={toneClass(e.amount)}>
                            {signed(e.amount)}
                          </span>
                        )}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Reconciliation: rows sum exactly to this subtotal */}
            <div className="flex items-baseline justify-between px-0.5">
              <span className="text-xs text-muted-foreground">
                {t("settlement_breakdown_subtotal")}
              </span>
              <span
                className={`num text-sm font-semibold tabular-nums ${toneClass(
                  expenseSubtotal
                )}`}
              >
                {signed(expenseSubtotal)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Compact status pill marking whether an expense falls before the group's
 * settled-through checkpoint. State carries an icon + word, never colour alone.
 */
function SettledTag({ settled }: { settled: boolean }) {
  const { t } = useTranslation();
  const Icon = settled ? Check : Clock;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.06em] ${
        settled
          ? "bg-[hsl(var(--gonuts-good)/0.12)] text-[hsl(var(--gonuts-good))]"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {settled ? t("settled") : t("not_settled")}
    </span>
  );
}

function BreakdownRow({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`num tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}
