import Link from "next/link";
import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { Plus } from "lucide-react";

import { getGoalAllocationFeed, getGoalsWithProgress } from "@/src/actions/goals";
import { CraftedGoalForm } from "@/src/components/goals/crafted-goal-form";
import { CraftedGoals } from "@/src/components/goals/crafted-goals";
import { CraftedGoalsEmptyState } from "@/src/components/goals/crafted-goals-empty-state";
import { Label, Rule } from "@/components/crafted";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { buildCraftedGoalsProps } from "@/src/lib/crafted-goals-build";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getCurrentWorkspaceCurrency, getCurrentWorkspaceLanguage } from "@/src/lib/workspace-context";
import { getCurrencySymbol } from "@/src/lib/workspace-currency";
import { getTranslations } from "@/src/lib/i18n";

export const metadata: Metadata = {
  title: "Obiettivi · Non l'ho comprato",
};

export default async function GoalsPage() {
  let loadError: string | null = null;
  let goals: Awaited<ReturnType<typeof getGoalsWithProgress>> = [];
  let allocations: Awaited<ReturnType<typeof getGoalAllocationFeed>> = [];

  try {
    [goals, allocations] = await Promise.all([
      getGoalsWithProgress(),
      getGoalAllocationFeed(),
    ]);
  } catch (error) {
    unstable_rethrow(error);
    loadError = formatEntryLoadError(error);
    console.error("Failed to load goals page:", error);
  }

  const [currency, language] = await Promise.all([
    getCurrentWorkspaceCurrency(),
    getCurrentWorkspaceLanguage(),
  ]);
  const t = getTranslations(language);
  const craftedProps = buildCraftedGoalsProps(
    goals,
    allocations,
    getCurrencySymbol(currency),
    language,
  );

  return (
    <main className="pb-6">
      <section className="-mx-4 px-5 pb-5 pt-7 sm:-mx-6 lg:-mx-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[clamp(1.75rem,8vw,2.25rem)] font-semibold tracking-[-0.03em]">
            {t.nav.goals}
          </h1>
          <Link
            href="#nuovo-obiettivo"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-accent px-3 text-[13px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {t.goals.newGoalLabel}
          </Link>
        </div>
      </section>

      {loadError ? (
        <div className="px-5 pb-4">
          <DataLoadErrorBanner
            title={t.goals.loadError}
            message={loadError}
          />
        </div>
      ) : null}

      {!loadError && goals.length === 0 ? (
        <CraftedGoalsEmptyState />
      ) : !loadError ? (
        <CraftedGoals {...craftedProps} />
      ) : null}

      <section id="nuovo-obiettivo" className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        {!loadError && goals.length > 0 ? <Rule className="mb-6" /> : null}
        <Label className="mb-4 block">{t.goals.newGoalLabel}</Label>
        <CraftedGoalForm />
      </section>
    </main>
  );
}
