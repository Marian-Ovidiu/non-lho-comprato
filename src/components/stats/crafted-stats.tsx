"use client";

import { useMemo, useState } from "react";

import {
  CraftedIcon,
  Label,
  Mono,
  ProgressLine,
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
  getAverageMonthlySpent,
  getMaxChartSpent,
  getMonthChartData,
  getPeriodHero,
  getPeriodOverview,
  getTrendAboveAverage,
  type CraftedStatsProps,
} from "@/src/lib/crafted-stats-build";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import {
  CraftedAmount,
  CraftedOdometer,
  GrowBar,
  Stagger,
} from "@/components/crafted/motion";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import { cn } from "@/lib/utils";
import { getRomeDateKey } from "@/src/lib/rome-dates";
import type { CraftedStatsPeriod } from "@/src/lib/crafted-stats-build";

const PERIOD_TABS: Array<{ id: CraftedStatsPeriod; label: string }> = [
  { id: "month", label: "Mese" },
  { id: "year", label: "Anno" },
  { id: "all", label: "Sempre" },
];

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
              {formatCraftedCompact(category.spent)}
              <span className="text-[11px] text-accent">€</span>
            </Mono>
          </div>
          {category.saved > 0 ? (
            <Serif className="mb-2 block text-[12.5px] text-ink-3">
              {formatCraftedCompact(category.saved)}€ evitati / risparmiati
            </Serif>
          ) : null}
          <ProgressLine
            value={category.pct}
            className="rounded-[1px]"
            indicatorClassName={CATEGORY_TONE_CLASS[category.tone]}
          />
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
  const maxChartSpent = useMemo(() => getMaxChartSpent(monthlyStats), [monthlyStats]);
  const averageMonthlySpent = useMemo(
    () => getAverageMonthlySpent(monthlyStats),
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
              .reduce((sum, month) => sum + month.totalRealSpent, 0)
          : overview.totalRealSpent;

      return buildCraftedStatsQueen({
        insights,
        categoryStats,
        periodTotalSpent: periodTotal,
      });
    }

    return initialQueen;
  }, [period, categoryStats, monthlyStats, overview.totalRealSpent, insights, initialQueen]);

  const queenMonthLabel =
    currentMonthLabel.split(" ")[0]?.toLowerCase() ?? currentMonthLabel.toLowerCase();

  return (
    <Stagger className="-mx-4 sm:-mx-6 lg:-mx-8">
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
        <CraftedOdometer
          value={hero.amount}
          integerClassName="text-[clamp(3rem,16vw,4.5rem)] font-semibold leading-[0.85] tracking-[-0.055em]"
          fractionWrapperClassName="mt-1.5"
          fractionClassName="text-2xl font-medium text-muted-foreground"
          suffixClassName="text-2xl font-medium text-muted-foreground"
        />
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
            label: "Speso",
            value: <CraftedAmount value={periodOverview.totalRealSpent} />,
            suffix: "€",
          },
          {
            label: "Evitato/risparmiato",
            value: <CraftedAmount value={periodOverview.totalSaved} />,
            suffix: "€",
          },
          {
            label: "Movimenti",
            value: (
              <CraftedAmount
                value={period === "all" ? overview.entriesCount : hero.entriesCount}
                maximumFractionDigits={0}
              />
            ),
          },
        ]}
      />
      <StatTrio
        items={[
          {
            label: "Confronto stimato",
            value: <CraftedAmount value={periodOverview.totalAlternativeCost} />,
            suffix: "€",
          },
          {
            label: "Impatto medio",
            value: <CraftedAmount value={periodOverview.averageSavedPerEntry} />,
            suffix: "€",
          },
          {
            label: "Efficienza",
            value: (
              <CraftedAmount
                value={periodOverview.savingRatePercent}
                maximumFractionDigits={1}
              />
            ),
            suffix: "%",
          },
        ]}
      />
      <Rule />

      <section className="px-5 pb-2">
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <Label>Spesa ultimi 12 mesi</Label>
          {maxChartSpent > 0 ? (
            <Mono className="text-[11px] text-ink-3">
              max {formatCraftedCompact(maxChartSpent)}€
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
                <GrowBar
                  className="flex w-full flex-1 items-end"
                  barClassName={cn(
                    "w-full min-h-[3px] rounded-[1px]",
                    month.isActive ? "bg-accent" : "bg-ink-3",
                  )}
                  style={{ height: `${Math.max(month.heightPct, month.totalRealSpent > 0 ? 4 : 0)}%` }}
                  title={`${month.initial}: ${formatCraftedCompact(month.totalRealSpent)}€ spesi`}
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
                ? `Categoria principale di ${queenMonthLabel}`
                : "Categoria principale del periodo"}
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
                    {formatCraftedCompact(queen.spent)}€
                  </Mono>
                  <span className="text-sm text-muted-foreground">spesi in {queen.name}</span>
                </div>
                <Serif className="mt-1 block text-sm text-ink-3">
                  il {queen.pct}% di tutto, in {queen.entriesCount}{" "}
                  {queen.entriesCount === 1 ? "movimento" : "movimenti"}.
                  {queen.saved > 0
                    ? ` ${formatCraftedCompact(queen.saved)}€ evitati / risparmiati.`
                    : ""}
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
            label: "Media spesa/mese",
            value: <CraftedAmount value={averageMonthlySpent} />,
            suffix: "€",
          },
          {
            label: "Giorni attivi",
            value: <CraftedAmount value={activeDays} maximumFractionDigits={0} />,
          },
          {
            label: "Movimenti",
            value: (
              <CraftedAmount
                value={period === "all" ? overview.entriesCount : hero.entriesCount}
                maximumFractionDigits={0}
              />
            ),
          },
        ]}
      />

      {habitStats.length > 0 ? (
        <>
          <Rule />
          <section className="px-5 py-5">
            <Label className="mb-4 block">Ricorrenti</Label>
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
    </Stagger>
  );
}
