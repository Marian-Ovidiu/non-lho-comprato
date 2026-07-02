import { round2 } from "@/src/lib/money-number";
import {
  toEntryMoneyView,
  type EntryMoneyLike,
} from "@/src/lib/entry-domain";

export const LARGE_COMPARISON_THRESHOLD = 100;

export type EntryMetricsInput = EntryMoneyLike & {
  paidByUserId?: string | null;
  beneficiaries?: ReadonlyArray<{ userId: string }>;
};

export type EntryMetrics = {
  spentReal: number;
  wouldHaveSpent: number;
  mode: "spent" | "avoided";
  savingContext: "none" | "comparison";
  isComparisonEntry: boolean;
  avoidedAmount: number;
  comparisonSaved: number;
  comparisonOverspent: number;
  grossPositiveImpact: number;
  netImpact: number;
  isLargeComparison: boolean;
  paidByUserId: string | null;
  beneficiaryUserIds: string[];
  beneficiaryCount: number;
  sharePerBeneficiary: number;
  isShared: boolean;
};

export type EntryMetricsAggregate = {
  totalSpentReal: number;
  totalWouldHaveSpent: number;
  totalAvoidedAmount: number;
  totalComparisonSaved: number;
  totalComparisonOverspent: number;
  totalGrossPositiveImpact: number;
  totalNetImpact: number;
  largeComparisonImpact: number;
  ordinaryImpact: number;
  entriesCount: number;
};

function normalizeBeneficiaryUserIds(
  beneficiaries: ReadonlyArray<{ userId: string }> | undefined,
): string[] {
  if (!beneficiaries || beneficiaries.length === 0) {
    return [];
  }
  return Array.from(
    new Set(beneficiaries.map((b) => b.userId.trim()).filter(Boolean)),
  );
}

export function calculateEntryMetrics(entry: EntryMetricsInput): EntryMetrics {
  const money = toEntryMoneyView(entry);
  const { realCost, alternativeCost, mode, savingContext } = money;

  const isComparisonEntry = mode === "spent" && savingContext === "comparison";

  let avoidedAmount = 0;
  let comparisonSaved = 0;
  let comparisonOverspent = 0;

  if (mode === "avoided") {
    avoidedAmount = round2(alternativeCost);
  } else if (isComparisonEntry) {
    comparisonSaved = round2(Math.max(0, alternativeCost - realCost));
    comparisonOverspent = round2(Math.max(0, realCost - alternativeCost));
  }

  const grossPositiveImpact = round2(avoidedAmount + comparisonSaved);
  const netImpact = round2(
    avoidedAmount + comparisonSaved - comparisonOverspent,
  );
  const isLargeComparison =
    isComparisonEntry && Math.abs(netImpact) >= LARGE_COMPARISON_THRESHOLD;

  const beneficiaryUserIds = normalizeBeneficiaryUserIds(entry.beneficiaries);
  const beneficiaryCount = beneficiaryUserIds.length;
  const sharePerBeneficiary =
    beneficiaryCount > 0 ? round2(realCost / beneficiaryCount) : 0;
  const isShared = beneficiaryCount > 1;

  return {
    spentReal: realCost,
    wouldHaveSpent: alternativeCost,
    mode,
    savingContext,
    isComparisonEntry,
    avoidedAmount,
    comparisonSaved,
    comparisonOverspent,
    grossPositiveImpact,
    netImpact,
    isLargeComparison,
    paidByUserId: entry.paidByUserId ?? null,
    beneficiaryUserIds,
    beneficiaryCount,
    sharePerBeneficiary,
    isShared,
  };
}

export function aggregateEntryMetrics(
  entries: ReadonlyArray<EntryMetricsInput>,
): EntryMetricsAggregate {
  let totalSpentReal = 0;
  let totalWouldHaveSpent = 0;
  let totalAvoidedAmount = 0;
  let totalComparisonSaved = 0;
  let totalComparisonOverspent = 0;
  let totalNetImpact = 0;
  let largeComparisonImpact = 0;

  for (const entry of entries) {
    const m = calculateEntryMetrics(entry);
    totalSpentReal = round2(totalSpentReal + m.spentReal);
    totalWouldHaveSpent = round2(totalWouldHaveSpent + m.wouldHaveSpent);
    totalAvoidedAmount = round2(totalAvoidedAmount + m.avoidedAmount);
    totalComparisonSaved = round2(totalComparisonSaved + m.comparisonSaved);
    totalComparisonOverspent = round2(
      totalComparisonOverspent + m.comparisonOverspent,
    );
    totalNetImpact = round2(totalNetImpact + m.netImpact);
    if (m.isLargeComparison) {
      largeComparisonImpact = round2(largeComparisonImpact + m.netImpact);
    }
  }

  const totalGrossPositiveImpact = round2(
    totalAvoidedAmount + totalComparisonSaved,
  );
  const ordinaryImpact = round2(totalNetImpact - largeComparisonImpact);

  return {
    totalSpentReal,
    totalWouldHaveSpent,
    totalAvoidedAmount,
    totalComparisonSaved,
    totalComparisonOverspent,
    totalGrossPositiveImpact,
    totalNetImpact,
    largeComparisonImpact,
    ordinaryImpact,
    entriesCount: entries.length,
  };
}
