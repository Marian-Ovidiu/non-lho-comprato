"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Label, Mono } from "@/components/crafted";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations } from "@/src/components/language/language-context";

type CraftedEntriesHeaderProps = {
  monthLabel: string;
  entriesCount: number;
  totalRealSpent: number;
  totalSaved: number;
  newEntryHref: string;
};

export function CraftedEntriesHeader({
  monthLabel,
  entriesCount,
  totalRealSpent,
  totalSaved,
  newEntryHref,
}: CraftedEntriesHeaderProps) {
  const currencySymbol = useCurrencySymbol();
  const t = useTranslations();
  return (
    <section className="-mx-4 px-5 pb-5 pt-7 sm:-mx-6 lg:-mx-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Label>{t.nav.entries} — {monthLabel.toLowerCase()}</Label>
        <Link
          href={newEntryHref}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-accent px-3 text-[13px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t.entryForm.newTitle}
        </Link>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <Label className="mb-1.5 block">{t.entries.spentLabel}</Label>
          <div className="flex items-baseline gap-2">
            <Mono className="text-[clamp(2.75rem,14vw,3.75rem)] font-semibold leading-[0.85] tracking-[-0.05em]">
              {formatCraftedCompact(totalRealSpent)}
            </Mono>
            <span className="text-base text-accent">{currencySymbol}</span>
          </div>
          <Mono className="mt-2 block text-[11px] tracking-[0.02em] text-ink-3">
            {entriesCount} {entriesCount === 1 ? t.entries.entrySingular : t.entries.entryPlural}
          </Mono>
        </div>
        <div className="text-right">
          <Label className="mb-1.5 block">{t.entries.netImpactLabel}</Label>
          <Mono className="text-xl font-medium">
            {formatCraftedCompact(totalSaved)}
            <span className="text-xs text-accent">{currencySymbol}</span>
          </Mono>
        </div>
      </div>
    </section>
  );
}
