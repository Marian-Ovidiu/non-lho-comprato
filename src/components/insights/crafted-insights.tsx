import Link from "next/link";
import {
  Brain,
  Coffee,
  Flame,
  Info,
  Moon,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Sunrise,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { Label, Mono, ProgressLine, Rule, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import type {
  InsightsData,
  InsightsRangeDays,
  PatternTrigger,
  PatternWeakSpot,
  PatternWin,
  TriggerIconName,
} from "@/src/actions/insights";

const RANGE_OPTIONS: Array<{ value: InsightsRangeDays; label: string }> = [
  { value: 30, label: "30g" },
  { value: 90, label: "90g" },
  { value: 365, label: "12m" },
];

const TRIGGER_ICONS: Record<TriggerIconName, LucideIcon> = {
  moon: Moon,
  sunrise: Sunrise,
  smartphone: Smartphone,
  coffee: Coffee,
  sparkles: Sparkles,
};

const HEATMAP_TONE = [
  "bg-line-soft",
  "bg-accent/20",
  "bg-accent/40",
  "bg-accent/65",
  "bg-accent",
];

function formatEUR(value: number, currencySymbol: string) {
  const formatted = new Intl.NumberFormat("it-IT", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.abs(value));

  return `${currencySymbol}${formatted}`;
}

function resistancePct(value: number) {
  return Math.round(value * 100);
}

function DeltaChip({
  value,
}: {
  value: number;
}) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--r-chip)] border px-2.5 py-1 text-[11px] font-medium",
        isPositive
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/25 bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      <Mono>{isPositive ? "+" : "−"}{Math.abs(value)} pt</Mono>
    </span>
  );
}

function RangePicker({
  active,
}: {
  active: InsightsRangeDays;
}) {
  return (
    <nav aria-label="Intervallo pattern" className="flex rounded-[var(--r-control)] bg-surface-muted p-1">
      {RANGE_OPTIONS.map((option) => {
        const selected = option.value === active;

        return (
          <Link
            key={option.value}
            href={`/insights?range=${option.value}`}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "nlc-press min-h-8 rounded-[10px] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected ? "bg-accent/10 text-accent ring-1 ring-accent/40" : "text-ink-3 hover:text-foreground",
            )}
          >
            <Mono>{option.label}</Mono>
          </Link>
        );
      })}
    </nav>
  );
}

function MetricTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "accent";
}) {
  return (
    <div className="rounded-[var(--r-card)] bg-surface-muted px-3 py-3">
      <Label className="block text-[9.5px]">{label}</Label>
      <Mono
        className={cn(
          "mt-2 block text-[18px] font-semibold leading-none",
          tone === "success" && "text-success",
          tone === "accent" && "text-accent",
        )}
      >
        {value}
      </Mono>
    </div>
  );
}

function Heatmap({
  heatmap,
  callout,
}: {
  heatmap: number[][];
  callout: string;
}) {
  const dayLabels = ["L", "M", "M", "G", "V", "S", "D"];

  return (
    <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <Label>Impulso</Label>
          <h2 className="mt-1 text-[16px] font-semibold">Otto settimane</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-[var(--r-chip)] border border-line px-2.5 py-1 text-[11px] text-ink-3">
          <Info className="size-3.5" aria-hidden="true" />
          solo impulsi
        </span>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-2 rounded-[var(--r-card)] bg-surface-muted p-3">
        <div className="grid grid-rows-7 gap-1 pt-0.5">
          {dayLabels.map((day, index) => (
            <Mono key={`${day}-${index}`} className="flex size-5 items-center justify-center text-[10px] text-ink-3">
              {day}
            </Mono>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-1" aria-label="Heatmap impulso ultime otto settimane">
          {heatmap.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-rows-7 gap-1">
              {week.map((intensity, dayIndex) => (
                <span
                  key={`${weekIndex}-${dayIndex}`}
                  className={cn("size-5 rounded-[6px]", HEATMAP_TONE[intensity] ?? HEATMAP_TONE[0])}
                  aria-hidden="true"
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <Serif className="mt-3 block text-[13px] text-ink-3">
        {callout}
      </Serif>
    </section>
  );
}

function TriggerRow({
  trigger,
  last,
  currencySymbol,
}: {
  trigger: PatternTrigger;
  last: boolean;
  currencySymbol: string;
}) {
  const Icon = TRIGGER_ICONS[trigger.icon];
  const rate = trigger.count === 0 ? 0 : trigger.avoided / trigger.count;
  const weak = rate < 0.5;
  const pct = resistancePct(rate);

  return (
    <div className={cn("py-3.5", !last && "border-b border-line-soft")}>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-[var(--r-control)]",
            weak ? "bg-destructive/10 text-destructive" : "bg-surface-muted text-success",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="truncate text-[14.5px] font-medium">{trigger.label}</p>
            <Mono className={cn("shrink-0 text-[13px] font-semibold", weak ? "text-destructive" : "text-success")}>
              {pct}%
            </Mono>
          </div>
          <ProgressLine
            value={pct}
            label={`Resistenza ${trigger.label}`}
            indicatorClassName={weak ? "bg-destructive" : "bg-success"}
          />
          <p className="mt-2 text-[11.5px] text-ink-3">
            <Mono>{trigger.count}</Mono> tentativi · media <Mono>{formatEUR(trigger.avgAmount, currencySymbol)}</Mono>
          </p>
        </div>
      </div>
    </div>
  );
}

function WinCard({
  win,
  currencySymbol,
}: {
  win: PatternWin;
  currencySymbol: string;
}) {
  return (
    <article className="w-[220px] shrink-0 rounded-[var(--r-card)] border border-line bg-surface p-4">
      <Label>Vittoria</Label>
      <p className="mt-3 line-clamp-2 text-[15px] font-medium">{win.label}</p>
      <Serif className="mt-2 block line-clamp-3 text-[13px] text-ink-3">
        {win.context}
      </Serif>
      <div className="mt-5 flex items-end justify-between gap-3">
        <Mono className="text-[18px] font-semibold text-success">
          +{formatEUR(win.saved, currencySymbol)}
        </Mono>
        <Label className="text-[9.5px]">{win.days === 0 ? "oggi" : `${win.days}g fa`}</Label>
      </div>
    </article>
  );
}

function WeakSpotRow({
  spot,
  last,
  currencySymbol,
}: {
  spot: PatternWeakSpot;
  last: boolean;
  currencySymbol: string;
}) {
  return (
    <div className={cn("flex min-h-14 items-center gap-3 py-3", !last && "border-b border-line-soft")}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-destructive/10 text-destructive">
        <ShoppingBag className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium">{spot.label}</p>
        <p className="mt-1 text-[11.5px] text-ink-3">
          impulso <Mono>{formatEUR(spot.impulse, currencySymbol)}</Mono>
          {spot.planned > 0 ? <> · previsto <Mono>{formatEUR(spot.planned, currencySymbol)}</Mono></> : null}
        </p>
      </div>
      <Mono className="shrink-0 text-[13px] font-semibold text-destructive">
        {spot.delta}
      </Mono>
    </div>
  );
}

export function CraftedInsights({
  data,
  currencySymbol,
}: {
  data: InsightsData;
  currencySymbol: string;
}) {
  const resistance = resistancePct(data.resistanceRate);
  const delta = Math.round((data.resistanceRate - data.resistancePrev) * 100);
  const resistedPhrase =
    data.attemptsCount > 0
      ? `resisti a ${data.avoidedCount} acquisti su ${data.attemptsCount}`
      : "inizia tracciando anche gli acquisti evitati";

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-[var(--sp-page-x)] pb-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label>Pattern</Label>
            <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
              Come compri <Serif className="text-ink-2">davvero</Serif>
            </h1>
          </div>
          <RangePicker active={data.rangeDays} />
        </div>

        <div className="mt-10">
          <Label className="mb-3 block">Tasso di resistenza</Label>
          <div className="flex items-end gap-3">
            <Mono className="text-[clamp(4rem,22vw,6.25rem)] font-semibold leading-[0.78] tracking-[-0.055em]">
              {resistance}%
            </Mono>
            <div className="pb-2">
              <DeltaChip value={delta} />
            </div>
          </div>
          <Serif className="mt-3 block text-[15px] text-ink-2">
            {resistedPhrase}
          </Serif>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3 px-[var(--sp-page-x)] pb-[var(--sp-section-y)]">
        <MetricTile label="Serie attuale" value={`${data.currentStreak}g`} tone="success" />
        <MetricTile label="Record" value={`${data.longestStreak}g`} />
        <MetricTile label="Evitati" value={formatEUR(data.avoidedTotal, currencySymbol)} tone="accent" />
      </section>
      <Rule soft />

      <Heatmap heatmap={data.heatmap} callout={data.heatmapCallout} />
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="mb-2">
          <Label>Trigger</Label>
          <h2 className="mt-1 text-[16px] font-semibold">Cosa accende l&apos;impulso</h2>
        </div>
        {data.triggers.length > 0 ? (
          <div>
            {data.triggers.map((trigger, index) => (
              <TriggerRow
                key={trigger.id}
                trigger={trigger}
                last={index === data.triggers.length - 1}
                currencySymbol={currencySymbol}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-[var(--r-card)] border border-dashed border-line p-5 text-sm text-ink-3">
            Ancora nessun trigger leggibile. Aggiungi note ai movimenti evitati per rendere la diagnosi più precisa.
          </p>
        )}
      </section>
      <Rule soft />

      <section className="py-[var(--sp-section-y)]">
        <div className="px-[var(--sp-page-x)]">
          <Label>Vittorie</Label>
          <h2 className="mt-1 text-[16px] font-semibold">Momenti in cui hai resistito</h2>
        </div>
        {data.wins.length > 0 ? (
          <div className="mt-4 flex gap-3 overflow-x-auto px-[var(--sp-page-x)] pb-1">
            {data.wins.map((win) => (
              <WinCard key={`${win.label}-${win.days}-${win.saved}`} win={win} currencySymbol={currencySymbol} />
            ))}
          </div>
        ) : (
          <div className="px-[var(--sp-page-x)] pt-4">
            <p className="rounded-[var(--r-card)] border border-dashed border-line p-5 text-sm text-ink-3">
              Le vittorie narrative compariranno quando registri acquisti evitati nel periodo.
            </p>
          </div>
        )}
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="mb-2">
          <Label>Punti deboli</Label>
          <h2 className="mt-1 text-[16px] font-semibold">Dove l&apos;impulso vince</h2>
        </div>
        {data.weakSpots.length > 0 ? (
          <div>
            {data.weakSpots.map((spot, index) => (
              <WeakSpotRow
                key={spot.label}
                spot={spot}
                last={index === data.weakSpots.length - 1}
                currencySymbol={currencySymbol}
              />
            ))}
          </div>
        ) : (
          <Serif className="block rounded-[var(--r-card)] bg-surface-muted p-5 text-[14px] text-ink-3">
            Nessuna categoria sta superando il suo previsto d&apos;impulso nel periodo.
          </Serif>
        )}
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="rounded-[var(--r-card)] border border-line p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-accent">
              <Brain className="size-4" aria-hidden="true" />
            </span>
            <div>
              <Label>Verdetto</Label>
              <p className="mt-1 text-[15px] font-medium">Diagnosi comportamentale</p>
            </div>
          </div>
          <Serif className="block text-[16px] leading-7 text-ink-2">
            {data.verdict}
          </Serif>
          <div className="mt-5 flex items-center gap-2 text-[11.5px] text-ink-3">
            <Flame className="size-3.5 text-accent" aria-hidden="true" />
            <span>Prescrittivo, non giudicante.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
