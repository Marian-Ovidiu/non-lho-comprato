import { round2 } from "@/src/lib/money-number";
import { toEntryMoneyView, type EntryMoneyLike } from "@/src/lib/entry-domain";

export type BudgetMonthEntry = EntryMoneyLike;

export type BudgetMonthTotals = {
  realSpent: number;
  avoidedAmount: number;
};

/**
 * Card totals for the /budget month header, computed from the already-loaded
 * month entries so the page needs no separate dashboard-summary query.
 *
 * Mirrors getDashboardSummary for the two fields the page uses:
 * - realSpent: money that actually left the account, matching
 *   SUM("realCost") WHERE mode <> 'avoided'. Comparison entries are included:
 *   tagging a purchase as "cheaper than the alternative" does not make it
 *   stop being a purchase, and excluding it made the budget under-count
 *   real spending.
 * - avoidedAmount: alternativeCost of avoided entries, matching
 *   SUM(CASE WHEN mode = 'avoided' THEN "alternativeCost" ELSE 0 END).
 */
export function computeBudgetMonthTotals(
  entries: ReadonlyArray<BudgetMonthEntry>,
): BudgetMonthTotals {
  let realSpent = 0;
  let avoidedAmount = 0;

  for (const entry of entries) {
    const money = toEntryMoneyView(entry);

    if (money.mode === "avoided") {
      avoidedAmount += money.alternativeCost;
    } else {
      realSpent += money.realCost;
    }
  }

  return {
    realSpent: round2(realSpent),
    avoidedAmount: round2(avoidedAmount),
  };
}
