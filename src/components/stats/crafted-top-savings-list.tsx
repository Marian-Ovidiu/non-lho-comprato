"use client";

import Link from "next/link";

import { CraftedIcon, Label, Mono, Rule, Serif } from "@/components/crafted";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import { formatDate } from "@/src/lib/formatters";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { cn } from "@/lib/utils";

export type CraftedTopSavingsItem = {
  id: string;
  title: string;
  categoryName: string;
  date: string | Date;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  source: "manual" | "habit";
};

type CraftedTopSavingsListProps = {
  entries: CraftedTopSavingsItem[];
};

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function CraftedTopSavingsList({ entries }: CraftedTopSavingsListProps) {
  const currencySymbol = useCurrencySymbol();
  const sortedEntries = [...entries].sort(
    (left, right) => right.savedAmount - left.savedAmount,
  );

  return (
    <section className="px-5 py-5">
      <Label className="mb-2 block">Impatto positivo</Label>
      <Serif className="mb-4 block text-sm text-ink-3">
        Non comprato e confronti dove hai speso meno del riferimento.
      </Serif>

      {sortedEntries.length === 0 ? (
        <p className="py-6 text-sm text-ink-3">
          Nessun impatto positivo ancora disponibile.
        </p>
      ) : (
        <div>
          {sortedEntries.map((item, index) => (
            <div key={item.id}>
              <Link
                href={`/entries/${item.id}/edit`}
                className="flex items-start gap-4 py-3.5 transition-opacity hover:opacity-80"
              >
                <CraftedIcon
                  name={getCategoryCraftedIcon({ name: item.categoryName })}
                  size={20}
                  className="mt-0.5 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-[450]">{item.title}</p>
                  <Mono className="mt-0.5 block text-[11px] text-ink-3">
                    {item.categoryName} · {formatDate(toDate(item.date))}
                    {item.source === "habit" ? " · ricorrente" : ""}
                  </Mono>
                  <Serif className="mt-1.5 block text-[13px] text-ink-3">
                    {formatCraftedCompact(item.realCost)}{currencySymbol} spesi invece di{" "}
                    {formatCraftedCompact(item.alternativeCost)}{currencySymbol}
                  </Serif>
                </div>
                <Mono
                  className={cn(
                    "shrink-0 whitespace-nowrap text-[15px] font-medium",
                    item.savedAmount > 0 ? "text-green" : "text-foreground",
                  )}
                >
                  {formatCraftedCompact(item.savedAmount)}
                  <span className="text-[11px] text-accent">{currencySymbol}</span>
                </Mono>
              </Link>
              {index < sortedEntries.length - 1 ? <Rule soft /> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
