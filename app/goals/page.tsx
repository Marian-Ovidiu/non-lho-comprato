import { getGoalsWithProgress } from "@/src/actions/goals";
import { getMonthlyStats } from "@/src/actions/stats";
import { CraftedGoalForm } from "@/src/components/goals/crafted-goal-form";
import { CraftedGoals } from "@/src/components/goals/crafted-goals";
import { CraftedGoalsEmptyState } from "@/src/components/goals/crafted-goals-empty-state";
import { Label, Rule } from "@/components/crafted";
import { buildCraftedGoalsProps } from "@/src/lib/crafted-goals-build";
import { getCurrentWorkspace } from "@/src/lib/workspace-context";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const [goals, workspace, monthlyStats] = await Promise.all([
    getGoalsWithProgress(),
    getCurrentWorkspace().catch(() => null),
    getMonthlyStats().catch(() => []),
  ]);

  const defaultPerson = workspace?.kind === "shared" ? "TUTTI" : "";
  const monthSaved = monthlyStats.at(-1)?.totalSaved ?? 0;
  const craftedProps = buildCraftedGoalsProps(goals, monthSaved);

  return (
    <main className="pb-6">
      {goals.length === 0 ? (
        <CraftedGoalsEmptyState />
      ) : (
        <CraftedGoals {...craftedProps} />
      )}

      <section id="nuovo-obiettivo" className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        {goals.length > 0 ? <Rule className="mb-6" /> : null}
        <Label className="mb-4 block">Nuovo obiettivo</Label>
        <CraftedGoalForm defaultPerson={defaultPerson} />
      </section>
    </main>
  );
}
