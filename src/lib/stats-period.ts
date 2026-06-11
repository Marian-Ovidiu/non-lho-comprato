import {
  formatRomeMonthLabel,
  getRomeMonthKey,
  normalizeRomeMonthKey,
} from "@/src/lib/rome-dates";

export const STATS_PERIODS = ["month", "year", "all"] as const;

export type StatsPeriod = (typeof STATS_PERIODS)[number];

export type StatsMonthOption = {
  month: string;
  label: string;
  entriesCount: number;
};

export function getFirstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseStatsPeriod(value?: string): StatsPeriod {
  return STATS_PERIODS.includes(value as StatsPeriod)
    ? (value as StatsPeriod)
    : "month";
}

export function normalizeStatsMonthKey(
  value?: string,
  now: Date = new Date(),
): string {
  return normalizeRomeMonthKey(value, now);
}

export function getCurrentStatsMonthKey(now: Date = new Date()): string {
  return getRomeMonthKey(now);
}

export function getStatsYearFromMonthKey(monthKey: string): string {
  return monthKey.slice(0, 4);
}

export function getStatsMonthLabel(monthKey: string): string {
  return formatRomeMonthLabel(monthKey);
}
