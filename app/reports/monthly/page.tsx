import Link from "next/link";
import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { Rule, Serif } from "@/components/crafted";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { getCurrentWorkspaceLanguage } from "@/src/lib/workspace-context";
import { getTranslations } from "@/src/lib/i18n";

export const metadata: Metadata = {
  title: "Report mensile · Non l'ho comprato",
};

/**
 * Pagina congelata, non rimossa.
 *
 * Ripeteva i numeri delle Statistiche — spesa per categoria, totale del mese —
 * con sopra il vocabolario delle spese evitate: il suo numero grande era
 * "Risparmio netto", una metrica che in tre mesi d'uso reale vale 19,20 euro
 * su 320 movimenti. Aveva tre cose in più, e una era un pulsante di
 * condivisione senza handler; le uscite più grandi del periodo sono passate
 * nelle Statistiche, dove c'è già il selettore che permette di scegliere il
 * mese.
 *
 * Il modulo di calcolo resta al suo posto: qui si è chiusa la porta.
 */
export default async function MonthlyReportPage() {
  const language = await getCurrentWorkspaceLanguage();
  const t = getTranslations(language);

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/more"
        eyebrow={t.more.analyticsSection}
        title={t.more.monthlyReportLabel}
        context={t.monthlyReportFrozen.context}
      />

      <Rule />

      <section className="px-[var(--sp-page-x)] py-10 text-center">
        <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground">
          <BarChart3 className="size-5" aria-hidden="true" />
        </div>
        <p className="text-[16px] font-semibold">{t.monthlyReportFrozen.title}</p>
        <Serif className="mx-auto mt-3 block max-w-[330px] text-sm leading-relaxed text-ink-3">
          {t.monthlyReportFrozen.description}
        </Serif>
        <div className="mt-7 flex flex-col items-center gap-3">
          <Link
            href="/stats"
            className="nlc-press inline-flex min-h-11 items-center rounded-[var(--r-cta)] bg-accent px-5 text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            {t.monthlyReportFrozen.toStats}
          </Link>
          <Link
            href="/insights"
            className="nlc-press inline-flex min-h-11 items-center rounded-[var(--r-cta)] border border-line px-5 text-[14px] font-medium text-foreground transition-colors hover:border-foreground/30"
          >
            {t.monthlyReportFrozen.toInsights}
          </Link>
        </div>
      </section>
    </main>
  );
}
