import Link from "next/link";
import { Plus } from "lucide-react";

import { getGoalsWithProgress } from "@/src/actions/goals";
import { GoalCard } from "@/src/components/goals/goal-card";
import { GoalForm } from "@/src/components/goals/goal-form";
import { PageHeader } from "@/src/components/layout/page-header";
import { Button } from "@/components/ui/button";

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
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-text">{description}</p>
      </div>

      {goals.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border bg-surface-muted px-4 py-5 text-sm text-muted-text">
          Nessun obiettivo qui.
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
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Obiettivi"
        context={`${activeGoals.length} attivi • ${inactiveGoals.length} in pausa`}
        action={
          <Button asChild className="h-10 rounded-2xl px-4">
            <Link href="#nuovo-obiettivo">
              <Plus className="size-4" aria-hidden="true" />
              Nuovo obiettivo
            </Link>
          </Button>
        }
        chips={[
          { label: `${activeGoals.length} attivi`, tone: "success" },
          { label: `${inactiveGoals.length} in pausa`, tone: "default" },
        ]}
      />

      <section id="nuovo-obiettivo">
        <GoalForm />
      </section>

      {goals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface-muted px-4 py-6 text-sm leading-6 text-muted-text">
          Ancora nessun obiettivo. Aggiungi quello che vuoi proteggere.
        </p>
      ) : (
        <>
          <GoalsSection
            title="Obiettivi attivi"
            description="Quelli che state seguendo adesso."
            goals={activeGoals}
          />

          <GoalsSection
            title="Obiettivi in pausa"
            description="Quelli messi da parte, senza perderli di vista."
            goals={inactiveGoals}
          />
        </>
      )}
    </main>
  );
}
