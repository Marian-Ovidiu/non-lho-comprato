"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteGoal, toggleGoalActive } from "@/src/actions/goals";
import { formatDate, formatMoney } from "@/src/lib/formatters";
import { AnimatedNumber } from "@/src/components/shared/animated-number";
import { getGoalEmoji } from "@/src/lib/visual-cues";
import {
  getGoalScopeLabel,
  type LegacyPersonValue,
} from "@/src/lib/ui-person";

type GoalCardProps = {
  goal: {
    id: string;
    title: string;
    targetAmount: number;
    emoji: string | null;
    person: LegacyPersonValue | null;
    isActive: boolean;
    createdAt: string;
    progressAmount: number;
    progressPercent: number;
    remainingAmount: number;
    isCompleted: boolean;
  };
  variant?: "hero" | "ring" | "full";
};

function getProgressWidth(progressPercent: number) {
  if (!Number.isFinite(progressPercent)) {
    return 0;
  }

  return Math.min(Math.max(progressPercent, 0), 100);
}

function GoalRing({
  pct,
  size = 56,
  color = "var(--accent)",
}: {
  pct: number;
  size?: number;
  color?: string;
}) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(pct, 0), 1);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--surface-muted)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - clamped)}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-geist-mono)",
          fontSize: Math.round(size * 0.22),
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: "var(--foreground)",
        }}
      >
        {Math.round(clamped * 100)}
      </div>
    </div>
  );
}

export function GoalCard({ goal, variant = "full" }: GoalCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const progressWidth = getProgressWidth(goal.progressPercent);
  const emoji = getGoalEmoji(goal.emoji);

  function handleToggleActive() {
    startTransition(async () => {
      const result = await toggleGoalActive(goal.id);

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
      const result = await deleteGoal(goal.id);

      if (!result.success) {
        window.alert(result.message);
        return;
      }

      router.refresh();
    });
  }

  const actionButtons = (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleToggleActive}
        disabled={isPending}
        className="text-[12px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        {goal.isActive ? "Metti in pausa" : "Riattiva"}
      </button>
      <span className="text-[12px] text-muted-foreground">·</span>
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

  if (variant === "hero") {
    return (
      <div
        className="overflow-hidden rounded-[14px] border border-border p-6"
        style={{
          background:
            "radial-gradient(120% 100% at 100% 0%, rgba(212,255,58,0.16) 0%, transparent 60%), var(--surface)",
        }}
      >
        <div className="mb-3.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Più vicino
          </span>
          <span style={{ fontSize: 36 }}>{emoji}</span>
        </div>

        <p
          className="mb-[18px] font-bold tracking-[-0.025em]"
          style={{ fontSize: 28, lineHeight: 1.15 }}
        >
          {goal.title}
        </p>

        <div className="mb-3.5 flex items-baseline gap-1.5">
          <AnimatedNumber
            value={goal.progressAmount}
            format={formatMoney}
            className="font-num font-semibold text-accent leading-none"
            style={{ fontSize: 38 }}
          />
          <span className="font-num text-lg text-muted-foreground">
            / {formatMoney(goal.targetAmount)}
          </span>
        </div>

        <div
          className="overflow-hidden bg-surface-muted"
          style={{ height: 10, borderRadius: 5 }}
        >
          <div
            style={{
              width: `${progressWidth}%`,
              height: "100%",
              background: "var(--accent)",
              borderRadius: 5,
            }}
          />
        </div>

        <div className="mt-2.5 flex justify-between text-[12px] text-muted-foreground">
          <span>
            <span className="font-num">{goal.progressPercent}%</span> raggiunto
          </span>
          <span>
            <span className="font-num">{formatMoney(goal.remainingAmount)}</span> mancano
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          {actionButtons}
          {goal.isCompleted ? (
            <span className="rounded-full bg-accent/20 px-2.5 py-1 text-[11px] font-semibold text-accent">
              Completato
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  if (variant === "ring") {
    const pct = goal.progressPercent / 100;
    const ringColor = goal.isCompleted ? "var(--accent)" : "var(--accent)";

    return (
      <div className="flex items-center gap-3.5 overflow-hidden rounded-[14px] border border-border bg-surface p-4">
        <GoalRing pct={pct} size={56} color={ringColor} />

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-[15px] font-semibold">{goal.title}</span>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
          </div>
          <div className="font-num text-[12px] text-muted-foreground">
            {formatMoney(goal.progressAmount)}{" "}
            <span style={{ color: "var(--text-3)" }}>/ {formatMoney(goal.targetAmount)}</span>
            {" · "}
            {goal.isActive ? "Attivo" : "In pausa"}
          </div>
          <div className="mt-2">{actionButtons}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        goal.isCompleted
          ? "overflow-hidden rounded-[14px] border border-accent/20 bg-accent/10 p-5"
          : "overflow-hidden rounded-[14px] border border-border bg-surface p-5"
      }
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[17px] font-semibold">
            {emoji} {goal.title}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {getGoalScopeLabel(goal.person)} · {goal.isActive ? "Attivo" : "In pausa"}
            {goal.isCompleted ? " · Completato" : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] text-muted-foreground">Obiettivo</p>
          <p className="font-num text-[18px] font-semibold">{formatMoney(goal.targetAmount)}</p>
        </div>
      </div>

      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-num font-medium text-accent">{goal.progressPercent}%</span>
        </div>
        <div className="h-[10px] overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      <div className="grid gap-2 text-[12px] sm:grid-cols-3">
        <div className="rounded-xl bg-surface-muted px-3 py-2">
          <p className="text-muted-foreground">Risparmiati</p>
          <p className="font-num font-medium">{formatMoney(goal.progressAmount)}</p>
        </div>
        <div className="rounded-xl bg-surface-muted px-3 py-2">
          <p className="text-muted-foreground">Mancano</p>
          <p className="font-num font-medium">{formatMoney(goal.remainingAmount)}</p>
        </div>
        <div className="rounded-xl bg-surface-muted px-3 py-2">
          <p className="text-muted-foreground">Creato il</p>
          <p className="font-num font-medium">{formatDate(goal.createdAt)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        {actionButtons}
      </div>
    </div>
  );
}
