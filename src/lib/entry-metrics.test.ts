import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  aggregateEntryMetrics,
  calculateEntryMetrics,
  LARGE_COMPARISON_THRESHOLD,
} from "@/src/lib/entry-metrics";

// ─── golden fixtures ─────────────────────────────────────────────────────────

// 1. Normal expense: 20 vs 20
const NORMAL_EXPENSE = { realCost: 20, alternativeCost: 20 };
// 2. Avoided purchase: 0 vs 18
const AVOIDED_PURCHASE = { realCost: 0, alternativeCost: 18, savedAmount: 18 };
// 3. Small positive comparison: 5.50 vs 5.80
const SMALL_COMPARISON = { realCost: 5.5, alternativeCost: 5.8 };
// 4. Medium positive comparison: 82.87 vs 150
const MEDIUM_COMPARISON = { realCost: 82.87, alternativeCost: 150 };
// 5. Negative comparison: 37.30 vs 8
const NEGATIVE_COMPARISON = { realCost: 37.3, alternativeCost: 8 };
// 6. Large positive comparison Shein: 19.80 vs 600
const SHEIN = { realCost: 19.8, alternativeCost: 600 };
// 7. Large positive comparison Temu: 27.02 vs 256
const TEMU = { realCost: 27.02, alternativeCost: 256 };

const GOLDEN_FINANCIAL = [
  NORMAL_EXPENSE,
  AVOIDED_PURCHASE,
  SMALL_COMPARISON,
  MEDIUM_COMPARISON,
  NEGATIVE_COMPARISON,
  SHEIN,
  TEMU,
] as const;

// ─── calculateEntryMetrics ────────────────────────────────────────────────────

describe("calculateEntryMetrics", () => {
  describe("golden dataset — per entry", () => {
    it("1. normal expense 20 vs 20: all impact metrics are zero", () => {
      const m = calculateEntryMetrics(NORMAL_EXPENSE);
      assert.equal(m.spentReal, 20);
      assert.equal(m.wouldHaveSpent, 20);
      assert.equal(m.mode, "spent");
      assert.equal(m.savingContext, "none");
      assert.equal(m.isComparisonEntry, false);
      assert.equal(m.avoidedAmount, 0);
      assert.equal(m.comparisonSaved, 0);
      assert.equal(m.comparisonOverspent, 0);
      assert.equal(m.grossPositiveImpact, 0);
      assert.equal(m.netImpact, 0);
      assert.equal(m.isLargeComparison, false);
    });

    it("2. avoided purchase 0 vs 18: full alternativeCost becomes avoidedAmount", () => {
      const m = calculateEntryMetrics(AVOIDED_PURCHASE);
      assert.equal(m.spentReal, 0);
      assert.equal(m.wouldHaveSpent, 18);
      assert.equal(m.mode, "avoided");
      assert.equal(m.savingContext, "comparison");
      assert.equal(m.isComparisonEntry, false);
      assert.equal(m.avoidedAmount, 18);
      assert.equal(m.comparisonSaved, 0);
      assert.equal(m.comparisonOverspent, 0);
      assert.equal(m.grossPositiveImpact, 18);
      assert.equal(m.netImpact, 18);
      assert.equal(m.isLargeComparison, false);
    });

    it("3. small positive comparison 5.50 vs 5.80", () => {
      const m = calculateEntryMetrics(SMALL_COMPARISON);
      assert.equal(m.spentReal, 5.5);
      assert.equal(m.wouldHaveSpent, 5.8);
      assert.equal(m.mode, "spent");
      assert.equal(m.savingContext, "comparison");
      assert.equal(m.isComparisonEntry, true);
      assert.equal(m.avoidedAmount, 0);
      assert.equal(m.comparisonSaved, 0.3);
      assert.equal(m.comparisonOverspent, 0);
      assert.equal(m.grossPositiveImpact, 0.3);
      assert.equal(m.netImpact, 0.3);
      assert.equal(m.isLargeComparison, false);
    });

    it("4. medium positive comparison 82.87 vs 150", () => {
      const m = calculateEntryMetrics(MEDIUM_COMPARISON);
      assert.equal(m.spentReal, 82.87);
      assert.equal(m.wouldHaveSpent, 150);
      assert.equal(m.isComparisonEntry, true);
      assert.equal(m.avoidedAmount, 0);
      assert.equal(m.comparisonSaved, 67.13);
      assert.equal(m.comparisonOverspent, 0);
      assert.equal(m.grossPositiveImpact, 67.13);
      assert.equal(m.netImpact, 67.13);
      assert.equal(m.isLargeComparison, false);
    });

    it("5. negative comparison 37.30 vs 8: user overspent the reference", () => {
      const m = calculateEntryMetrics(NEGATIVE_COMPARISON);
      assert.equal(m.spentReal, 37.3);
      assert.equal(m.wouldHaveSpent, 8);
      assert.equal(m.isComparisonEntry, true);
      assert.equal(m.avoidedAmount, 0);
      assert.equal(m.comparisonSaved, 0);
      assert.equal(m.comparisonOverspent, 29.3);
      assert.equal(m.grossPositiveImpact, 0);
      assert.equal(m.netImpact, -29.3);
      assert.equal(m.isLargeComparison, false);
    });

    it("6. large positive comparison Shein 19.80 vs 600", () => {
      const m = calculateEntryMetrics(SHEIN);
      assert.equal(m.spentReal, 19.8);
      assert.equal(m.wouldHaveSpent, 600);
      assert.equal(m.isComparisonEntry, true);
      assert.equal(m.avoidedAmount, 0);
      assert.equal(m.comparisonSaved, 580.2);
      assert.equal(m.comparisonOverspent, 0);
      assert.equal(m.grossPositiveImpact, 580.2);
      assert.equal(m.netImpact, 580.2);
      assert.equal(m.isLargeComparison, true);
    });

    it("7. large positive comparison Temu 27.02 vs 256", () => {
      const m = calculateEntryMetrics(TEMU);
      assert.equal(m.spentReal, 27.02);
      assert.equal(m.wouldHaveSpent, 256);
      assert.equal(m.isComparisonEntry, true);
      assert.equal(m.avoidedAmount, 0);
      assert.equal(m.comparisonSaved, 228.98);
      assert.equal(m.comparisonOverspent, 0);
      assert.equal(m.grossPositiveImpact, 228.98);
      assert.equal(m.netImpact, 228.98);
      assert.equal(m.isLargeComparison, true);
    });

    it("8. shared expense: Martina pays 20 EUR for Marian + Martina", () => {
      const m = calculateEntryMetrics({
        realCost: 20,
        alternativeCost: 20,
        paidByUserId: "user-martina",
        beneficiaries: [
          { userId: "user-marian" },
          { userId: "user-martina" },
        ],
      });
      assert.equal(m.spentReal, 20);
      assert.equal(m.paidByUserId, "user-martina");
      assert.equal(m.beneficiaryCount, 2);
      assert.equal(m.sharePerBeneficiary, 10);
      assert.equal(m.isShared, true);
      assert.deepEqual(m.beneficiaryUserIds, ["user-marian", "user-martina"]);
    });

    it("9. personal expense Marian: single beneficiary, full share", () => {
      const m = calculateEntryMetrics({
        realCost: 15,
        alternativeCost: 15,
        paidByUserId: "user-marian",
        beneficiaries: [{ userId: "user-marian" }],
      });
      assert.equal(m.paidByUserId, "user-marian");
      assert.equal(m.beneficiaryCount, 1);
      assert.equal(m.sharePerBeneficiary, 15);
      assert.equal(m.isShared, false);
    });

    it("10. personal expense Martina: single beneficiary, full share", () => {
      const m = calculateEntryMetrics({
        realCost: 30,
        alternativeCost: 30,
        paidByUserId: "user-martina",
        beneficiaries: [{ userId: "user-martina" }],
      });
      assert.equal(m.paidByUserId, "user-martina");
      assert.equal(m.beneficiaryCount, 1);
      assert.equal(m.sharePerBeneficiary, 30);
      assert.equal(m.isShared, false);
    });

    it("11. end-of-month entry: metric computation is date-agnostic", () => {
      // entry-metrics.ts has no date logic. Period grouping by entry.date
      // (not createdAt) is enforced at caller level in stats/reports/dashboard.
      const endOfMonth = {
        ...NORMAL_EXPENSE,
        date: new Date("2026-12-31"),
      };
      const m = calculateEntryMetrics(endOfMonth);
      assert.equal(m.spentReal, 20);
      assert.equal(m.netImpact, 0);
    });

    it("12. entry inserted later with earlier date: createdAt is not part of EntryMetricsInput", () => {
      // Proves that createdAt cannot affect metric values.
      // Financial period classification uses entry.date at the caller level.
      const lateInsert = {
        ...SMALL_COMPARISON,
        date: new Date("2026-01-01"),
        createdAt: new Date("2026-03-15"),
      };
      const m = calculateEntryMetrics(lateInsert);
      assert.equal(m.comparisonSaved, 0.3);
      assert.equal(m.netImpact, 0.3);
    });
  });

  describe("isLargeComparison", () => {
    it("LARGE_COMPARISON_THRESHOLD is 100", () => {
      assert.equal(LARGE_COMPARISON_THRESHOLD, 100);
    });

    it("entry at exactly 100 netImpact is large", () => {
      const m = calculateEntryMetrics({
        realCost: 0,
        alternativeCost: 100,
        mode: "spent",
        savingContext: "comparison",
      });
      assert.equal(m.netImpact, 100);
      assert.equal(m.isLargeComparison, true);
    });

    it("entry at 99.99 netImpact is not large", () => {
      const m = calculateEntryMetrics({
        realCost: 0.01,
        alternativeCost: 100,
        mode: "spent",
        savingContext: "comparison",
      });
      assert.equal(m.netImpact, 99.99);
      assert.equal(m.isLargeComparison, false);
    });

    it("negative impact at -100 is large (absolute value threshold)", () => {
      const m = calculateEntryMetrics({
        realCost: 100,
        alternativeCost: 0,
        mode: "spent",
        savingContext: "comparison",
      });
      assert.equal(m.netImpact, -100);
      assert.equal(m.isLargeComparison, true);
    });

    it("avoided entry with 500 EUR impact is never large comparison", () => {
      // isLargeComparison only applies to mode=spent + savingContext=comparison.
      // Avoided entries are excluded by design — per 01_METRICS_REFACTOR_PLAN.md.
      const m = calculateEntryMetrics({
        realCost: 0,
        alternativeCost: 500,
        savedAmount: 500,
      });
      assert.equal(m.mode, "avoided");
      assert.equal(m.isComparisonEntry, false);
      assert.equal(m.avoidedAmount, 500);
      assert.equal(m.netImpact, 500);
      assert.equal(m.isLargeComparison, false);
    });

    it("normal expense is never large comparison regardless of amount", () => {
      const m = calculateEntryMetrics({ realCost: 5000, alternativeCost: 5000 });
      assert.equal(m.mode, "spent");
      assert.equal(m.savingContext, "none");
      assert.equal(m.isComparisonEntry, false);
      assert.equal(m.netImpact, 0);
      assert.equal(m.isLargeComparison, false);
    });
  });

  describe("sharing fields", () => {
    it("no beneficiaries returns empty arrays and zero share", () => {
      const m = calculateEntryMetrics({ realCost: 20, alternativeCost: 20 });
      assert.deepEqual(m.beneficiaryUserIds, []);
      assert.equal(m.beneficiaryCount, 0);
      assert.equal(m.sharePerBeneficiary, 0);
      assert.equal(m.isShared, false);
      assert.equal(m.paidByUserId, null);
    });

    it("deduplicates repeated beneficiary user IDs", () => {
      const m = calculateEntryMetrics({
        realCost: 30,
        alternativeCost: 30,
        beneficiaries: [
          { userId: "user-a" },
          { userId: "user-a" },
          { userId: "user-b" },
        ],
      });
      assert.equal(m.beneficiaryCount, 2);
      assert.equal(m.sharePerBeneficiary, 15);
      assert.equal(m.isShared, true);
    });

    it("paidByUserId is preserved as-is when provided", () => {
      const m = calculateEntryMetrics({
        realCost: 10,
        alternativeCost: 10,
        paidByUserId: "user-abc-123",
      });
      assert.equal(m.paidByUserId, "user-abc-123");
    });

    it("paidByUserId is null when not provided", () => {
      const m = calculateEntryMetrics({ realCost: 10, alternativeCost: 10 });
      assert.equal(m.paidByUserId, null);
    });
  });
});

// ─── aggregateEntryMetrics ────────────────────────────────────────────────────

describe("aggregateEntryMetrics", () => {
  it("empty array returns zero aggregate", () => {
    const agg = aggregateEntryMetrics([]);
    assert.equal(agg.entriesCount, 0);
    assert.equal(agg.totalSpentReal, 0);
    assert.equal(agg.totalNetImpact, 0);
    assert.equal(agg.largeComparisonImpact, 0);
    assert.equal(agg.ordinaryImpact, 0);
    assert.equal(agg.totalGrossPositiveImpact, 0);
  });

  it("Shein + Temu: largeComparisonImpact = 809.18 from real dataset", () => {
    const agg = aggregateEntryMetrics([SHEIN, TEMU]);
    assert.equal(agg.largeComparisonImpact, 809.18);
    assert.equal(agg.totalNetImpact, 809.18);
    assert.equal(agg.ordinaryImpact, 0);
    assert.equal(agg.entriesCount, 2);
  });

  it("golden aggregate across all 7 financial entries", () => {
    const agg = aggregateEntryMetrics(GOLDEN_FINANCIAL);

    assert.equal(agg.entriesCount, 7);
    assert.equal(agg.totalSpentReal, 192.49);
    assert.equal(agg.totalWouldHaveSpent, 1057.8);
    assert.equal(agg.totalAvoidedAmount, 18);
    assert.equal(agg.totalComparisonSaved, 876.61);
    assert.equal(agg.totalComparisonOverspent, 29.3);
    assert.equal(agg.totalGrossPositiveImpact, 894.61);
    assert.equal(agg.totalNetImpact, 865.31);
    assert.equal(agg.largeComparisonImpact, 809.18);
    assert.equal(agg.ordinaryImpact, 56.13);
  });

  it("formula: grossPositiveImpact = avoidedAmount + comparisonSaved", () => {
    const agg = aggregateEntryMetrics(GOLDEN_FINANCIAL);
    assert.equal(agg.totalGrossPositiveImpact, 894.61);
    assert.equal(agg.totalAvoidedAmount + agg.totalComparisonSaved, 894.61);
  });

  it("formula: ordinaryImpact = netImpact - largeComparisonImpact", () => {
    const agg = aggregateEntryMetrics(GOLDEN_FINANCIAL);
    assert.equal(agg.ordinaryImpact, 56.13);
    // Without Shein and Temu, ordinary impact = 0 + 18 + 0.30 + 67.13 - 29.30 = 56.13
    const withoutLarge = aggregateEntryMetrics([
      NORMAL_EXPENSE,
      AVOIDED_PURCHASE,
      SMALL_COMPARISON,
      MEDIUM_COMPARISON,
      NEGATIVE_COMPARISON,
    ]);
    assert.equal(withoutLarge.totalNetImpact, 56.13);
    assert.equal(withoutLarge.largeComparisonImpact, 0);
    assert.equal(withoutLarge.ordinaryImpact, 56.13);
  });

  it("single normal expense: all zero impact, correct spentReal", () => {
    const agg = aggregateEntryMetrics([NORMAL_EXPENSE]);
    assert.equal(agg.totalSpentReal, 20);
    assert.equal(agg.totalNetImpact, 0);
    assert.equal(agg.largeComparisonImpact, 0);
    assert.equal(agg.ordinaryImpact, 0);
    assert.equal(agg.entriesCount, 1);
  });

  it("single avoided purchase: avoidedAmount contributes to grossPositiveImpact but not largeComparisonImpact", () => {
    const agg = aggregateEntryMetrics([AVOIDED_PURCHASE]);
    assert.equal(agg.totalAvoidedAmount, 18);
    assert.equal(agg.totalGrossPositiveImpact, 18);
    assert.equal(agg.totalNetImpact, 18);
    assert.equal(agg.largeComparisonImpact, 0);
    assert.equal(agg.ordinaryImpact, 18);
  });
});
