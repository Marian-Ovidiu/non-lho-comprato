"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";

import { Amount, Eyebrow, Serif } from "@/components/crafted";
import { useTranslations } from "@/src/components/language/language-context";

type CraftedEntriesHeaderProps = {
  monthLabel: string;
  yearLabel: string;
  monthCode: string;
  selectedMonthKey: string;
  monthOptions: Array<{
    month: string;
    label: string;
    entriesCount: number;
  }>;
  entriesCount: number;
  totalRealSpent: number;
  totalAvoided: number;
  totalSaved: number;
  newEntryHref: string;
};

export function CraftedEntriesHeader({
  monthLabel,
  yearLabel,
  monthCode,
  selectedMonthKey,
  monthOptions,
  entriesCount,
  totalRealSpent,
  totalAvoided,
  totalSaved,
  newEntryHref,
}: CraftedEntriesHeaderProps) {
  const t = useTranslations();
  const router = useRouter();

  return (
    <section className="px-[var(--sp-page-x)] pb-4 pt-1">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Eyebrow className="block">{t.nav.entries}</Eyebrow>
          <h1 className="mt-2.5 truncate text-[20px] font-semibold leading-none tracking-[-0.02em]">
            {monthLabel}{" "}
            <Serif className="font-normal text-muted-foreground">{yearLabel}</Serif>
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <label className="relative inline-flex h-9 shrink-0 items-center rounded-[var(--r-control)] border border-line text-[12px] tabular-nums text-muted-foreground">
            <span className="sr-only">{t.entries.monthSelectLabel}</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              {monthCode}
            </span>
            <select
              value={selectedMonthKey}
              onChange={(event) => {
                router.push(`/entries?month=${event.target.value}`);
              }}
              className="h-full appearance-none rounded-[var(--r-control)] bg-transparent pl-3 pr-8 text-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={t.entries.monthSelectLabel}
            >
              {monthOptions.map((option) => (
                <option key={option.month} value={option.month}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2"
              aria-hidden="true"
            />
          </label>
          <Link
            href={newEntryHref}
            className="nlc-press inline-flex size-9 items-center justify-center rounded-[var(--r-control)] bg-accent text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={t.entryForm.newTitle}
          >
            <Plus className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Un numero solo, ed è quello che è uscito davvero dal conto. Le altre
          due cifre non sono numeri di pari grado: sono una postilla, e stanno
          nella riga di postille. */}
      <Amount
        value={totalRealSpent}
        className="mt-4 block whitespace-nowrap text-[length:var(--num-lead)] font-semibold"
      />

      <p className="mt-2.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[12px] leading-4 text-ink-3">
        <span className="tabular-nums">
          {entriesCount}{" "}
          {entriesCount === 1 ? t.entries.entrySingular : t.entries.entryPlural}
        </span>
        {totalAvoided > 0 ? (
          <span aria-hidden="true">·</span>
        ) : null}
        {totalAvoided > 0 ? (
          <span>
            <Amount value={totalAvoided} className="font-medium text-[var(--avoided-ink)]" />{" "}
            {t.entries.avoidedTotalLabel}
          </span>
        ) : null}
        {totalSaved > 0 ? <span aria-hidden="true">·</span> : null}
        {totalSaved > 0 ? (
          <span>
            <Amount value={totalSaved} className="font-medium" />{" "}
            {t.entries.savedTotalLabel}
          </span>
        ) : null}
      </p>
    </section>
  );
}
