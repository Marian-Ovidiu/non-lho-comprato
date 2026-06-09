"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  CraftedIcon,
  Label,
  Mono,
  Rule,
  Serif,
  StatTrio,
} from "@/components/crafted";
import { CraftedDailySpendingHeatmap } from "@/src/components/stats/crafted-daily-spending-heatmap";
import {
  CraftedTopSavingsList,
  type CraftedTopSavingsItem,
} from "@/src/components/stats/crafted-top-savings-list";
import {
  CATEGORY_TONE_CLASS,
  buildCraftedStatsQueen,
  getActiveDays,
  getAverageMonthlySaved,
  getMaxChartSaved,
  getMonthChartData,
  getPeriodHero,
  getPeriodOverview,
  getTrendAboveAverage,
  type CraftedStatsProps,
} from "@/src/lib/crafted-stats-build";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import {
  formatCraftedCompact,
  splitCraftedAmount,
} from "@/src/lib/crafted-money";
import { cn } from "@/lib/utils";
import { getRomeDateKey } from "@/src/lib/rome-dates";
import type { CraftedStatsPeriod } from "@/src/lib/crafted-stats-build";

const PERIOD_TABS: Array<{ id: CraftedStatsPeriod; label: string }> = [
  { id: "month", label: "Mese" },
  { id: "year", label: "Anno" },
  { id: "all", label: "Sempre" },
];

function formatOverviewPercent(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(value);
}

type CraftedStatsComponentProps = CraftedStatsProps & {
  topSavings?: CraftedTopSavingsItem[];
  habitStats?: Array<{
    habitId: string;
    habitName: string;
    totalSaved: number;
    disciplineRatePercent: number;
  }>;
};

function CraftedCategoryBars({
  categories,
}: {
  categories: CraftedStatsProps["categories"];
}) {
  if (categories.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-ink-3">
        Nessun dato per categoria ancora disponibile.
      </p>
    );
  }

  return (
    <div className="px-5 pb-1">
      {categories.map((category, index) => (
        <div
          key={category.categoryId}
          className={cn(
            "py-3",
            index < categories.length - 1 && "border-b border-line-soft",
          )}
        >
          <div className="mb-2 flex items-center gap-3">
            <CraftedIcon
              name={getCategoryCraftedIcon({ slug: category.slug, name: category.name })}
              size={18}
              className="text-muted-foreground"
            />
            <span className="min-w-0 flex-1 text-sm font-[450]">{category.name}</span>
            <Mono className="mr-3 text-[11px] text-ink-3">{category.pct}%</Mono>
            <Mono className="text-sm font-medium whitespace-nowrap">
              {formatCraftedCompact(category.saved)}
              <span className="text-[11px] text-accent">€</span>
            </Mono>
          </div>
          <div className="relative h-0.5 overflow-hidden rounded-[1px] bg-line">
            <div
              className={cn(
                "absolute inset-y-0 left-0 max-w-full",
                CATEGORY_TONE_CLASS[category.tone],
              )}
              style={{ width: `${Math.min(Math.max(category.pct, 0), 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CraftedStats({
  monthlyStats,
  categoryStats,
  overview,
  insights,
  dailySpendingComparison,
  currentMonthLabel,
  queen: initialQueen,
  categories,
  topSavings = [],
  habitStats = [],
}: CraftedStatsComponentProps) {
  const [period, setPeriod] = useState<CraftedStatsPeriod>("month");

  const hero = useMemo(
    () =>
      getPeriodHero({
        period,
        monthlyStats,
        overview,
        currentMonthLabel,
      }),
    [period, monthlyStats, overview, currentMonthLabel],
  );

  const heroAmount = splitCraftedAmount(hero.amount);
  const periodOverview = useMemo(
    () =>
      getPeriodOverview({
        period,
        monthlyStats,
        overview,
      }),
    [period, monthlyStats, overview],
  );
  const trendPct = useMemo(
    () =>
      getTrendAboveAverage({
        period,
        monthlyStats,
        heroAmount: hero.amount,
      }),
    [period, monthlyStats, hero.amount],
  );

  const chartData = useMemo(() => getMonthChartData(monthlyStats), [monthlyStats]);
  const maxChartSaved = useMemo(() => getMaxChartSaved(monthlyStats), [monthlyStats]);
  const averageMonthlySaved = useMemo(
    () => getAverageMonthlySaved(monthlyStats),
    [monthlyStats],
  );
  const activeDays = useMemo(
    () => getActiveDays(dailySpendingComparison),
    [dailySpendingComparison],
  );

  const queen = useMemo(() => {
    if (period !== "month") {
      const top = categoryStats[0];
      if (!top) {
        return null;
      }

      const periodTotal =
        period === "year"
          ? monthlyStats
              .filter((month) => month.month.startsWith(getRomeDateKey(new Date()).slice(0, 4)))
              .reduce((sum, month) => sum + month.totalSaved, 0)
          : overview.totalSaved;

      return buildCraftedStatsQueen({
        insights,
        categoryStats,
        periodTotalSaved: periodTotal,
      });
    }

    return initialQueen;
  }, [period, categoryStats, monthlyStats, overview.totalSaved, insights, initialQueen]);

  const queenMonthLabel =
    currentMonthLabel.split(" ")[0]?.toLowerCase() ?? currentMonthLabel.toLowerCase();

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <div className="flex gap-5 overflow-x-auto px-5 pt-6 pb-0">
        {PERIOD_TABS.map((tab) => {
          const selected = period === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPeriod(tab.id)}
              className={cn(
                "shrink-0 border-b-[1.5px] pb-2 text-[13px] transition-colors",
                selected
                  ? "border-accent font-semibold text-foreground"
                  : "border-transparent font-[450] text-ink-3",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <Rule className="mt-0" />

      <section className="px-5 py-6">
        <Label className="mb-3.5 block">{hero.label}</Label>
        <div className="flex items-start gap-1.5">
          <Mono className="text-[clamp(3rem,16vw,4.5rem)] font-semibold leading-[0.85] tracking-[-0.055em]">
            {heroAmount.whole}
          </Mono>
          <Mono className="mt-1.5 text-2xl font-medium text-muted-foreground">
            ,{heroAmount.decimals}€
          </Mono>
        </div>
        {trendPct !== null && trendPct !== 0 ? (
          <div className="mt-3 flex items-center gap-1.5">
            <CraftedIcon
              name="arrowUp"
              size={13}
              strokeWidth={2}
              className={cn(trendPct < 0 && "rotate-180", "text-accent")}
            />
            <span className="text-[12.5px] text-muted-foreground">
              <Mono className="text-foreground">{Math.abs(trendPct)}%</Mono>{" "}
              {trendPct > 0 ? "sopra" : "sotto"} la tua media
            </span>
          </div>
        ) : null}
      </section>

      <section className="px-5 pb-1">
        <Label className="mb-3 block">Bilancio</Label>
      </section>
      <StatTrio
        items={[
          {
            label: "Speso davvero",
            value: formatCraftedCompact(periodOverview.totalRealSpent),
            suffix: "€",
          },
          {
            label: "Avresti speso",
            value: formatCraftedCompact(periodOverview.totalAlternativeCost),
            suffix: "€",
          },
          {
            label: "Tenuti",
            value: formatCraftedCompact(periodOverview.totalSaved),
            suffix: "€",
          },
        ]}
      />
      <StatTrio
        items={[
          {
            label: "Efficienza",
            value: formatOverviewPercent(periodOverview.savingRatePercent),
            suffix: "%",
          },
          {
            label: "Media/scelta",
            value: formatCraftedCompact(periodOverview.averageSavedPerEntry),
            suffix: "€",
          },
        ]}
      />
      <Rule />

      <section className="px-5 pb-2">
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <Label>Ultimi 12 mesi</Label>
          {maxChartSaved > 0 ? (
            <Mono className="text-[11px] text-ink-3">
              max {formatCraftedCompact(maxChartSaved)}€
            </Mono>
          ) : null}
        </div>

        {chartData.length === 0 ? (
          <p className="py-10 text-sm text-ink-3">Nessun dato mensile ancora disponibile.</p>
        ) : (
          <div className="flex h-[120px] items-end gap-1.5">
            {chartData.map((month) => (
              <div
                key={month.month}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <div
                  className={cn(
                    "w-full min-h-[3px] rounded-[1px]",
                    month.isActive ? "bg-accent" : "bg-ink-3",
                  )}
                  style={{ height: `${Math.max(month.heightPct, month.totalSaved > 0 ? 4 : 0)}%` }}
                  title={`${month.initial}: ${formatCraftedCompact(month.totalSaved)}€`}
                />
                <Mono
                  className={cn(
                    "text-[9.5px]",
                    month.isActive ? "text-foreground" : "text-ink-3",
                  )}
                >
                  {month.initial}
                </Mono>
              </div>
            ))}
          </div>
        )}
      </section>
      <Rule />

      {period === "month" ? (
        <>
          <CraftedDailySpendingHeatmap data={dailySpendingComparison} />
          <Rule />
        </>
      ) : null}

      {queen ? (
        <>
          <section className="px-5 py-5">
            <Label className="mb-3.5 block">
              {period === "month"
                ? `La regina di ${queenMonthLabel}`
                : "La regina del periodo"}
            </Label>
            <div className="flex items-center gap-4">
              <CraftedIcon
                name={getCategoryCraftedIcon({ slug: queen.slug, name: queen.name })}
                size={30}
                strokeWidth={1.4}
                className="text-accent"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <Mono className="text-[28px] font-semibold leading-none">
                    {formatCraftedCompact(queen.saved)}€
                  </Mono>
                  <span className="text-sm text-muted-foreground">in {queen.name}</span>
                </div>
                <Serif className="mt-1 block text-sm text-ink-3">
                  il {queen.pct}% di tutto, in {queen.entriesCount}{" "}
                  {queen.entriesCount === 1 ? "movimento" : "movimenti"}.
                </Serif>
              </div>
            </div>
          </section>
          <Rule />
        </>
      ) : null}

      <section className="px-5 py-5 pb-2">
        <Label>Per categoria</Label>
      </section>
      <CraftedCategoryBars categories={categories} />
      <Rule />

      <CraftedTopSavingsList entries={topSavings} />
      <Rule />

      <StatTrio
        items={[
          {
            label: "Media/mese",
            value: formatCraftedCompact(averageMonthlySaved),
            suffix: "€",
          },
          {
            label: "Giorni attivi",
            value: activeDays,
          },
          {
            label: "Movimenti",
            value: period === "all" ? overview.entriesCount : hero.entriesCount,
          },
        ]}
      />

      {habitStats.length > 0 ? (
        <>
          <Rule />
          <section className="px-5 py-5">
            <Label className="mb-4 block">Abitudini</Label>
            <div>
              {habitStats.map((habit, index) => (
                <div
                  key={habit.habitId}
                  className={cn(
                    "flex items-center justify-between gap-4 py-3",
                    index < habitStats.length - 1 && "border-b border-line-soft",
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{habit.habitName}</p>
                    <p className="mt-0.5 text-xs text-ink-3">
                      {Math.round(habit.disciplineRatePercent)}% disciplina
                    </p>
                  </div>
                  <Mono className="text-sm font-medium whitespace-nowrap">
                    {formatCraftedCompact(habit.totalSaved)}
                    <span className="text-[11px] text-accent">€</span>
                  </Mono>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
