"use client";

import { Label, Mono } from "@/components/crafted";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";

type CraftedEntriesHeaderProps = {
  monthLabel: string;
  entriesCount: number;
  totalRealSpent: number;
  totalSaved: number;
};

export function CraftedEntriesHeader({
  monthLabel,
  entriesCount,
  totalRealSpent,
  totalSaved,
}: CraftedEntriesHeaderProps) {
  const currencySymbol = useCurrencySymbol();
  return (
    <section className="-mx-4 px-5 pb-5 pt-7 sm:-mx-6 lg:-mx-8">
      <Label className="mb-4 block">Movimenti — {monthLabel.toLowerCase()}</Label>
      <div className="flex items-end justify-between gap-4">
        <div>
          <Label className="mb-1.5 block">Speso</Label>
          <div className="flex items-baseline gap-2">
            <Mono className="text-[clamp(2.75rem,14vw,3.75rem)] font-semibold leading-[0.85] tracking-[-0.05em]">
              {formatCraftedCompact(totalRealSpent)}
            </Mono>
            <span className="text-base text-accent">{currencySymbol}</span>
          </div>
          <Mono className="mt-2 block text-[11px] tracking-[0.02em] text-ink-3">
            {entriesCount} {entriesCount === 1 ? "movimento" : "movimenti"}
          </Mono>
        </div>
        <div className="text-right">
          <Label className="mb-1.5 block">Impatto netto</Label>
          <Mono className="text-xl font-medium">
            {formatCraftedCompact(totalSaved)}
            <span className="text-xs text-accent">{currencySymbol}</span>
          </Mono>
        </div>
      </div>
    </section>
  );
}
