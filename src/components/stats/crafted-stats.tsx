"use client";

import { useMemo } from "react";

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
import { CraftedStatsPeriodFilter } from "@/src/components/stats/crafted-stats-period-filter";
import {
  CraftedTopSavingsList,
  type CraftedTopSavingsItem,
} from "@/src/components/stats/crafted-top-savings-list";
import {
  CATEGORY_TONE_CLASS,
  getActiveDays,
  getAverageMonthlySpent,
  getMaxChartSpent,
  getMonthChartData,
  getPeriodHero,
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
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { cn } from "@/lib/utils";
import type { StatsMonthOption, StatsPeriod } from "@/src/lib/stats-period";

type CraftedStatsComponentProps = CraftedStatsProps & {
  selectedPeriod: StatsPeriod;
  selectedMonthKey: string;
  selectedMonthLabel: string;
  selectedYear: string;
  monthOptions: StatsMonthOption[];
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
  const currencySymbol = useCurrencySymbol();
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
            "py-[var(--sp-row-y)]",
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
              <span className="text-[11px] text-accent">{currencySymbol}</span>
            </Mono>
          </div>
          {category.saved > 0 ? (
            <Serif className="mb-2 block text-[12.5px] text-ink-3">
              {formatCraftedCompact(category.saved)}{currencySymbol} impatto netto
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
  overview,
  dailySpendingComparison,
  currentMonthLabel,
  queen: initialQueen,
  categories,
  selectedPeriod,
  selectedMonthKey,
  selectedMonthLabel,
  selectedYear,
  monthOptions,
  topSavings = [],
  habitStats = [],
}: CraftedStatsComponentProps) {
  const period = selectedPeriod;
  const currencySymbol = useCurrencySymbol();

  const hero = useMemo(
    () =>
      getPeriodHero({
        period,
        overview,
        currentMonthLabel,
        selectedYear,
      }),
    [period, overview, currentMonthLabel, selectedYear],
  );

  const periodOverview = overview;
  const trendPct = useMemo(
    () =>
      getTrendAboveAverage({
        period,
        monthlyStats,
        heroAmount: hero.amount,
        selectedMonthKey,
      }),
    [period, monthlyStats, hero.amount, selectedMonthKey],
  );

  const chartData = useMemo(
    () => getMonthChartData(monthlyStats, selectedMonthKey),
    [monthlyStats, selectedMonthKey],
  );
  const maxChartSpent = useMemo(() => getMaxChartSpent(monthlyStats), [monthlyStats]);
  const averageMonthlySpent = useMemo(
    () => getAverageMonthlySpent(monthlyStats),
    [monthlyStats],
  );
  const activeDays = useMemo(
    () => getActiveDays(dailySpendingComparison),
    [dailySpendingComparison],
  );

  const queenMonthLabel =
    selectedMonthLabel.split(" ")[0]?.toLowerCase() ?? selectedMonthLabel.toLowerCase();

  return (
    <Stagger className="-mx-4 sm:-mx-6 lg:-mx-8">
      <CraftedStatsPeriodFilter
        selectedPeriod={selectedPeriod}
        selectedMonthKey={selectedMonthKey}
        selectedMonthLabel={selectedMonthLabel}
        selectedYear={selectedYear}
        monthOptions={monthOptions}
      />
      <Rule className="mt-0" />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
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
            suffix: currencySymbol,
          },
          {
            label: "Impatto netto",
            value: <CraftedAmount value={periodOverview.totalSaved} />,
            suffix: currencySymbol,
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
      <details>
        <summary className="flex cursor-pointer list-none items-center justify-between border-t border-line-soft px-[var(--sp-page-x)] py-[var(--sp-row-y)] font-num text-[10px] uppercase tracking-[0.22em] text-ink-3 hover:text-foreground [&::-webkit-details-marker]:hidden">
          <span>Dettagli del periodo</span>
          <span className="text-sm leading-none text-ink-3" aria-hidden="true">⌄</span>
        </summary>
        <StatTrio
          items={[
            {
              label: "Avresti speso",
              value: <CraftedAmount value={periodOverview.totalAlternativeCost} />,
              suffix: currencySymbol,
            },
            {
              label: "Impatto medio",
              value: <CraftedAmount value={periodOverview.averageSavedPerEntry} />,
              suffix: currencySymbol,
            },
            {
              label: "Indice netto",
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
      </details>
      <Rule />

      <section className="px-[var(--sp-page-x)] pb-2 pt-[var(--sp-section-y)]">
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <Label>Spesa ultimi 12 mesi</Label>
          {maxChartSpent > 0 ? (
            <Mono className="text-[11px] text-ink-3">
              max {formatCraftedCompact(maxChartSpent)}{currencySymbol}
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
                  title={`${month.initial}: ${formatCraftedCompact(month.totalRealSpent)}${currencySymbol} spesi`}
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

      {initialQueen ? (
        <>
          <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
            <Label className="mb-3.5 block">
              {period === "month"
                ? `Categoria principale di ${queenMonthLabel}`
                : "Categoria principale del periodo"}
            </Label>
            <div className="flex items-center gap-4">
              <CraftedIcon
                name={getCategoryCraftedIcon({ slug: initialQueen.slug, name: initialQueen.name })}
                size={30}
                strokeWidth={1.4}
                className="text-accent"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <Mono className="text-[28px] font-semibold leading-none">
                    {formatCraftedCompact(initialQueen.spent)}{currencySymbol}
                  </Mono>
                  <span className="text-sm text-muted-foreground">spesi in {initialQueen.name}</span>
                </div>
                <Serif className="mt-1 block text-sm text-ink-3">
                  il {initialQueen.pct}% di tutto, in {initialQueen.entriesCount}{" "}
                  {initialQueen.entriesCount === 1 ? "movimento" : "movimenti"}.
                  {initialQueen.saved > 0
                    ? ` ${formatCraftedCompact(initialQueen.saved)}${currencySymbol} impatto netto.`
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
            suffix: currencySymbol,
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
                    "flex items-center justify-between gap-4 py-[var(--sp-row-y)]",
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
                    <span className="text-[11px] text-accent">{currencySymbol}</span>
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
