import Link from "next/link";
import type { Metadata } from "next";
import { Target } from "lucide-react";

import { Rule, Serif } from "@/components/crafted";
import { CraftedSubpageHeader } from "@/src/components/layout/crafted-subpage-header";
import { getCurrentWorkspaceLanguage } from "@/src/lib/workspace-context";
import { getTranslations } from "@/src/lib/i18n";

export const metadata: Metadata = {
  title: "Obiettivi · Non l'ho comprato",
};

/**
 * Pagina congelata, non rimossa.
 *
 * Il progresso delle mete era alimentato solo dalle spese evitate
 * (`SUM(alternativeCost) WHERE mode = 'avoided'`), che in tre mesi d'uso reale
 * valgono 19,20 euro su 320 movimenti: le due mete create erano ferme allo
 * 0,3% e una è stata disattivata il giorno dopo. Prima di rimetterle in piedi
 * va deciso a cosa agganciarle davvero.
 *
 * I dati restano nel database e le action non sono state toccate: qui si è
 * chiusa la porta, non buttato via la stanza.
 */
export default async function GoalsPage() {
  const language = await getCurrentWorkspaceLanguage();
  const t = getTranslations(language);

  return (
    <main className="pb-6">
      <CraftedSubpageHeader
        backHref="/more"
        eyebrow={t.more.managementSection}
        title={t.more.goalsLabel}
        context={t.goalsFrozen.context}
      />

      <Rule />

      <section className="px-[var(--sp-page-x)] py-10 text-center">
        <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground">
          <Target className="size-5" aria-hidden="true" />
        </div>
        <p className="text-[16px] font-semibold">{t.goalsFrozen.title}</p>
        <Serif className="mx-auto mt-3 block max-w-[320px] text-sm leading-relaxed text-ink-3">
          {t.goalsFrozen.description}
        </Serif>
        <div className="mt-7">
          <Link
            href="/more"
            className="nlc-press inline-flex min-h-11 items-center rounded-[var(--r-cta)] border border-line px-5 text-[14px] font-medium text-foreground transition-colors hover:border-foreground/30"
          >
            {t.goalsFrozen.back}
          </Link>
        </div>
      </section>
    </main>
  );
}
