"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  CraftedIcon,
  Label,
  Mono,
  ProgressLine,
  Rule,
  Serif,
  StatTrio,
} from "@/components/crafted";
import { deleteGoal, toggleGoalActive } from "@/src/actions/goals";
import {
  CraftedAmount,
  CraftedOdometer,
  Stagger,
} from "@/components/crafted/motion";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import type { CraftedGoalRow, CraftedGoalsProps } from "@/src/lib/crafted-goals-build";
import { cn } from "@/lib/utils";

function GoalActions({
  goalId,
  isActive,
  showToggle = true,
}: {
  goalId: string;
  isActive: boolean;
  showToggle?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleGoalActive(goalId);

      if (!result.success) {
        window.alert(result.message);
        return;
      }

      router.refresh();
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      "Vuoi eliminare questo obiettivo? L'operazione non si può annullare.",
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteGoal(goalId);

      if (!result.success) {
        window.alert(result.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="mt-3 flex gap-3">
      {showToggle ? (
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={isPending}
          className="text-[12px] text-ink-3 transition-colors hover:text-foreground disabled:opacity-50"
        >
          {isActive ? "Metti in pausa" : "Riattiva"}
        </button>
      ) : null}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="text-[12px] text-destructive/70 transition-colors hover:text-destructive disabled:opacity-50"
      >
        Elimina
      </button>
    </div>
  );
}

function FeaturedGoal({ goal }: { goal: CraftedGoalRow }) {
  const target = formatCraftedCompact(goal.targetAmount);

  return (
    <section className="px-5 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Label>La più vicina</Label>
        <CraftedIcon name={goal.icon} size={20} className="text-accent" />
      </div>
      <h2 className="mb-4 text-[27px] font-semibold tracking-[-0.025em]">{goal.title}</h2>
      <div className="mb-4 flex items-baseline gap-1.5">
        <CraftedOdometer
          value={goal.progressAmount}
          suffix=""
          maximumFractionDigits={0}
          minimumFractionDigits={0}
          integerClassName="text-[clamp(2.5rem,12vw,3.25rem)] font-semibold leading-[0.9] tracking-[-0.05em] text-accent"
        />
        <Mono className="text-[19px] whitespace-nowrap text-muted-foreground">
          / {target}€
        </Mono>
      </div>
      <ProgressLine thick value={goal.progressPercent} className="rounded-[2px]" />
      <div className="mt-2.5 flex items-baseline justify-between gap-4">
        <Serif className="text-sm text-ink-3">{goal.note}</Serif>
        <Mono className="text-xs text-muted-foreground">{goal.progressPercent}%</Mono>
      </div>
      <GoalActions goalId={goal.id} isActive={goal.isActive} />
    </section>
  );
}

function GoalListRow({ goal }: { goal: CraftedGoalRow }) {
  return (
    <div className="py-3">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <CraftedIcon name={goal.icon} size={18} className="shrink-0 text-muted-foreground" />
          <span className="truncate text-[15px] font-[450]">{goal.title}</span>
        </div>
        <Mono className="shrink-0 text-[12.5px] whitespace-nowrap text-muted-foreground">
          {formatCraftedCompact(goal.progressAmount)}{" "}
          <span className="text-ink-3">/ {formatCraftedCompact(goal.targetAmount)}</span>
        </Mono>
      </div>
      <ProgressLine value={goal.progressPercent} />
      {goal.note ? (
        <Serif className="mt-2 block text-[13px] text-ink-3">{goal.note}</Serif>
      ) : null}
      <GoalActions goalId={goal.id} isActive={goal.isActive} />
    </div>
  );
}

export function CraftedGoals({
  featured,
  others,
  paused,
  achieved,
  hasActiveGoals,
  trio,
}: CraftedGoalsProps) {
  return (
    <Stagger className="-mx-4 sm:-mx-6 lg:-mx-8">
      {featured ? (
        <>
          <FeaturedGoal goal={featured} />
          <Rule />
        </>
      ) : null}

      {!featured && !hasActiveGoals && (paused.length > 0 || achieved.length > 0) ? (
        <>
          <section className="px-5 py-5">
            <Label className="mb-2 block">Obiettivi attivi</Label>
            <Serif className="text-sm text-ink-3">
              Nessuna meta attiva al momento. Riattivane una per tornare a raccogliere
              risparmi ed evitati.
            </Serif>
          </section>
          <Rule />
        </>
      ) : null}

      {others.length > 0 ? (
        <>
          <section className="px-5 pt-5 pb-1.5">
            <Label>Altre mete</Label>
          </section>
          <div className="px-5 pb-1">
            {others.map((goal, index) => (
              <div
                key={goal.id}
                className={cn(index < others.length - 1 && "border-b border-line-soft")}
              >
                <GoalListRow goal={goal} />
              </div>
            ))}
          </div>
          <Rule />
        </>
      ) : null}

      {paused.length > 0 ? (
        <>
          <section className="px-5 pt-5 pb-1.5">
            <Label>In pausa</Label>
          </section>
          <div className="px-5 pb-1">
            {paused.map((goal, index) => (
              <div
                key={goal.id}
                className={cn(index < paused.length - 1 && "border-b border-line-soft")}
              >
                <GoalListRow goal={goal} />
              </div>
            ))}
          </div>
          <Rule />
        </>
      ) : null}

      <StatTrio
        items={[
          {
            label: "Da risparmi positivi",
            value: <CraftedAmount value={trio.towardGoals} />,
            suffix: "€",
          },
          {
            label: "Completati",
            value: (
              <CraftedAmount
                value={trio.completedCount}
                maximumFractionDigits={0}
              />
            ),
          },
          {
            label: "Risparmio mese",
            value: (
              <CraftedAmount
                value={trio.monthSaved > 0 ? trio.monthSaved : 0}
                prefix={trio.monthSaved > 0 ? "+" : ""}
              />
            ),
            suffix: trio.monthSaved > 0 ? "€" : undefined,
          },
        ]}
      />

      {achieved.length > 0 ? (
        <>
          <section className="px-5 pt-5 pb-1.5">
            <Label>Raggiunte</Label>
          </section>
          <div className="px-5 pb-2">
            {achieved.map((goal, index) => (
              <div key={goal.id}>
                <div className="flex items-center gap-3 py-3">
                  <CraftedIcon name="check" size={18} strokeWidth={2} className="text-green" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-[450] text-muted-foreground">
                      {goal.title}
                    </span>
                    <GoalActions goalId={goal.id} isActive={false} showToggle={false} />
                  </div>
                  <Mono className="shrink-0 text-[13px] whitespace-nowrap text-ink-3">
                    {formatCraftedCompact(goal.amount)}€
                  </Mono>
                </div>
                {index < achieved.length - 1 ? <Rule soft /> : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Stagger>
  );
}
