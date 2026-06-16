import { Prisma } from "@/src/lib/generated/prisma/client";
import type { EntryMetricsAggregate } from "@/src/lib/entry-metrics";
import { LARGE_COMPARISON_THRESHOLD } from "@/src/lib/entry-metrics";

type DecimalLike = {
  toString?: () => string;
};

export type EntryMetricAggregateRow = {
  totalSpentReal: unknown;
  totalWouldHaveSpent: unknown;
  totalAvoidedAmount: unknown;
  totalComparisonSaved: unknown;
  totalComparisonOverspent: unknown;
  totalGrossPositiveImpact: unknown;
  totalNetImpact: unknown;
  largeComparisonImpact: unknown;
  ordinaryImpact: unknown;
  entriesCount: number;
};

export type EntryMetricDateRange = {
  start?: Date;
  end?: Date;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toMetricNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === "object") {
    const decimal = value as DecimalLike;
    if (typeof decimal.toString === "function") {
      const parsed = Number(decimal.toString().replace(",", "."));
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }

  return 0;
}

export const entryNetImpactSql = Prisma.sql`
  (
    CASE
      WHEN e."mode"::text = 'avoided' THEN e."alternativeCost"
      ELSE 0::numeric
    END
    +
    CASE
      WHEN e."mode"::text = 'spent'
        AND e."savingContext"::text = 'comparison'
        THEN GREATEST(e."alternativeCost" - e."realCost", 0::numeric)
      ELSE 0::numeric
    END
    -
    CASE
      WHEN e."mode"::text = 'spent'
        AND e."savingContext"::text = 'comparison'
        THEN GREATEST(e."realCost" - e."alternativeCost", 0::numeric)
      ELSE 0::numeric
    END
  )
`;

const entryAvoidedAmountSql = Prisma.sql`
  CASE
    WHEN e."mode"::text = 'avoided' THEN e."alternativeCost"
    ELSE 0::numeric
  END
`;

const entryComparisonSavedSql = Prisma.sql`
  CASE
    WHEN e."mode"::text = 'spent'
      AND e."savingContext"::text = 'comparison'
      THEN GREATEST(e."alternativeCost" - e."realCost", 0::numeric)
    ELSE 0::numeric
  END
`;

const entryComparisonOverspentSql = Prisma.sql`
  CASE
    WHEN e."mode"::text = 'spent'
      AND e."savingContext"::text = 'comparison'
      THEN GREATEST(e."realCost" - e."alternativeCost", 0::numeric)
    ELSE 0::numeric
  END
`;

const entryLargeComparisonImpactSql = Prisma.sql`
  CASE
    WHEN e."mode"::text = 'spent'
      AND e."savingContext"::text = 'comparison'
      AND ABS(${entryNetImpactSql}) >= ${LARGE_COMPARISON_THRESHOLD}
      THEN ${entryNetImpactSql}
    ELSE 0::numeric
  END
`;

export const entryMetricAggregateSelectSql = Prisma.sql`
  COALESCE(SUM(e."realCost"), 0)::text AS "totalSpentReal",
  COALESCE(SUM(e."alternativeCost"), 0)::text AS "totalWouldHaveSpent",
  COALESCE(SUM(${entryAvoidedAmountSql}), 0)::text AS "totalAvoidedAmount",
  COALESCE(SUM(${entryComparisonSavedSql}), 0)::text AS "totalComparisonSaved",
  COALESCE(SUM(${entryComparisonOverspentSql}), 0)::text AS "totalComparisonOverspent",
  COALESCE(SUM(${entryAvoidedAmountSql} + ${entryComparisonSavedSql}), 0)::text AS "totalGrossPositiveImpact",
  COALESCE(SUM(${entryNetImpactSql}), 0)::text AS "totalNetImpact",
  COALESCE(SUM(${entryLargeComparisonImpactSql}), 0)::text AS "largeComparisonImpact",
  COALESCE(SUM(${entryNetImpactSql} - ${entryLargeComparisonImpactSql}), 0)::text AS "ordinaryImpact",
  COUNT(*)::int AS "entriesCount"
`;

export function entryMetricDateRangeSql(range: EntryMetricDateRange = {}) {
  return Prisma.sql`
    ${range.start ? Prisma.sql`AND e."date" >= ${range.start}` : Prisma.empty}
    ${range.end ? Prisma.sql`AND e."date" < ${range.end}` : Prisma.empty}
  `;
}

export function entryMetricMemberFilterSql(memberUserId: string | undefined) {
  if (!memberUserId) {
    return Prisma.empty;
  }

  return Prisma.sql`
    AND (
      (
        e."paidByUserId" = ${memberUserId}
        AND EXISTS (
          SELECT 1
          FROM "EntryBeneficiary" eb
          WHERE eb."entryId" = e."id"
            AND eb."userId" <> ${memberUserId}
        )
      )
      OR
      (
        EXISTS (
          SELECT 1
          FROM "EntryBeneficiary" eb
          WHERE eb."entryId" = e."id"
            AND eb."userId" = ${memberUserId}
        )
        AND NOT EXISTS (
          SELECT 1
          FROM "EntryBeneficiary" eb
          WHERE eb."entryId" = e."id"
            AND eb."userId" <> ${memberUserId}
        )
      )
    )
  `;
}

export function normalizeEntryMetricAggregate(
  row: EntryMetricAggregateRow | null | undefined,
): EntryMetricsAggregate {
  if (!row) {
    return {
      totalSpentReal: 0,
      totalWouldHaveSpent: 0,
      totalAvoidedAmount: 0,
      totalComparisonSaved: 0,
      totalComparisonOverspent: 0,
      totalGrossPositiveImpact: 0,
      totalNetImpact: 0,
      largeComparisonImpact: 0,
      ordinaryImpact: 0,
      entriesCount: 0,
    };
  }

  return {
    totalSpentReal: round2(toMetricNumber(row.totalSpentReal)),
    totalWouldHaveSpent: round2(toMetricNumber(row.totalWouldHaveSpent)),
    totalAvoidedAmount: round2(toMetricNumber(row.totalAvoidedAmount)),
    totalComparisonSaved: round2(toMetricNumber(row.totalComparisonSaved)),
    totalComparisonOverspent: round2(toMetricNumber(row.totalComparisonOverspent)),
    totalGrossPositiveImpact: round2(toMetricNumber(row.totalGrossPositiveImpact)),
    totalNetImpact: round2(toMetricNumber(row.totalNetImpact)),
    largeComparisonImpact: round2(toMetricNumber(row.largeComparisonImpact)),
    ordinaryImpact: round2(toMetricNumber(row.ordinaryImpact)),
    entriesCount: toMetricNumber(row.entriesCount),
  };
}
