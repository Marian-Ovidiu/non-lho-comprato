"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Amount, CraftedIcon, Eyebrow, Rule } from "@/components/crafted";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { getCategoryIdentity } from "@/src/lib/category-identity";
import { getLocalizedCategoryName } from "@/src/lib/category-locale";
import { languageToLocale } from "@/src/lib/i18n";
import {
  useTranslations,
  useWorkspaceLanguage,
} from "@/src/components/language/language-context";

export type CraftedBiggestExpenseItem = {
  id: string;
  title: string;
  categoryName: string;
  categorySlug: string | null;
  /** ISO: la data viene serializzata dal server. */
  date: string;
  realCost: number;
};

/**
 * Le uscite più grandi del periodo.
 *
 * Sostituisce la classifica dei risparmi, che ordinava per impatto netto: una
 * metrica che vale 19 euro su 320 movimenti e che quindi mostrava sempre le
 * stesse due voci. Qui la domanda ha sempre una risposta, e ogni riga porta
 * al movimento invece di essere un vicolo cieco.
 */
export function CraftedBiggestExpenses({
  entries,
}: {
  entries: CraftedBiggestExpenseItem[];
}) {
  const t = useTranslations();
  const language = useWorkspaceLanguage();
  const locale = languageToLocale(language);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
      <Eyebrow className="mb-3 block">{t.stats.biggestExpensesLabel}</Eyebrow>
      {entries.map((entry, index) => {
        const identity = getCategoryIdentity({
          slug: entry.categorySlug ?? undefined,
          name: entry.categoryName,
        });

        return (
          <div key={entry.id}>
            <Link
              href={`/entries/${entry.id}/edit`}
              className="nlc-press flex min-h-16 items-center gap-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-surface-muted">
                <CraftedIcon
                  name={getCategoryCraftedIcon({
                    slug: entry.categorySlug,
                    name: entry.categoryName,
                  })}
                  size={17}
                  className={identity.inkClassName}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">
                  {entry.title}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-ink-3">
                  {getLocalizedCategoryName(entry.categorySlug ?? "", language) ??
                    entry.categoryName}
                  {" · "}
                  {new Intl.DateTimeFormat(locale, {
                    day: "numeric",
                    month: "short",
                  }).format(new Date(entry.date))}
                </span>
              </span>
              <Amount value={entry.realCost} className="text-[15px] font-medium" />
              <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
            </Link>
            {index < entries.length - 1 ? <Rule soft /> : null}
          </div>
        );
      })}
    </section>
  );
}
