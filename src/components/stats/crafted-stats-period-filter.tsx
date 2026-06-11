"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Label, Mono } from "@/components/crafted";
import { cn } from "@/lib/utils";
import type { StatsMonthOption, StatsPeriod } from "@/src/lib/stats-period";

const PERIOD_TABS: Array<{
  id: StatsPeriod;
  label: string;
  detail: string;
}> = [
  { id: "month", label: "Mese", detail: "mese selezionato" },
  { id: "year", label: "Anno", detail: "anno del mese scelto" },
  { id: "all", label: "Sempre", detail: "tutti i dati" },
];

type CraftedStatsPeriodFilterProps = {
  selectedPeriod: StatsPeriod;
  selectedMonthKey: string;
  selectedMonthLabel: string;
  selectedYear: string;
  monthOptions: StatsMonthOption[];
};

export function CraftedStatsPeriodFilter({
  selectedPeriod,
  selectedMonthKey,
  selectedMonthLabel,
  selectedYear,
  monthOptions,
}: CraftedStatsPeriodFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const safeMonthOptions =
    monthOptions.length > 0
      ? monthOptions
      : [{ month: selectedMonthKey, label: selectedMonthLabel, entriesCount: 0 }];

  function replaceStatsParams(updates: {
    period?: StatsPeriod;
    month?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.period) {
      params.set("period", updates.period);
    }

    if (updates.month) {
      params.set("month", updates.month);
    }

    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <section aria-labelledby="stats-period-filter" className="px-5 pt-5 pb-0">
      <div className="mb-3 flex items-end justify-between gap-3">
        <Label>
          <span id="stats-period-filter">Periodo</span>
        </Label>
        {isPending ? (
          <Mono className="text-[10px] uppercase tracking-[0.18em] text-ink-3">
            Aggiorno
          </Mono>
        ) : null}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtro periodo statistiche">
        {PERIOD_TABS.map((tab) => {
          const selected = selectedPeriod === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={selected}
              disabled={isPending}
              onClick={() => replaceStatsParams({ period: tab.id })}
              className={cn(
                "min-h-11 shrink-0 rounded-2xl border px-4 py-2.5 text-left transition-[border-color,background-color,color,opacity,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60",
                selected
                  ? "border-foreground/20 bg-foreground text-background"
                  : "border-line bg-surface text-foreground hover:border-foreground/20",
              )}
            >
              <span className="block text-[13px] font-semibold leading-none">
                {tab.label}
              </span>
              <span
                className={cn(
                  "mt-1 block text-[10.5px]",
                  selected ? "text-background/70" : "text-ink-3",
                )}
              >
                {tab.id === "year" ? selectedYear : tab.detail}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-1.5">
        <label
          htmlFor="stats-month"
          className="shrink-0 text-[9px] font-medium uppercase tracking-[0.16em] text-ink-3"
        >
          Mese
        </label>
        <select
          id="stats-month"
          value={selectedMonthKey}
          disabled={isPending}
          onChange={(event) =>
            replaceStatsParams({
              period: "month",
              month: event.currentTarget.value,
            })
          }
          className="h-7 max-w-[12.5rem] bg-transparent pr-1 text-[13px] font-semibold text-foreground outline-none disabled:opacity-60"
        >
          {safeMonthOptions.map((option) => (
            <option key={option.month} value={option.month}>
              {option.label}
              {option.entriesCount > 0 ? ` · ${option.entriesCount}` : ""}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
