import { round2 } from "@/src/lib/money-number";
import type { EntryMetricsAggregate } from "@/src/lib/entry-metrics";

export type StatsOverview = {
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;          // = netImpact (kept for caller compatibility)
  netImpact: number;
  avoidedAmount: number;
  comparisonSaved: number;
  comparisonOverspent: number;
  grossPositiveImpact: number;
  largeComparisonImpact: number;
  ordinaryImpact: number;
  entriesCount: number;
  averageSavedPerEntry: number;
  savingRatePercent: number;
};

export function overviewFromAggregate(agg: EntryMetricsAggregate): StatsOverview {
  return {
    totalRealSpent: agg.totalSpentReal,
    totalAlternativeCost: agg.totalWouldHaveSpent,
    totalSaved: agg.totalNetImpact,
    netImpact: agg.totalNetImpact,
    avoidedAmount: agg.totalAvoidedAmount,
    comparisonSaved: agg.totalComparisonSaved,
    comparisonOverspent: agg.totalComparisonOverspent,
    grossPositiveImpact: agg.totalGrossPositiveImpact,
    largeComparisonImpact: agg.largeComparisonImpact,
    ordinaryImpact: agg.ordinaryImpact,
    entriesCount: agg.entriesCount,
    averageSavedPerEntry:
      agg.entriesCount === 0 ? 0 : round2(agg.totalNetImpact / agg.entriesCount),
    savingRatePercent:
      agg.totalWouldHaveSpent === 0
        ? 0
        : round2((agg.totalNetImpact / agg.totalWouldHaveSpent) * 100),
  };
}
