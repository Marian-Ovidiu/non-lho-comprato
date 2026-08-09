"use client";

import Link from "next/link";

import { Amount, CraftedIcon, Eyebrow, Mono, Rule, Serif } from "@/components/crafted";
import { EntrySource } from "@/src/lib/generated/prisma/enums";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { getCategoryIdentity } from "@/src/lib/category-identity";
import { useLocaleFormatters } from "@/src/components/language/use-locale-formatters";
import { useTranslations } from "@/src/components/language/language-context";
import { cn } from "@/lib/utils";

export type CraftedTopSavingsItem = {
  id: string;
  title: string;
  categoryName: string;
  date: string | Date;
  realCost: number;
  alternativeCost: number;
  savedAmount: number;
  source: EntrySource;
};

type CraftedTopSavingsListProps = {
  entries: CraftedTopSavingsItem[];
};

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function CraftedTopSavingsList({ entries }: CraftedTopSavingsListProps) {
  const { formatDate } = useLocaleFormatters();
  const t = useTranslations();
  const sortedEntries = [...entries].sort(
    (left, right) => right.savedAmount - left.savedAmount,
  );

  return (
    <section className="px-5 py-5">
      <Eyebrow className="mb-2 block">{t.topSavings.title}</Eyebrow>
      <Serif className="mb-4 block text-sm text-ink-3">
        {t.topSavings.subtitle}
      </Serif>

      {sortedEntries.length === 0 ? (
        <p className="py-6 text-sm text-ink-3">
          {t.topSavings.empty}
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
                  className={cn(
                    "mt-0.5 shrink-0",
                    getCategoryIdentity({ name: item.categoryName }).inkClassName,
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-[450]">{item.title}</p>
                  <Mono className="mt-0.5 block text-[11px] text-ink-3">
                    {item.categoryName} · {formatDate(toDate(item.date))}
                    {item.source === "habit" ? ` · ${t.topSavings.recurring}` : ""}
                  </Mono>
                  <Serif className="mt-1.5 block text-[13px] text-ink-3">
                    <Amount value={item.realCost} className="text-[13px]" />{" "}
                    {t.entries.insteadOf}{" "}
                    <Amount value={item.alternativeCost} className="text-[13px]" />
                  </Serif>
                </div>
                {/* Il verde qui è la scala del giudizio, ed è il suo posto: la
                    riga dice che dei soldi non sono usciti. */}
                <Amount
                  value={item.savedAmount}
                  className={cn(
                    "shrink-0 whitespace-nowrap text-[15px] font-medium",
                    item.savedAmount > 0 ? "text-[var(--avoided-ink)]" : "text-foreground",
                  )}
                />
              </Link>
              {index < sortedEntries.length - 1 ? <Rule soft /> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
