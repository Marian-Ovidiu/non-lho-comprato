"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Pause, Plus } from "lucide-react";

import {
  CraftedIcon,
  Label,
  Mono,
  ProgressLine,
  Rule,
  Serif,
} from "@/components/crafted";
import { cn } from "@/lib/utils";
import type {
  CraftedHabitGroupSummary,
  CraftedHabitView,
  CraftedHabitsProps,
  CraftedUpcomingHabit,
  HabitCadence,
  HabitGroup,
  HabitStatus,
} from "@/src/lib/crafted-habits-build";

type CraftedHabitsComponentProps = CraftedHabitsProps;

const GROUP_COLORS: Record<HabitGroup, string> = {
  abbonamenti: "bg-accent",
  utenze: "bg-foreground/60",
  quotidiane: "bg-success/70",
};

function formatMoney(
  value: number,
  currencySymbol: string,
  options: { decimals?: "auto" | 0 | 2 } = {},
) {
  const decimals =
    options.decimals === "auto"
      ? value < 10
        ? 2
        : 0
      : options.decimals ?? 2;

  return `${currencySymbol}${new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}`;
}

function cadenceShort(cadence: HabitCadence) {
  if (cadence === "mensile") return "/mese";
  if (cadence === "annuale") return "/anno";
  if (cadence === "settimanale") return "/sett";
  return "/giorno";
}

function formatShortDate(dateKey?: string) {
  if (!dateKey) {
    return "non previsto";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${dateKey}T00:00:00.000Z`))
    .replace(".", "");
}

function StatusPill({ status }: { status: HabitStatus }) {
  if (status === "attiva") {
    return null;
  }

  const paused = status === "pausa";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[var(--r-chip)] border px-2 py-1 text-[9.5px] font-semibold uppercase leading-none tracking-[0.12em]",
        paused
          ? "border-line text-ink-3"
          : "border-accent/40 text-accent",
      )}
    >
      {paused ? <Pause className="size-2.5" aria-hidden="true" /> : null}
      {paused ? "In pausa" : "Da rivedere"}
    </span>
  );
}

function LegendDot({ group }: { group: HabitGroup }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", GROUP_COLORS[group])}
      aria-hidden="true"
    />
  );
}

function UpcomingCard({
  habit,
  currencySymbol,
}: {
  habit: CraftedUpcomingHabit;
  currencySymbol: string;
}) {
  return (
    <article className="w-[180px] shrink-0 rounded-[var(--r-card)] bg-surface-muted p-3.5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-[var(--r-control)] bg-background text-muted-foreground">
          <CraftedIcon name={habit.icon} size={17} />
        </span>
        <Label className="pt-1 text-right">{habit.relativeLabel}</Label>
      </div>
      <h3 className="truncate text-[15px] font-medium">{habit.name}</h3>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-[12px] text-ink-3">{habit.shortDate}</span>
        <div className="text-right">
          <Mono className="text-[15px] font-semibold">
            {formatMoney(habit.amount, currencySymbol, { decimals: "auto" })}
          </Mono>
          <Label className="ml-1">{cadenceShort(habit.cadence)}</Label>
        </div>
      </div>
    </article>
  );
}

function GroupTab({
  group,
  active,
  onClick,
}: {
  group: CraftedHabitGroupSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "nlc-press w-[168px] shrink-0 rounded-[var(--r-card)] border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-accent/40 bg-accent/[0.08]"
          : "border-line bg-transparent",
      )}
    >
      <span className="block text-[14px] font-semibold">{group.label}</span>
      <Serif className="mt-1 block text-[12px] text-ink-3">{group.hint}</Serif>
    </button>
  );
}

function HabitRow({
  habit,
  currencySymbol,
}: {
  habit: CraftedHabitView;
  currencySymbol: string;
}) {
  const paused = habit.status === "pausa";
  const review = habit.status === "da-rivedere";

  return (
    <div className={cn("py-3.5", paused && "opacity-70")}>
      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground",
            review && "bg-accent/12 text-accent",
          )}
        >
          <CraftedIcon name={habit.icon} size={18} />
        </span>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-[15px] font-medium">{habit.name}</p>
            <StatusPill status={habit.status} />
          </div>
          <p className="mt-1 truncate text-[11px] text-ink-3">
            {habit.frequencyLabel} · prossimo {formatShortDate(habit.nextDate)} · {habit.who ?? "solo io"}
          </p>
          {habit.usageNote ? (
            <Serif className="mt-0.5 block truncate text-[13px] leading-4 text-muted-foreground">
              &quot;{habit.usageNote}&quot;
            </Serif>
          ) : null}
        </div>
        <div className="text-right">
          <Mono className="block text-[15px] font-semibold">
            {formatMoney(habit.amount, currencySymbol, { decimals: "auto" })}
          </Mono>
          <Label>{cadenceShort(habit.cadence)}</Label>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 pl-[52px]">
        <ProgressLine
          value={habit.sharePercent}
          className="flex-1 bg-line-soft"
          indicatorClassName={review ? "bg-accent" : "bg-muted-foreground"}
        />
        <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
      </div>
    </div>
  );
}

export function CraftedHabits({
  habits,
  upcoming,
  groups,
  reviewHabits,
  perMonth,
  perYear,
  activeCount,
  pausedCount,
  potentialYearlySavings,
  currencySymbol,
}: CraftedHabitsComponentProps) {
  const [activeGroup, setActiveGroup] = useState<HabitGroup>(
    () =>
      groups.find((group) => habits.some((habit) => habit.group === group.group))?.group ??
      "abbonamenti",
  );
  const visibleHabits = useMemo(
    () => habits.filter((habit) => habit.group === activeGroup),
    [activeGroup, habits],
  );

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-[var(--sp-page-x)] pb-5 pt-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label className="mb-2 block">Abitudini</Label>
            <h1 className="text-[28px] font-semibold leading-none tracking-[-0.02em]">
              Costano{" "}
              <Serif className="font-normal text-muted-foreground">
                ogni mese
              </Serif>
            </h1>
          </div>
          <Link
            href="#nuova-abitudine"
            className="nlc-press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--r-chip)] bg-accent px-3 text-[13px] font-bold text-accent-foreground"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Nuova
          </Link>
        </div>

        <Mono className="block text-[clamp(3rem,16vw,4.75rem)] font-semibold leading-[0.84] tracking-[-0.04em]">
          {formatMoney(perMonth, currencySymbol)}
        </Mono>
        <Mono className="mt-3 block text-[12px] text-ink-3">
          {formatMoney(perYear, currencySymbol, { decimals: 0 })}/anno · {activeCount} attive · {pausedCount} in pausa
        </Mono>

        <div className="mt-6 flex h-0.5 w-full overflow-hidden rounded-full bg-transparent">
          {groups
            .filter((group) => group.total > 0)
            .map((group) => (
              <span
                key={group.group}
                className={GROUP_COLORS[group.group]}
                style={{ width: `${group.share}%` }}
                aria-hidden="true"
              />
            ))}
        </div>
        <div className="mt-3 grid gap-2">
          {groups.map((group) => (
            <div key={group.group} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
                <LegendDot group={group.group} />
                <span className="truncate">{group.label}</span>
              </span>
              <Mono className="shrink-0 text-[12px] text-muted-foreground">
                {formatMoney(group.total, currencySymbol)}
              </Mono>
            </div>
          ))}
        </div>
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <Label className="mb-3 block">Prossimi 7 giorni</Label>
        {upcoming.length > 0 ? (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {upcoming.map((habit) => (
              <UpcomingCard
                key={`${habit.id}-${habit.nextDate}`}
                habit={habit}
                currencySymbol={currencySymbol}
              />
            ))}
          </div>
        ) : (
          <Serif className="block text-sm text-ink-3">
            Nessun addebito previsto nei prossimi sette giorni.
          </Serif>
        )}
      </section>
      <Rule soft />

      {reviewHabits.length > 0 ? (
        <>
          <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
            <div className="rounded-[var(--r-card)] border border-accent/25 bg-accent/[0.06] p-4">
              <div className="mb-3 flex items-center gap-2 text-accent">
                <AlertTriangle className="size-4" aria-hidden="true" />
                <h2 className="text-[16px] font-semibold">
                  {reviewHabits.length} abbonamenti poco usati
                </h2>
              </div>
              <Serif className="block text-sm text-muted-foreground">
                Potresti risparmiare fino a{" "}
                <Mono className="text-accent">
                  {formatMoney(potentialYearlySavings, currencySymbol, { decimals: 0 })}
                </Mono>{" "}
                in un anno
              </Serif>
              <div className="mt-4">
                {reviewHabits.map((habit, index) => (
                  <div key={habit.id}>
                    <div className="flex items-center justify-between gap-3 py-2">
                      <span className="truncate text-[14px] font-medium">{habit.name}</span>
                      <Mono className="shrink-0 text-[13px] text-accent">
                        {formatMoney(habit.monthlyAmount, currencySymbol)}
                      </Mono>
                    </div>
                    {index < reviewHabits.length - 1 ? <Rule soft /> : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
          <Rule soft />
        </>
      ) : null}

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {groups.map((group) => (
            <GroupTab
              key={group.group}
              group={group}
              active={group.group === activeGroup}
              onClick={() => setActiveGroup(group.group)}
            />
          ))}
        </div>
      </section>

      <section className="px-[var(--sp-page-x)] pb-2">
        {visibleHabits.length > 0 ? (
          visibleHabits.map((habit, index) => (
            <div key={habit.id}>
              <HabitRow habit={habit} currencySymbol={currencySymbol} />
              {index < visibleHabits.length - 1 ? <Rule soft /> : null}
            </div>
          ))
        ) : (
          <div className="py-8 text-center">
            <Serif className="text-sm text-ink-3">
              Nessuna abitudine in questo gruppo.
            </Serif>
          </div>
        )}
      </section>
    </div>
  );
}
