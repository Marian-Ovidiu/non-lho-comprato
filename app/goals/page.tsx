import { getGoalsWithProgress } from "@/src/actions/goals";
import { GoalCard } from "@/src/components/goals/goal-card";
import { GoalForm } from "@/src/components/goals/goal-form";
import { PageHeader } from "@/src/components/layout/page-header";

export const dynamic = "force-dynamic";

type Goal = Awaited<ReturnType<typeof getGoalsWithProgress>>[number];

function GoalsSection({
  title,
  description,
  goals,
}: {
  title: string;
  description: string;
  goals: Goal[];
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>

      {goals.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-5 text-sm text-zinc-500">
          Nessun obiettivo in questa sezione.
        </p>
      )}
    </section>
  );
}

export default async function GoalsPage() {
  const goals = await getGoalsWithProgress();
  const activeGoals = goals.filter((goal) => goal.isActive);
  const inactiveGoals = goals.filter((goal) => !goal.isActive);

  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Obiettivi"
        title="Obiettivi"
        description="Dai un motivo ai soldi che state evitando di buttare."
      />

      <GoalForm />

      {goals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-6 text-sm leading-6 text-zinc-600">
          Ancora nessun obiettivo. Scegli qualcosa per cui vale la pena
          schivare spese inutili.
        </p>
      ) : (
        <>
          <GoalsSection
            title="Obiettivi attivi"
            description="Quelli che state portando avanti adesso."
            goals={activeGoals}
          />

          <GoalsSection
            title="Obiettivi in pausa"
            description="Quelli messi da parte, senza perderli."
            goals={inactiveGoals}
          />
        </>
      )}
    </main>
  );
}
