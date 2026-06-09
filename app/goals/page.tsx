import { getGoalsWithProgress } from "@/src/actions/goals";
import { getMonthlyStats } from "@/src/actions/stats";
import { CraftedGoalForm } from "@/src/components/goals/crafted-goal-form";
import { CraftedGoals } from "@/src/components/goals/crafted-goals";
import { CraftedGoalsEmptyState } from "@/src/components/goals/crafted-goals-empty-state";
import { Label, Rule } from "@/components/crafted";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { buildCraftedGoalsProps } from "@/src/lib/crafted-goals-build";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { getCurrentWorkspace } from "@/src/lib/workspace-context";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  let loadError: string | null = null;
  let goals: Awaited<ReturnType<typeof getGoalsWithProgress>> = [];
  let workspace: Awaited<ReturnType<typeof getCurrentWorkspace>> | null = null;
  let monthlyStats: Awaited<ReturnType<typeof getMonthlyStats>> = [];

  try {
    [goals, workspace, monthlyStats] = await Promise.all([
      getGoalsWithProgress(),
      getCurrentWorkspace().catch(() => null),
      getMonthlyStats().catch(() => []),
    ]);
  } catch (error) {
    loadError = formatEntryLoadError(error);
    console.error("Failed to load goals page:", error);
  }

  const defaultPerson = workspace?.kind === "shared" ? "TUTTI" : "";
  const monthSaved = monthlyStats.at(-1)?.totalSaved ?? 0;
  const craftedProps = buildCraftedGoalsProps(goals, monthSaved);

  return (
    <main className="pb-6">
      {loadError ? (
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare gli obiettivi"
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
        <Label className="mb-4 block">Nuovo obiettivo</Label>
        <CraftedGoalForm defaultPerson={defaultPerson} />
      </section>
    </main>
  );
}
