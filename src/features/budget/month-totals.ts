import { round2 } from "@/src/lib/money-number";
import { toEntryMoneyView, type EntryMoneyLike } from "@/src/lib/entry-domain";

export type BudgetMonthEntry = EntryMoneyLike;

export type BudgetMonthTotals = {
  ordinarySpent: number;
  avoidedAmount: number;
};

/**
 * Card totals for the /budget month header, computed from the already-loaded
 * month entries so the page needs no separate dashboard-summary query.
 *
 * Mirrors getDashboardSummary for the two fields the page uses:
 * - ordinarySpent: realCost of ordinary expenses (not avoided, not a
 *   comparison), matching SUM("realCost") WHERE mode <> 'avoided'
 *   AND "savingContext" <> 'comparison'.
 * - avoidedAmount: alternativeCost of avoided entries, matching
 *   SUM(CASE WHEN mode = 'avoided' THEN "alternativeCost" ELSE 0 END).
 */
export function computeBudgetMonthTotals(
  entries: ReadonlyArray<BudgetMonthEntry>,
): BudgetMonthTotals {
  let ordinarySpent = 0;
  let avoidedAmount = 0;

  for (const entry of entries) {
    const money = toEntryMoneyView(entry);

    if (money.mode === "avoided") {
      avoidedAmount += money.alternativeCost;
    } else if (money.savingContext !== "comparison") {
      ordinarySpent += money.realCost;
    }
  }

  return {
    ordinarySpent: round2(ordinarySpent),
    avoidedAmount: round2(avoidedAmount),
  };
}
