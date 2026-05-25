import Link from "next/link";
import { Plus } from "lucide-react";

import { getGoalsWithProgress } from "@/src/actions/goals";
import { GoalCard } from "@/src/components/goals/goal-card";
import { GoalForm } from "@/src/components/goals/goal-form";
import { PageHeader } from "@/src/components/layout/page-header";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Goal = Awaited<ReturnType<typeof getGoalsWithProgress>>[number];

const goalIdeas = [
  { emoji: "🇵🇹", name: "Vacanza", target: "900€" },
  { emoji: "🛟", name: "Emergenza", target: "2.000€" },
  { emoji: "🚲", name: "Bici", target: "600€" },
  { emoji: "📷", name: "Corso", target: "300€" },
] as const;

function EmptyGoalRing() {
  const size = 120;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-muted)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--accent)" strokeWidth={stroke} fill="none"
          strokeDasharray={C} strokeDashoffset={C} strokeLinecap="round" />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-geist-mono)", fontSize: 26, fontWeight: 600, fontVariantNumeric: "tabular-nums",
        color: "var(--text-3)",
      }}>
        0
      </div>
    </div>
  );
}

function GoalsEmptyState() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-5 px-4 py-8 text-center">
        <EmptyGoalRing />
        <div className="space-y-2">
          <p className="font-serif italic text-[22px] leading-[1.35] text-foreground">
            Un obiettivo dà direzione a quello che tieni.
          </p>
          <p className="mx-auto max-w-[280px] text-[13px] leading-[1.55] text-muted-foreground">
            Una vacanza, un fondo emergenza, un acquisto importante. Ogni movimento ci si avvicina un po&apos;.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Idee per iniziare
        </p>
        <div className="grid grid-cols-2 gap-2">
          {goalIdeas.map((g) => (
            <div key={g.name} className="overflow-hidden rounded-[14px] border border-border bg-surface p-3.5">
              <div style={{ fontSize: 26 }}>{g.emoji}</div>
              <p className="mt-1.5 text-[14px] font-semibold">{g.name}</p>
              <p className="font-num text-[12px] text-muted-foreground">{g.target}</p>
            </div>
          ))}
        </div>
        <Link
          href="#nuovo-obiettivo"
          className="mt-1 flex h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-accent text-[15px] font-bold text-accent-foreground transition-[opacity,transform] duration-150 active:scale-[0.98] active:opacity-90"
        >
          Crea il primo obiettivo
          <Plus className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default async function GoalsPage() {
  const goals = await getGoalsWithProgress();
  const activeGoals = goals
    .filter((goal) => goal.isActive)
    .sort((a, b) => b.progressPercent - a.progressPercent);
  const inactiveGoals = goals.filter((goal) => !goal.isActive);

  const heroGoal: Goal | undefined = activeGoals[0];
  const otherActiveGoals = activeGoals.slice(1);

  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Obiettivi"
        title="Le tue mete"
        serifWord="aperte."
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
        <GoalsEmptyState />
      ) : (
        <div className="space-y-3">
          {heroGoal ? <GoalCard goal={heroGoal} variant="hero" /> : null}

          {otherActiveGoals.length > 0 ? (
            <div className="space-y-2">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Le altre mete
              </p>
              <div className="space-y-2.5">
                {otherActiveGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} variant="ring" />
                ))}
              </div>
            </div>
          ) : null}

          {inactiveGoals.length > 0 ? (
            <div className="space-y-2">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                In pausa
              </p>
              <div className="space-y-2.5">
                {inactiveGoals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} variant="ring" />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}
