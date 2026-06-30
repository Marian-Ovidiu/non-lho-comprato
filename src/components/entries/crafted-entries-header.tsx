"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";

import { Label, Mono, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations } from "@/src/components/language/language-context";

type CraftedEntriesHeaderProps = {
  monthLabel: string;
  yearLabel: string;
  monthCode: string;
  entriesCount: number;
  totalRealSpent: number;
  totalAvoided: number;
  totalSaved: number;
  newEntryHref: string;
};

type TotalTileProps = {
  label: string;
  value: number;
  tone?: "default" | "success" | "accent";
};

function formatEUR(value: number, currencySymbol: string, sign: "none" | "plus" = "none") {
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  return `${sign === "plus" ? "+" : ""}${currencySymbol}${formatted}`;
}

function TotalTile({ label, value, tone = "default" }: TotalTileProps) {
  const currencySymbol = useCurrencySymbol();

  return (
    <div className="min-w-0 rounded-[var(--r-card)] bg-surface-muted px-3 py-3.5">
      <Label className="mb-2 block truncate">{label}</Label>
      <Mono
        className={cn(
          "block truncate text-[16px] font-semibold leading-none sm:text-[18px]",
          tone === "success" && "text-success",
          tone === "accent" && "text-accent",
        )}
      >
        {formatEUR(value, currencySymbol, tone === "default" ? "none" : "plus")}
      </Mono>
    </div>
  );
}

export function CraftedEntriesHeader({
  monthLabel,
  yearLabel,
  monthCode,
  entriesCount,
  totalRealSpent,
  totalAvoided,
  totalSaved,
  newEntryHref,
}: CraftedEntriesHeaderProps) {
  const t = useTranslations();

  return (
    <section className="-mx-4 px-[var(--sp-page-x)] pb-5 pt-5 sm:-mx-6 lg:-mx-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label className="mb-2 block">{t.nav.entries}</Label>
          <h1 className="truncate text-[28px] font-semibold leading-none tracking-[-0.02em]">
            {monthLabel}{" "}
            <Serif className="font-normal text-muted-foreground">
              {yearLabel}
            </Serif>
          </h1>
          <Mono className="mt-2 block text-[11px] text-ink-3">
            {entriesCount} {entriesCount === 1 ? t.entries.entrySingular : t.entries.entryPlural}
          </Mono>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="nlc-press inline-flex h-9 items-center gap-1.5 rounded-[var(--r-control)] border border-line px-3 text-[12px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Seleziona mese"
          >
            <Mono>{monthCode}</Mono>
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </button>
          <Link
            href={newEntryHref}
            className="nlc-press inline-flex size-9 items-center justify-center rounded-[var(--r-control)] bg-accent text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={t.entryForm.newTitle}
          >
            <Plus className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <TotalTile label="Speso" value={totalRealSpent} />
        <TotalTile label="Evitato" value={totalAvoided} tone="success" />
        <TotalTile label="Risparmiato" value={totalSaved} tone="accent" />
      </div>
    </section>
  );
}
