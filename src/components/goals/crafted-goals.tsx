"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronRight, Sparkles } from "lucide-react";

import {
  CraftedIcon,
  Label,
  Mono,
  ProgressLine,
  Rule,
  Serif,
} from "@/components/crafted";
import { cn } from "@/lib/utils";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import {
  shortGoalDate,
  type CraftedAllocationRow,
  type CraftedGoalRow,
  type CraftedGoalsProps,
  type GoalStatus,
} from "@/src/lib/crafted-goals-build";

type TabKey = "tutti" | GoalStatus;
type Tone = "default" | "success" | "accent" | "muted";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "tutti", label: "Tutti" },
  { key: "in-corso", label: "In corso" },
  { key: "pausa", label: "Pausa" },
  { key: "completato", label: "Completati" },
];

function formatEUR(
  value: number,
  currencySymbol: string,
  options: { sign?: boolean; decimals?: 0 | 2 } = {},
) {
  const sign = options.sign ? (value > 0 ? "+" : value < 0 ? "−" : "") : "";
  const decimals = options.decimals ?? 0;
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  return `${sign}${currencySymbol}${formatted}`;
}

function statusLabel(status: GoalStatus) {
  if (status === "completato") return "Completato";
  if (status === "pausa") return "In pausa";
  return "In corso";
}

function statusTone(status: GoalStatus): Tone {
  if (status === "completato") return "success";
  if (status === "pausa") return "muted";
  return "accent";
}

function progressTone(status: GoalStatus) {
  if (status === "completato") return "bg-success";
  if (status === "pausa") return "bg-muted-foreground";
  return "bg-accent";
}

function MicroStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="rounded-[var(--r-card)] bg-surface-muted px-3 py-2.5">
      <Label className="mb-1.5 block">{label}</Label>
      <Mono
        className={cn(
          "block text-[17px] font-semibold leading-none",
          tone === "success" && "text-success",
          tone === "accent" && "text-accent",
          tone === "muted" && "text-ink-3",
        )}
      >
        {value}
      </Mono>
    </div>
  );
}

function StatusPill({ status }: { status: GoalStatus }) {
  const tone = statusTone(status);

  return (
    <span
      className={cn(
        "shrink-0 rounded-[var(--r-chip)] border px-1.5 py-px text-[9.5px] font-semibold uppercase leading-none tracking-[0.18em]",
        tone === "success" && "border-success/40 text-success",
        tone === "accent" && "border-accent/40 text-accent",
        tone === "muted" && "border-line text-ink-3",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function FeaturedCard({
  goal,
  currencySymbol,
}: {
  goal: CraftedGoalRow;
  currencySymbol: string;
}) {
  const calloutTone = goal.status === "completato" ? "success" : "accent";

  return (
    <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
      <div className="relative overflow-hidden rounded-[var(--r-card)] border border-line bg-surface p-5">
        <div
          className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/[0.07] blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-accent">
                <CraftedIcon name={goal.icon} size={19} />
              </span>
              <div className="min-w-0">
                <Label className="mb-1 block">In evidenza</Label>
                <h2 className="truncate text-[21px] font-semibold leading-tight">
                  {goal.title}
                </h2>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-[var(--r-chip)] border px-2.5 py-1.5 text-[11px]",
                calloutTone === "success"
                  ? "border-success/35 text-success"
                  : "border-accent/35 text-accent",
              )}
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              <Mono>{goal.pct}%</Mono>
            </span>
          </div>

          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <Mono className="block text-[34px] font-semibold leading-none tracking-[-0.02em]">
                {formatEUR(goal.saved, currencySymbol)}
              </Mono>
              <Serif className="mt-2 block text-[13px] text-ink-3">
                su {formatEUR(goal.target, currencySymbol)}
              </Serif>
            </div>
            <Mono className="shrink-0 text-right text-xs text-muted-foreground">
              {formatEUR(goal.remaining, currencySymbol)}
              <span className="block text-ink-3">rimangono</span>
            </Mono>
          </div>

          <ProgressLine
            thick
            value={goal.pct}
            className="bg-line-soft"
            indicatorClassName={progressTone(goal.status)}
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <Serif className="text-[13px] text-ink-3">{goal.note}</Serif>
            <Mono className="text-xs text-muted-foreground">
              ritmo {formatEUR(goal.monthlyPace, currencySymbol)}/mese
            </Mono>
          </div>
        </div>
      </div>
    </section>
  );
}

function GoalRow({ goal }: { goal: CraftedGoalRow }) {
  return (
    <button
      type="button"
      className="nlc-press block min-h-11 w-full py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground">
          <CraftedIcon name={goal.icon} size={19} />
        </span>
        <div className="min-w-0">
          <div className="mb-1 flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-[15px] font-medium">{goal.title}</p>
            <StatusPill status={goal.status} />
          </div>
          <p className="truncate text-[11px] text-ink-3">
            {goal.contributors.join(", ")}
          </p>
        </div>
        <div className="text-right">
          <Mono className="block text-[14px] font-semibold">
            {formatCraftedCompact(goal.saved)}
            <span className="text-ink-3">/{formatCraftedCompact(goal.target)}</span>
          </Mono>
          <ChevronRight className="ml-auto mt-1 size-4 text-ink-3" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-3 pl-[56px]">
        <ProgressLine
          value={goal.pct}
          className="bg-line-soft"
          indicatorClassName={progressTone(goal.status)}
        />
        <Serif className="mt-2 block truncate text-[13px] text-ink-3">
          {goal.note}
        </Serif>
      </div>
    </button>
  );
}

function AllocationRow({
  allocation,
  currencySymbol,
}: {
  allocation: CraftedAllocationRow;
  currencySymbol: string;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-success/10 text-success">
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium">{allocation.from}</p>
        <p className="mt-0.5 truncate text-[11px] text-ink-3">
          <CraftedIcon name={allocation.goalIcon} size={12} className="mr-1 inline" />
          {allocation.goalName} · {shortGoalDate(allocation.date)}
        </p>
      </div>
      <Mono className="shrink-0 text-[14px] font-semibold text-success">
        {formatEUR(allocation.amount, currencySymbol, { sign: true })}
      </Mono>
    </div>
  );
}

export function CraftedGoals({
  goals,
  featured,
  allocations,
  hero,
  counts,
}: CraftedGoalsProps) {
  const currencySymbol = useCurrencySymbol();
  const [tab, setTab] = useState<TabKey>("tutti");
  const visibleGoals = useMemo(
    () =>
      goals.filter((goal) => {
        if (tab === "tutti") return !goal.featured;
        return goal.status === tab;
      }),
    [goals, tab],
  );

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-[var(--sp-page-x)] pb-6 pt-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label className="mb-2 block">Obiettivi</Label>
            <h1 className="text-[30px] font-semibold leading-none tracking-[-0.02em]">
              Gli acquisti evitati{" "}
              <Serif className="font-normal text-ink-2">crescono</Serif>
            </h1>
          </div>
          <Link
            href="#nuovo-obiettivo"
            className="nlc-press inline-flex h-9 shrink-0 items-center rounded-[var(--r-chip)] bg-accent px-3 text-[13px] font-bold text-accent-foreground"
          >
            Nuovo
          </Link>
        </div>

        <Mono className="block text-[clamp(3rem,16vw,4.75rem)] font-semibold leading-[0.84] tracking-[-0.04em]">
          {formatEUR(hero.totalSaved, currencySymbol)}
        </Mono>
        <div className="mt-4">
          <ProgressLine
            thick
            value={hero.totalPct}
            className="bg-line-soft"
            indicatorClassName="bg-accent"
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <MicroStat label="Ritmo attivo" value={`${formatEUR(hero.activePace, currencySymbol)}/m`} tone="accent" />
          <MicroStat label="Da coprire" value={formatEUR(hero.remaining, currencySymbol)} />
          <MicroStat label="Completati" value={hero.completedCount} tone="success" />
        </div>
      </section>
      <Rule soft />

      {tab === "tutti" && featured ? (
        <>
          <FeaturedCard goal={featured} currencySymbol={currencySymbol} />
          <Rule soft />
        </>
      ) : null}

      <section className="sticky top-14 z-30 border-b border-line-soft bg-background/95 px-[var(--sp-page-x)] py-3 backdrop-blur-md">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {TABS.map((item) => {
            const active = item.key === tab;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "nlc-press inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--r-chip)] border px-3 text-[13px] font-medium",
                  active
                    ? "border-accent/40 bg-accent/10 text-foreground"
                    : "border-line text-muted-foreground",
                )}
              >
                {item.label}
                <Mono className="text-[11px] text-ink-3">{counts[item.key]}</Mono>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-[var(--sp-page-x)] pb-2">
        {visibleGoals.length > 0 ? (
          visibleGoals.map((goal, index) => (
            <div
              key={goal.id}
              className={cn(index < visibleGoals.length - 1 && "border-b border-line-soft")}
            >
              <GoalRow goal={goal} />
            </div>
          ))
        ) : (
          <div className="py-8 text-center">
            <Serif className="text-sm text-ink-3">
              Nessun obiettivo in questa vista.
            </Serif>
          </div>
        )}
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <Label className="mb-1.5 block">Versamenti</Label>
            <h2 className="text-[16px] font-semibold leading-tight">Acquisti evitati</h2>
          </div>
          <Link
            href="/entries?kind=evitata"
            className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Regole
          </Link>
        </div>
        {allocations.length > 0 ? (
          allocations.map((allocation, index) => (
            <div key={allocation.id}>
              <AllocationRow allocation={allocation} currencySymbol={currencySymbol} />
              {index < allocations.length - 1 ? <Rule soft /> : null}
            </div>
          ))
        ) : (
          <Serif className="block text-sm text-ink-3">
            I prossimi acquisti evitati appariranno qui come +€ verso gli obiettivi.
          </Serif>
        )}
      </section>
    </div>
  );
}
