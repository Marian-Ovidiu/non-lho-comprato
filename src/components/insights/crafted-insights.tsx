"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  Layers,
  Scale,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Amount, Eyebrow, Rule, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import type { InsightsData } from "@/src/actions/insights";
import type { ObservationKind } from "@/src/features/insights/observations";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations } from "@/src/components/language/language-context";

/** Ogni tipo di osservazione ha un'icona sua: il colore non è l'unico canale. */
const KIND_ICON: Record<ObservationKind, LucideIcon> = {
  pace: TrendingUp,
  attribution: Layers,
  composition: Scale,
  outlier: ArrowUpRight,
  "second-half": CalendarClock,
  ratio: Scale,
  dominant: Layers,
  "new-category": Sparkles,
  "payer-balance": Users,
};

function ObservationCard({
  observation,
  isLead,
}: {
  observation: InsightsData["observations"][number];
  isLead: boolean;
}) {
  const Icon = KIND_ICON[observation.kind] ?? Sparkles;
  const t = useTranslations();

  return (
    <article
      className={cn(
        "nlc-glass-card rounded-[var(--r-card)] p-4",
        isLead && "nlc-glass-hero rounded-[var(--r-sheet)] p-5",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "font-medium leading-snug tracking-[-0.01em]",
              isLead ? "text-[19px]" : "text-[15px]",
            )}
          >
            {observation.title}
          </h3>
          <Serif className="mt-2 block text-[13.5px] leading-relaxed text-ink-3">
            {observation.detail}
          </Serif>
          {observation.entryIds.length > 0 ? (
            <p className="mt-2 text-[11px] text-ink-3">
              {t.insights.basedOn(observation.entryIds.length)}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/**
 * Andamento della sola spesa corrente. Le fisse restano fuori: un affitto
 * segnato il 5 invece che l'11 muoverebbe la colonna senza che sia cambiato
 * niente nei consumi.
 */
function MonthTrend({ months }: { months: InsightsData["months"] }) {
  const currencySymbol = useCurrencySymbol();
  const t = useTranslations();
  const peak = Math.max(...months.map((item) => item.currentSpent), 1);

  return (
    <section className="nlc-glass-card rounded-[var(--r-card)] p-4">
      <Eyebrow className="mb-4 block">{t.insights.trendLabel}</Eyebrow>
      <div className="flex items-stretch gap-2">
        {months.map((item, index) => {
          const isCurrent = index === months.length - 1;
          const heightPct = Math.max((item.currentSpent / peak) * 100, 3);

          return (
            <div key={item.monthKey} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-[88px] w-full items-end">
                <div
                  className={cn(
                    "w-full rounded-t-[6px]",
                    isCurrent ? "bg-accent" : "bg-chart-1",
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-[10px] text-ink-3">{item.monthKey.slice(5)}</span>
            </div>
          );
        })}
      </div>
      <Rule soft />
      <p className="mt-3 text-[12px] text-ink-3">
        {t.insights.trendHint}{" "}
        <Amount
          value={months.at(-1)?.currentSpent ?? 0}
          currencySymbol={currencySymbol}
          decimals={false}
          className="text-foreground"
        />
      </p>
    </section>
  );
}

function EarlyDays({ historyMonths }: { historyMonths: number }) {
  const t = useTranslations();

  return (
    <section className="px-[var(--sp-page-x)] py-10 text-center">
      <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground">
        <Sparkles className="size-5" aria-hidden="true" />
      </div>
      <p className="text-[16px] font-semibold">{t.insights.earlyTitle}</p>
      <Serif className="mx-auto mt-3 block max-w-[320px] text-sm leading-relaxed text-ink-3">
        {historyMonths === 0 ? t.insights.earlyNoHistory : t.insights.earlyOneMonth}
      </Serif>
      <div className="mt-7">
        <Link
          href="/entries/new"
          className="nlc-press inline-flex min-h-11 items-center rounded-[var(--r-cta)] bg-accent px-5 text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          {t.insights.earlyAction}
        </Link>
      </div>
    </section>
  );
}

export function CraftedInsights({ data }: { data: InsightsData }) {
  const t = useTranslations();
  const [lead, ...rest] = data.observations;

  if (!lead) {
    return <EarlyDays historyMonths={data.historyMonths} />;
  }

  return (
    <div className="space-y-3 px-[var(--sp-page-x)] pb-4 pt-4">
      <ObservationCard observation={lead} isLead />

      {data.months.length >= 2 ? <MonthTrend months={data.months} /> : null}

      {rest.length > 0 ? (
        <>
          <Eyebrow className="block pt-2">{t.insights.alsoLabel}</Eyebrow>
          {rest.map((observation, index) => (
            <ObservationCard
              key={`${observation.kind}-${index}`}
              observation={observation}
              isLead={false}
            />
          ))}
        </>
      ) : null}

      <p className="pt-2 text-center text-[11px] leading-relaxed text-ink-3">
        {t.insights.footnote}
      </p>
    </div>
  );
}
