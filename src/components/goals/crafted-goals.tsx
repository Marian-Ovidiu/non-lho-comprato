"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";

import {
  CraftedIcon,
  Label,
  Mono,
  ProgressLine,
  Rule,
  Serif,
} from "@/components/crafted";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { deleteGoal, toggleGoalActive } from "@/src/actions/goals";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations } from "@/src/components/language/language-context";
import {
  useBoundLocale,
  useLocaleFormatters,
} from "@/src/components/language/use-locale-formatters";
import {
  shortGoalDate,
  type CraftedGoalRow,
  type CraftedGoalsProps,
  type CraftedSavingRow,
  type GoalStatus,
} from "@/src/lib/crafted-goals-build";

type TabKey = "tutti" | GoalStatus;
type Tone = "default" | "success" | "accent" | "muted";

const TAB_KEYS: TabKey[] = ["tutti", "in-corso", "pausa", "completato"];

function formatEURBase(
  locale: string,
  value: number,
  currencySymbol: string,
  options: { sign?: boolean; decimals?: 0 | 2 } = {},
) {
  const sign = options.sign ? (value > 0 ? "+" : value < 0 ? "−" : "") : "";
  const decimals = options.decimals ?? 0;
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  return `${sign}${currencySymbol}${formatted}`;
}

function statusLabel(status: GoalStatus, t: ReturnType<typeof useTranslations>) {
  if (status === "completato") return t.goals.statusCompleted;
  if (status === "pausa") return t.goals.statusPaused;
  return t.goals.statusInProgress;
}

function statusTone(status: GoalStatus): Tone {
  if (status === "completato") return "success";
  if (status === "pausa") return "muted";
  return "accent";
}

function progressTone(status: GoalStatus) {
  if (status === "completato") return "bg-success";
  if (status === "pausa") return "bg-muted-foreground";
  return "bg-accent";
}

function MicroStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="rounded-[var(--r-card)] bg-surface-muted px-3 py-2.5">
      <Label className="mb-1.5 block">{label}</Label>
      <Mono
        className={cn(
          "block text-[17px] font-semibold leading-none",
          tone === "success" && "text-success",
          tone === "accent" && "text-accent",
          tone === "muted" && "text-ink-3",
        )}
      >
        {value}
      </Mono>
    </div>
  );
}

function StatusPill({ status }: { status: GoalStatus }) {
  const t = useTranslations();
  const tone = statusTone(status);

  return (
    <span
      className={cn(
        "shrink-0 rounded-[var(--r-chip)] border px-1.5 py-px text-[9.5px] font-semibold uppercase leading-none tracking-[0.18em]",
        tone === "success" && "border-success/40 text-success",
        tone === "accent" && "border-accent/40 text-accent",
        tone === "muted" && "border-line text-ink-3",
      )}
    >
      {statusLabel(status, t)}
    </span>
  );
}

function GoalActions({
  goal,
  disabled,
  onToggle,
  onRequestDelete,
}: {
  goal: CraftedGoalRow;
  disabled: boolean;
  onToggle: (goalId: string) => void;
  onRequestDelete: (goal: CraftedGoalRow) => void;
}) {
  const t = useTranslations();

  return (
    <div className="mt-2.5 flex items-center gap-5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(goal.id)}
        className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        {goal.status === "pausa" ? t.goals.resume : t.goals.pause}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRequestDelete(goal)}
        className="text-[12px] font-medium text-destructive/80 transition-colors hover:text-destructive disabled:opacity-50"
      >
        {t.goals.delete}
      </button>
    </div>
  );
}

type GoalActionHandlers = {
  actionsDisabled: boolean;
  onToggle: (goalId: string) => void;
  onRequestDelete: (goal: CraftedGoalRow) => void;
};

function FeaturedCard({
  goal,
  currencySymbol,
  actionsDisabled,
  onToggle,
  onRequestDelete,
}: {
  goal: CraftedGoalRow;
  currencySymbol: string;
} & GoalActionHandlers) {
  const t = useTranslations();
  const formatEUR = useBoundLocale(formatEURBase);
  const calloutTone = goal.status === "completato" ? "success" : "accent";

  return (
    <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
      <div className="relative overflow-hidden rounded-[var(--r-card)] border border-line bg-surface p-5">
        <div
          className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/[0.07] blur-3xl"
          aria-hidden="true"
        />
        <div className="relative">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-accent">
                <CraftedIcon name={goal.icon} size={19} />
              </span>
              <div className="min-w-0">
                <Label className="mb-1 block">{t.goals.featuredLabel}</Label>
                <h2 className="truncate text-[21px] font-semibold leading-tight">
                  {goal.title}
                </h2>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-[var(--r-chip)] border px-2.5 py-1.5 text-[11px]",
                calloutTone === "success"
                  ? "border-success/35 text-success"
                  : "border-accent/35 text-accent",
              )}
            >
              <Sparkles className="size-3.5" aria-hidden="true" />
              <Mono>{goal.pct}%</Mono>
            </span>
          </div>

          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <Mono className="block text-[34px] font-semibold leading-none tracking-[-0.02em]">
                {formatEUR(goal.saved, currencySymbol)}
              </Mono>
              <Serif className="mt-2 block text-[13px] text-ink-3">
                {t.goals.ofTarget(formatEUR(goal.target, currencySymbol))}
              </Serif>
            </div>
            <Mono className="shrink-0 text-right text-xs text-muted-foreground">
              {formatEUR(goal.remaining, currencySymbol)}
              <span className="block text-ink-3">{t.goals.remainingShort}</span>
            </Mono>
          </div>

          <ProgressLine
            thick
            value={goal.pct}
            className="bg-line-soft"
            indicatorClassName={progressTone(goal.status)}
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <Serif className="text-[13px] text-ink-3">{goal.note}</Serif>
            <Mono className="text-xs text-muted-foreground">
              {t.goals.paceLine(formatEUR(goal.monthlyPace, currencySymbol))}
            </Mono>
          </div>
          <GoalActions
            goal={goal}
            disabled={actionsDisabled}
            onToggle={onToggle}
            onRequestDelete={onRequestDelete}
          />
        </div>
      </div>
    </section>
  );
}

function GoalRow({
  goal,
  actionsDisabled,
  onToggle,
  onRequestDelete,
}: {
  goal: CraftedGoalRow;
} & GoalActionHandlers) {
  const { formatCraftedCompact } = useLocaleFormatters();

  return (
    <div data-goal-row className="block min-h-11 w-full py-4 text-left">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground">
          <CraftedIcon name={goal.icon} size={19} />
        </span>
        <div className="min-w-0">
          <div className="mb-1 flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-[15px] font-medium">{goal.title}</p>
            <StatusPill status={goal.status} />
          </div>
          <p className="truncate text-[11px] text-ink-3">
            {goal.contributors.join(", ")}
          </p>
        </div>
        <div className="text-right">
          <Mono className="block text-[14px] font-semibold">
            {formatCraftedCompact(goal.saved)}
            <span className="text-ink-3">/{formatCraftedCompact(goal.target)}</span>
          </Mono>
        </div>
      </div>
      <div className="mt-3 pl-[56px]">
        <ProgressLine
          value={goal.pct}
          className="bg-line-soft"
          indicatorClassName={progressTone(goal.status)}
        />
        <Serif className="mt-2 block truncate text-[13px] text-ink-3">
          {goal.note}
        </Serif>
        <GoalActions
          goal={goal}
          disabled={actionsDisabled}
          onToggle={onToggle}
          onRequestDelete={onRequestDelete}
        />
      </div>
    </div>
  );
}

function SavingRow({
  saving,
  currencySymbol,
}: {
  saving: CraftedSavingRow;
  currencySymbol: string;
}) {
  const formatEUR = useBoundLocale(formatEURBase);

  return (
    <div className="flex min-h-14 items-center gap-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-success/10 text-success">
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium">{saving.from}</p>
        <p className="mt-0.5 truncate text-[11px] text-ink-3">
          {shortGoalDate(saving.date)}
        </p>
      </div>
      <Mono className="shrink-0 text-[14px] font-semibold text-success">
        {formatEUR(saving.amount, currencySymbol, { sign: true })}
      </Mono>
    </div>
  );
}

export function CraftedGoals({
  goals,
  featured,
  savings,
  hero,
  counts,
}: CraftedGoalsProps) {
  const router = useRouter();
  const t = useTranslations();
  const formatEUR = useBoundLocale(formatEURBase);
  const currencySymbol = useCurrencySymbol();
  const tabLabels: Record<TabKey, string> = {
    tutti: t.goals.tabAll,
    "in-corso": t.goals.tabInProgress,
    pausa: t.goals.tabPaused,
    completato: t.goals.tabCompleted,
  };
  const tabs = TAB_KEYS.map((key) => ({ key, label: tabLabels[key] }));
  const [tab, setTab] = useState<TabKey>("tutti");
  const [deleteTarget, setDeleteTarget] = useState<CraftedGoalRow | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [isMutating, startMutation] = useTransition();
  const visibleGoals = useMemo(
    () =>
      goals.filter((goal) => {
        if (tab === "tutti") return !goal.featured;
        return goal.status === tab;
      }),
    [goals, tab],
  );

  function handleToggle(goalId: string) {
    startMutation(async () => {
      await toggleGoalActive(goalId);
      router.refresh();
    });
  }

  function handleRequestDelete(goal: CraftedGoalRow) {
    setDeleteMessage(null);
    setDeleteTarget(goal);
  }

  function handleDelete() {
    const target = deleteTarget;

    if (!target) {
      return;
    }

    startMutation(async () => {
      const result = await deleteGoal(target.id);

      if (!result.success) {
        setDeleteMessage(result.message);
        return;
      }

      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-[var(--sp-page-x)] pb-6 pt-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label className="mb-2 block">{t.nav.goals}</Label>
            <h1 className="text-[30px] font-semibold leading-none tracking-[-0.02em]">
              {t.goals.heroTitle}{" "}
              <Serif className="font-normal text-ink-2">{t.goals.heroTitleAccent}</Serif>
            </h1>
          </div>
          <Link
            href="#nuovo-obiettivo"
            className="nlc-press inline-flex h-9 shrink-0 items-center rounded-[var(--r-chip)] bg-accent px-3 text-[13px] font-bold text-accent-foreground"
          >
            {t.goals.newShort}
          </Link>
        </div>

        <Mono className="block text-[clamp(3rem,16vw,4.75rem)] font-semibold leading-[0.84] tracking-[-0.04em]">
          {formatEUR(hero.totalSaved, currencySymbol)}
        </Mono>
        <div className="mt-4">
          <ProgressLine
            thick
            value={hero.totalPct}
            className="bg-line-soft"
            indicatorClassName="bg-accent"
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <MicroStat label={t.goals.activePaceLabel} value={`${formatEUR(hero.activePace, currencySymbol)}/m`} tone="accent" />
          <MicroStat label={t.goals.toCoverLabel} value={formatEUR(hero.remaining, currencySymbol)} />
          <MicroStat label={t.goals.completedCountLabel} value={hero.completedCount} tone="success" />
        </div>
      </section>
      <Rule soft />

      {tab === "tutti" && featured ? (
        <>
          <FeaturedCard
            goal={featured}
            currencySymbol={currencySymbol}
            actionsDisabled={isMutating}
            onToggle={handleToggle}
            onRequestDelete={handleRequestDelete}
          />
          <Rule soft />
        </>
      ) : null}

      <section className="sticky top-14 z-30 border-b border-line-soft bg-background/95 px-[var(--sp-page-x)] py-3 backdrop-blur-md">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {tabs.map((item) => {
            const active = item.key === tab;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "nlc-press inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--r-chip)] border px-3 text-[13px] font-medium",
                  active
                    ? "border-accent/40 bg-accent/10 text-foreground"
                    : "border-line text-muted-foreground",
                )}
              >
                {item.label}
                <Mono className="text-[11px] text-ink-3">{counts[item.key]}</Mono>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-[var(--sp-page-x)] pb-2">
        {visibleGoals.length > 0 ? (
          visibleGoals.map((goal, index) => (
            <div
              key={goal.id}
              className={cn(index < visibleGoals.length - 1 && "border-b border-line-soft")}
            >
              <GoalRow
                goal={goal}
                actionsDisabled={isMutating}
                onToggle={handleToggle}
                onRequestDelete={handleRequestDelete}
              />
            </div>
          ))
        ) : (
          <div className="py-8 text-center">
            <Serif className="text-sm text-ink-3">
              {t.goals.emptyTab}
            </Serif>
          </div>
        )}
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <Label className="mb-1.5 block">{t.goals.recentSavingsLabel}</Label>
            <h2 className="text-[16px] font-semibold leading-tight">{t.goals.avoidedPurchasesTitle}</h2>
          </div>
          <Link
            href="/entries?kind=evitata"
            className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t.goals.viewAll}
          </Link>
        </div>
        {savings.length > 0 ? (
          savings.map((saving, index) => (
            <div key={saving.id}>
              <SavingRow saving={saving} currencySymbol={currencySymbol} />
              {index < savings.length - 1 ? <Rule soft /> : null}
            </div>
          ))
        ) : (
          <Serif className="block text-sm text-ink-3">
            {t.goals.savingsEmpty}
          </Serif>
        )}
      </section>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <DialogContent className="border-line sm:max-w-md">
          <DialogTitle>{t.goals.delete}</DialogTitle>
          <DialogDescription>{t.goals.deleteConfirm}</DialogDescription>

          {deleteMessage ? (
            <p className="text-sm text-destructive">{deleteMessage}</p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isMutating}
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2.5 text-sm text-ink-3 transition-colors hover:text-foreground disabled:opacity-50"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              disabled={isMutating}
              onClick={handleDelete}
              className="rounded-[var(--r-cta)] border border-destructive/40 px-5 py-2.5 text-sm font-semibold text-destructive transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {t.goals.delete}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
