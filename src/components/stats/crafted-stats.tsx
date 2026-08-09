"use client";

import { useMemo } from "react";
import Link from "next/link";

import {
  Amount,
  CraftedIcon,
  Eyebrow,
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
  getActiveDays,
  getAverageMonthlySpent,
  getMaxChartSpent,
  getMonthChartData,
  getPeriodHero,
  getTrendAboveAverage,
  type CraftedStatsProps,
} from "@/src/lib/crafted-stats-build";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { getCategoryIdentity } from "@/src/lib/category-identity";
import { GrowBar, Stagger } from "@/components/crafted/motion";
import { useCurrencyCode } from "@/src/components/currency/currency-context";
import { useTranslations, useWorkspaceLanguage } from "@/src/components/language/language-context";
import { formatMoney } from "@/src/lib/formatters";
import { languageToLocale } from "@/src/lib/i18n";
import { getLocalizedCategoryName } from "@/src/lib/category-locale";
import { cn } from "@/lib/utils";
import type { StatsMonthOption, StatsPeriod } from "@/src/lib/stats-period";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type CraftedStatsComponentProps = CraftedStatsProps & {
  members: WorkspaceMemberOption[];
  selectedMemberUserId?: string;
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

/**
 * L'elenco per categoria. Il colore qui faceva un giro di quattro tinte legate
 * alla *posizione* in classifica: la prima categoria era lime (cioè il colore
 * dell'azione), la terza era il verde del giudizio, e alla quinta il giro
 * ricominciava. Con diciassette categorie vere, il colore non identificava
 * niente — cambiava di mese in mese perché cambiava la classifica.
 *
 * Adesso i due lavori sono separati, ed è tutta la differenza:
 * - **l'identità** sta sull'icona, tinta con la famiglia della categoria. È
 *   la stessa tinta che la categoria ha nei chip dell'elenco movimenti, quindi
 *   "Caffè" è lo stesso oggetto in tutte e due le schermate, e non si sposta
 *   quando si sposta la classifica;
 * - **la quantità** sta sulla barra, che è di un inchiostro solo. Una barra
 *   misura una cosa sola: non ha bisogno di cambiare colore per dirla, e
 *   quattro colori che si alternano su una colonna di barre affiancate fanno
 *   sembrare diverse quantità che sono soltanto diverse categorie.
 */
function CraftedCategoryBars({
  categories,
}: {
  categories: CraftedStatsProps["categories"];
}) {
  const t = useTranslations();
  const language = useWorkspaceLanguage();
  if (categories.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-ink-3">
        {t.stats.noCategoryData}
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
              className={getCategoryIdentity({ slug: category.slug, name: category.name }).inkClassName}
            />
            <span className="min-w-0 flex-1 text-sm font-[450]">{getLocalizedCategoryName(category.slug, language) ?? category.name}</span>
            <Mono className="mr-3 text-[11px] text-ink-3">{category.pct}%</Mono>
            <Amount value={category.spent} className="text-sm font-medium whitespace-nowrap" />
          </div>
          {category.saved > 0 ? (
            <Serif className="mb-2 block text-[12.5px] text-ink-3">
              <Amount value={category.saved} className="text-[12.5px]" />{" "}
              {t.stats.netImpactSuffix}
            </Serif>
          ) : null}
          <ProgressLine
            value={category.pct}
            className="rounded-[1px]"
            indicatorClassName="bg-muted-foreground"
          />
        </div>
      ))}
    </div>
  );
}

export function CraftedStats({
  members,
  selectedMemberUserId,
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
  const t = useTranslations();
  const period = selectedPeriod;
  const currencyCode = useCurrencyCode();
  const locale = languageToLocale(useWorkspaceLanguage());

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
        members={members}
        selectedMemberUserId={selectedMemberUserId}
        selectedPeriod={selectedPeriod}
        selectedMonthKey={selectedMonthKey}
        selectedMonthLabel={selectedMonthLabel}
        selectedYear={selectedYear}
        monthOptions={monthOptions}
      />
      <Rule className="mt-0" />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <Eyebrow className="mb-3.5 block">{hero.label}</Eyebrow>
        {/* Era un odometro con una scala tutta sua (clamp 3–4,5rem, centesimi a
            corpo 24). Adesso è l'importo dell'app alla scala eroe dell'app,
            lo stesso oggetto che sta in cima alla dashboard. Due conseguenze,
            e la seconda è la ragione vera: la gerarchia dei centesimi torna
            uguale ovunque, e il numero è *giusto già nell'HTML del server*.
            L'odometro parte da zero e conta salendo, quindi finché il
            JavaScript non arriva questa pagina dichiarava «hai speso 0,00 €»
            — su una schermata che esiste per dire quanto hai speso. */}
        <Amount
          value={hero.amount}
          className="block text-[length:var(--num-hero)] font-semibold"
        />
        {trendPct !== null && trendPct !== 0 ? (
          <div className="mt-3 flex items-center gap-1.5">
            {/* La freccia dice il verso, non "premi qui": esce dal lime e va
                sull'inchiostro del testo che accompagna. */}
            <CraftedIcon
              name="arrowUp"
              size={13}
              strokeWidth={2}
              className={cn(trendPct < 0 && "rotate-180", "text-muted-foreground")}
            />
            <span className="text-[12.5px] text-muted-foreground">
              <Mono className="text-foreground">{Math.abs(trendPct)}%</Mono>{" "}
              {trendPct > 0 ? t.stats.trendAbove : t.stats.trendBelow} {t.stats.trendAverage}
            </span>
          </div>
        ) : null}
      </section>

      <section className="px-5 pb-1">
        <Eyebrow className="mb-3 block">{t.stats.balanceLabel}</Eyebrow>
      </section>
      <StatTrio
        items={[
          {
            label: t.stats.spentLabel,
            value: <Amount value={periodOverview.totalRealSpent} />,
          },
          {
            label: t.stats.netImpactLabel,
            value: <Amount value={periodOverview.totalSaved} />,
          },
          {
            /* Un conteggio non è un importo: niente valuta, niente centesimi. */
            label: t.stats.entriesLabel,
            value: period === "all" ? overview.entriesCount : hero.entriesCount,
          },
        ]}
      />
      <details>
        <summary className="nlc-eyebrow flex cursor-pointer list-none items-center justify-between border-t border-line-soft px-[var(--sp-page-x)] py-[var(--sp-row-y)] hover:text-foreground [&::-webkit-details-marker]:hidden">
          <span>{t.stats.periodDetails}</span>
          <span className="text-sm leading-none text-ink-3" aria-hidden="true">⌄</span>
        </summary>
        <StatTrio
          items={[
            {
              label: t.stats.wouldHaveSpent,
              value: <Amount value={periodOverview.totalAlternativeCost} />,
            },
            {
              label: t.stats.avgImpact,
              value: <Amount value={periodOverview.averageSavedPerEntry} />,
            },
            {
              label: t.stats.netIndex,
              value: Math.round(periodOverview.savingRatePercent * 10) / 10,
              suffix: "%",
            },
          ]}
        />
      </details>
      <Rule />

      <section className="px-[var(--sp-page-x)] pb-2 pt-[var(--sp-section-y)]">
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <Eyebrow>{t.stats.last12Months}</Eyebrow>
          {maxChartSpent > 0 ? (
            <span className="text-[11px] text-ink-3">
              {t.stats.chartMaxLabel}{" "}
              <Amount value={maxChartSpent} decimals={false} className="text-[11px]" />
            </span>
          ) : null}
        </div>

        {chartData.length === 0 ? (
          <p className="py-10 text-sm text-ink-3">{t.stats.noMonthlyData}</p>
        ) : (
          /* La riga era `items-end`, che toglie lo stretch alle colonne: le
             colonne prendevano l'altezza del loro contenuto, quindi il
             contenitore della barra — un `flex-1` senza altezza definita — non
             poteva risolvere la percentuale. Risultato: `height: 100%` e
             `height: 10,6%` rendevano tutte e due 3px, cioè il `min-h`. Il
             grafico degli ultimi dodici mesi disegnava barre identiche
             qualunque fosse la spesa. Il calcolo era giusto (`heightPct` esce
             corretto dal build): era il CSS a non farlo vedere. Le colonne
             tornano a stirarsi, e l'allineamento in basso lo fa `justify-end`
             dentro la colonna, che è il posto dove quel lavoro appartiene. */
          <div className="flex h-[120px] gap-1.5">
            {chartData.map((month) => (
              <div
                key={month.month}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                {/* Il mese scelto era lime, cioè il colore che nell'app vuol
                    dire "premi qui". Ma questa barra non si preme: è lo stato
                    di una selezione fatta altrove, nei filtri. Lo stato si dice
                    con il materiale — inchiostro pieno contro inchiostro tenue
                    — come già fanno il segmentato e i chip dell'elenco. */}
                <GrowBar
                  className="flex w-full flex-1 items-end"
                  barClassName={cn(
                    "w-full min-h-[3px] rounded-[1px]",
                    month.isActive ? "bg-foreground" : "bg-ink-3",
                  )}
                  style={{ height: `${Math.max(month.heightPct, month.totalRealSpent > 0 ? 4 : 0)}%` }}
                  title={t.stats.monthBarTitle(month.initial, formatMoney(month.totalRealSpent, currencyCode, locale))}
                />
                <Mono
                  className={cn(
                    "text-[9.5px]",
                    month.isActive ? "font-semibold text-foreground" : "text-ink-3",
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
            <Eyebrow className="mb-3.5 block">
              {period === "month"
                ? t.stats.mainCategoryMonth(queenMonthLabel)
                : t.stats.mainCategoryPeriod}
            </Eyebrow>
            <div className="flex items-center gap-4">
              {/* L'icona prende la famiglia della sua categoria, non il lime:
                  è la stessa tinta che ha nell'elenco per categoria qui sotto
                  e nei chip dei movimenti. */}
              <CraftedIcon
                name={getCategoryCraftedIcon({ slug: initialQueen.slug, name: initialQueen.name })}
                size={30}
                strokeWidth={1.4}
                className={getCategoryIdentity({ slug: initialQueen.slug, name: initialQueen.name }).inkClassName}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <Amount
                    value={initialQueen.spent}
                    className="text-[length:var(--num-lead)] font-semibold"
                  />
                  <span className="text-sm text-muted-foreground">{t.stats.spentIn(initialQueen.name)}</span>
                </div>
                <Serif className="mt-1 block text-sm text-ink-3">
                  {t.stats.queenDetail(initialQueen.pct, initialQueen.entriesCount)}
                  {initialQueen.saved > 0 ? (
                    <>
                      {" "}
                      <Amount value={initialQueen.saved} className="text-sm" />{" "}
                      {t.stats.netImpactSuffix}.
                    </>
                  ) : null}
                </Serif>
              </div>
            </div>
          </section>
          <Rule />
        </>
      ) : null}

      <section className="px-5 py-5 pb-2">
        <Eyebrow>{t.stats.byCategoryLabel}</Eyebrow>
      </section>
      <CraftedCategoryBars categories={categories} />
      <Rule />

      <CraftedTopSavingsList entries={topSavings} />
      <Rule />

      <StatTrio
        items={[
          {
            label: t.stats.avgMonthlySpent,
            value: <Amount value={averageMonthlySpent} />,
          },
          {
            label: t.stats.activeDays,
            value: activeDays,
          },
          {
            label: t.stats.entriesLabel,
            value: period === "all" ? overview.entriesCount : hero.entriesCount,
          },
        ]}
      />

      {habitStats.length > 0 ? (
        <>
          <Rule />
          <section className="px-5 py-5">
            <Eyebrow className="mb-4 block">{t.stats.habitsLabel}</Eyebrow>
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
                      {t.stats.disciplineRate(Math.round(habit.disciplineRatePercent))}
                    </p>
                  </div>
                  <Amount value={habit.totalSaved} className="text-sm font-medium whitespace-nowrap" />
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {period === "month" ? (
        <>
          <Rule />
          <div className="px-[var(--sp-page-x)] py-[var(--sp-row-y)]">
            <Link
              href={`/reports/monthly?month=${selectedMonthKey}`}
              className="text-sm text-ink-3 hover:text-foreground transition-colors"
            >
              {t.stats.viewMonthlyReport}
            </Link>
          </div>
        </>
      ) : null}
    </Stagger>
  );
}
