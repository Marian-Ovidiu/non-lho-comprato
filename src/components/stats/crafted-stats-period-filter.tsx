"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Label, Mono } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/src/components/language/language-context";
import type { StatsMonthOption, StatsPeriod } from "@/src/lib/stats-period";
import { getWorkspaceMemberFilterOptions } from "@/src/lib/workspace-member-filter";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type CraftedStatsPeriodFilterProps = {
  members: WorkspaceMemberOption[];
  selectedMemberUserId?: string;
  selectedPeriod: StatsPeriod;
  selectedMonthKey: string;
  selectedMonthLabel: string;
  selectedYear: string;
  monthOptions: StatsMonthOption[];
};

export function CraftedStatsPeriodFilter({
  members,
  selectedMemberUserId,
  selectedPeriod,
  selectedMonthKey,
  selectedMonthLabel,
  selectedYear,
  monthOptions,
}: CraftedStatsPeriodFilterProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const safeMonthOptions =
    monthOptions.length > 0
      ? monthOptions
      : [{ month: selectedMonthKey, label: selectedMonthLabel, entriesCount: 0 }];

  const personOptions = getWorkspaceMemberFilterOptions(members);
  const periodTabs: Array<{ id: StatsPeriod; label: string }> = [
    { id: "month", label: t.stats.periodMonth },
    { id: "year", label: t.stats.periodYear },
    { id: "all", label: t.stats.periodAll },
  ];

  function replaceStatsParams(updates: {
    person?: string;
    period?: StatsPeriod;
    month?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.person !== undefined) {
      if (updates.person) {
        params.set("person", updates.person);
      } else {
        params.delete("person");
      }
    }

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
    <section aria-labelledby="stats-period-filter" className="px-5 pb-2 pt-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Label>
          <span id="stats-period-filter">Filtri</span>
        </Label>
        {isPending ? (
          <Mono className="text-[10px] uppercase tracking-[0.18em] text-ink-3">
            {t.stats.updating}
          </Mono>
        ) : null}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
        {personOptions.length > 1 ? (
          <label className="min-w-0 rounded-[var(--r-control)] border border-line bg-surface px-2 py-1.5">
            <span className="block text-[8.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
              Persona
            </span>
            <select
              value={selectedMemberUserId ?? ""}
              disabled={isPending}
              onChange={(event) =>
                replaceStatsParams({ person: event.currentTarget.value })
              }
              className="h-6 w-full bg-transparent text-[12px] font-semibold text-foreground outline-none disabled:opacity-60"
            >
              {personOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="hidden" />
        )}

        <label className="min-w-[94px] rounded-[var(--r-control)] border border-line bg-surface px-2 py-1.5">
          <span className="block text-[8.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
            Periodo
          </span>
          <select
            value={selectedPeriod}
            disabled={isPending}
            onChange={(event) =>
              replaceStatsParams({ period: event.currentTarget.value as StatsPeriod })
            }
            className={cn(
              "h-6 w-full bg-transparent text-[12px] font-semibold text-foreground outline-none disabled:opacity-60",
              selectedPeriod === "year" && "text-accent",
            )}
            aria-label={t.stats.periodFilterAriaLabel}
          >
            {periodTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
                {tab.id === "year" ? ` ${selectedYear}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-0 rounded-[var(--r-control)] border border-line bg-surface px-2 py-1.5">
          <span className="block text-[8.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
            {t.stats.monthSelectLabel}
          </span>
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
            className="h-6 w-full bg-transparent text-[12px] font-semibold text-foreground outline-none disabled:opacity-60"
          >
            {safeMonthOptions.map((option) => (
              <option key={option.month} value={option.month}>
                {option.label}
                {option.entriesCount > 0 ? ` · ${option.entriesCount}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
