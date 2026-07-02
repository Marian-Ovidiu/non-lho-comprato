"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ChevronRight, Loader2, Pause, Plus, Trash2 } from "lucide-react";

import {
  CraftedIcon,
  Label,
  Mono,
  ProgressLine,
  Rule,
  Serif,
} from "@/components/crafted";
import { cn } from "@/lib/utils";
import type {
  CraftedHabitGroupSummary,
  CraftedHabitView,
  CraftedHabitsProps,
  CraftedUpcomingHabit,
  HabitCadence,
  HabitGroup,
  HabitStatus,
} from "@/src/lib/crafted-habits-build";
import { deleteHabit, updateHabit, type HabitDeleteMode } from "@/src/actions/habits";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { HabitScopeReminderFields } from "@/src/components/habits/habit-scope-reminder-fields";
import { FormFieldError } from "@/src/components/shared/form-field-error";
import { triggerHaptic } from "@/src/lib/haptics";
import { useTranslations } from "@/src/components/language/language-context";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type CategoryOption = {
  id: string;
  name: string;
  slug?: string;
  color?: string | null;
  icon?: string | null;
};

type CraftedHabitsComponentProps = CraftedHabitsProps & {
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
  currentUserId: string;
  workspaceKind: "private" | "shared";
};

const GROUP_COLORS: Record<HabitGroup, string> = {
  abbonamenti: "bg-accent",
  utenze: "bg-foreground/60",
  quotidiane: "bg-success/70",
};

function formatMoney(
  value: number,
  currencySymbol: string,
  options: { decimals?: "auto" | 0 | 2 } = {},
) {
  const decimals =
    options.decimals === "auto"
      ? value < 10
        ? 2
        : 0
      : options.decimals ?? 2;

  return `${currencySymbol}${new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)}`;
}

function cadenceShort(cadence: HabitCadence) {
  if (cadence === "mensile") return "/mese";
  if (cadence === "annuale") return "/anno";
  if (cadence === "settimanale") return "/sett";
  return "/giorno";
}

function formatShortDate(dateKey?: string) {
  if (!dateKey) {
    return "non previsto";
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(`${dateKey}T00:00:00.000Z`))
    .replace(".", "");
}

const WEEKDAY_VALUES = [1, 2, 3, 4, 5, 6, 7] as const;

function getMonthlyDay(activeDays: unknown): number | null {
  if (!activeDays || typeof activeDays !== "object" || Array.isArray(activeDays)) {
    return null;
  }

  const schedule = activeDays as { cadence?: unknown; day?: unknown };
  const day = Number(schedule.day);

  if (schedule.cadence !== "monthly" || !Number.isInteger(day)) {
    return null;
  }

  return Math.min(Math.max(day, 1), 31);
}

function getInitialActiveDays(activeDays: unknown): number[] {
  if (!Array.isArray(activeDays)) {
    return [];
  }

  return activeDays
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7)
    .sort((left, right) => left - right);
}

function StatusPill({ status }: { status: HabitStatus }) {
  if (status === "attiva") {
    return null;
  }

  const paused = status === "pausa";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[var(--r-chip)] border px-2 py-1 text-[9.5px] font-semibold uppercase leading-none tracking-[0.12em]",
        paused
          ? "border-line text-ink-3"
          : "border-accent/40 text-accent",
      )}
    >
      {paused ? <Pause className="size-2.5" aria-hidden="true" /> : null}
      {paused ? "In pausa" : "Da rivedere"}
    </span>
  );
}

function LegendDot({ group }: { group: HabitGroup }) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", GROUP_COLORS[group])}
      aria-hidden="true"
    />
  );
}

function UpcomingCard({
  habit,
  currencySymbol,
}: {
  habit: CraftedUpcomingHabit;
  currencySymbol: string;
}) {
  return (
    <article className="w-[180px] shrink-0 rounded-[var(--r-card)] bg-surface-muted p-3.5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-[var(--r-control)] bg-background text-muted-foreground">
          <CraftedIcon name={habit.icon} size={17} />
        </span>
        <Label className="pt-1 text-right">{habit.relativeLabel}</Label>
      </div>
      <h3 className="truncate text-[15px] font-medium">{habit.name}</h3>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="text-[12px] text-ink-3">{habit.shortDate}</span>
        <div className="text-right">
          <Mono className="text-[15px] font-semibold">
            {formatMoney(habit.amount, currencySymbol, { decimals: "auto" })}
          </Mono>
          <Label className="ml-1">{cadenceShort(habit.cadence)}</Label>
        </div>
      </div>
    </article>
  );
}

function GroupTab({
  group,
  active,
  onClick,
}: {
  group: CraftedHabitGroupSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "nlc-press w-[168px] shrink-0 rounded-[var(--r-card)] border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        active
          ? "border-accent/40 bg-accent/[0.08]"
          : "border-line bg-transparent",
      )}
    >
      <span className="block text-[14px] font-semibold">{group.label}</span>
      <Serif className="mt-1 block text-[12px] text-ink-3">{group.hint}</Serif>
    </button>
  );
}

function HabitRow({
  habit,
  currencySymbol,
  categories,
  members,
  currentUserId,
  workspaceKind,
}: {
  habit: CraftedHabitView;
  currencySymbol: string;
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
  currentUserId: string;
  workspaceKind: "private" | "shared";
}) {
  const router = useRouter();
  const t = useTranslations();
  const paused = habit.status === "pausa";
  const review = habit.status === "da-rivedere";
  const monthlyDay = getMonthlyDay(habit.activeDays);
  const initialDays = getInitialActiveDays(habit.activeDays);
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(habit.categoryId);
  const [recurrenceType, setRecurrenceType] = useState<"weekly" | "monthly">(
    monthlyDay === null ? "weekly" : "monthly",
  );
  const [selectedDays, setSelectedDays] = useState<number[]>(
    initialDays.length > 0 ? initialDays : [1, 2, 3, 4, 5],
  );
  const [activeDayOfMonth, setActiveDayOfMonth] = useState(String(monthlyDay ?? 1));
  const [scopeFieldsKey, setScopeFieldsKey] = useState(0);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [isEditing, startEditTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const selectedLabels = useMemo(
    () =>
      WEEKDAY_VALUES
        .filter((value) => selectedDays.includes(value))
        .map((value) => t.habitCard.weekdays[value - 1]),
    [selectedDays, t.habitCard.weekdays],
  );

  function resetDialogState() {
    const nextMonthlyDay = getMonthlyDay(habit.activeDays);
    const nextInitialDays = getInitialActiveDays(habit.activeDays);

    setCategoryId(habit.categoryId);
    setRecurrenceType(nextMonthlyDay === null ? "weekly" : "monthly");
    setSelectedDays(nextInitialDays.length > 0 ? nextInitialDays : [1, 2, 3, 4, 5]);
    setActiveDayOfMonth(String(nextMonthlyDay ?? 1));
    setScopeFieldsKey((current) => current + 1);
    setMessage("");
    setErrors({});
    setSuccess(false);
  }

  function toggleDay(day: number) {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((left, right) => left - right),
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      resetDialogState();
    }
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startEditTransition(async () => {
      setMessage("");
      setErrors({});
      setSuccess(false);

      const result = await updateHabit(habit.id, formData);

      if (!result.success) {
        setMessage(result.message);
        setErrors(result.errors ?? {});
        return;
      }

      triggerHaptic("light");
      setSuccess(true);
      setMessage(result.message);
      router.refresh();
      window.setTimeout(() => setOpen(false), 220);
    });
  }

  function handleDelete(mode: HabitDeleteMode) {
    startDeleteTransition(async () => {
      const result = await deleteHabit(habit.id, mode);

      if (!result.success) {
        setMessage(result.message);
        setDeleteOpen(false);
        return;
      }

      triggerHaptic("success");
      setDeleteOpen(false);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className={cn(
          "nlc-press block w-full py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          paused && "opacity-70",
        )}
      >
        <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3">
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground",
              review && "bg-accent/12 text-accent",
            )}
          >
            <CraftedIcon name={habit.icon} size={18} />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="min-w-0 truncate text-[15px] font-medium">{habit.name}</p>
              <StatusPill status={habit.status} />
            </div>
            <p className="mt-1 truncate text-[11px] text-ink-3">
              {habit.frequencyLabel} · prossimo {formatShortDate(habit.nextDate)} · {habit.who ?? "solo io"}
            </p>
            {habit.usageNote ? (
              <Serif className="mt-0.5 block truncate text-[13px] leading-4 text-muted-foreground">
                &quot;{habit.usageNote}&quot;
              </Serif>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-right">
            <div>
              <Mono className="block text-[15px] font-semibold">
                {formatMoney(habit.amount, currencySymbol, { decimals: "auto" })}
              </Mono>
              <Label>{cadenceShort(habit.cadence)}</Label>
            </div>
            <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 pl-[52px]">
          <ProgressLine
            value={habit.sharePercent}
            className="flex-1 bg-line-soft"
            indicatorClassName={review ? "bg-accent" : "bg-muted-foreground"}
          />
        </div>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-line sm:max-w-lg">
          <DialogTitle>{t.habitCard.editTitle}</DialogTitle>
          <DialogDescription>{t.habitCard.editDesc}</DialogDescription>

          <form className="space-y-4" onSubmit={handleEditSubmit}>
            {message ? (
              <div
                className={cn(
                  "border px-4 py-3 text-sm",
                  success
                    ? "border-green/30 text-green"
                    : "border-destructive/30 text-destructive",
                )}
                role={success ? "status" : "alert"}
                aria-live={success ? "polite" : "assertive"}
              >
                <span className="flex items-start gap-2">
                  {success ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
                  <span>{message}</span>
                </span>
              </div>
            ) : null}

            <div className="border-y border-line py-3">
              <label htmlFor={`habit-name-${habit.id}`} className="flex items-center justify-between gap-4">
                <input
                  id={`habit-name-${habit.id}`}
                  name="name"
                  defaultValue={habit.name}
                  disabled={isEditing || isDeleting}
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                />
                <Label>{t.habitCard.nameLabel}</Label>
              </label>
              <FormFieldError message={errors.name} />
            </div>

            <div className="border-y border-line py-3">
              <label htmlFor={`habit-category-${habit.id}`} className="flex items-center justify-between gap-4">
                <select
                  id={`habit-category-${habit.id}`}
                  name="categoryId"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  disabled={isEditing || isDeleting}
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <Label>{t.habitCard.categoryLabel}</Label>
              </label>
              <FormFieldError message={errors.categoryId} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border-y border-line py-3">
                <label htmlFor={`habit-amount-${habit.id}`} className="flex items-center justify-between gap-4">
                  <input
                    id={`habit-amount-${habit.id}`}
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    defaultValue={String(habit.amount)}
                    disabled={isEditing || isDeleting}
                    className="min-w-0 flex-1 bg-transparent font-num text-[15px] outline-none"
                  />
                  <Label>{t.habitCard.amountLabel(currencySymbol)}</Label>
                </label>
                <FormFieldError message={errors.amount} />
              </div>

              <div className="border-y border-line py-3">
                <label htmlFor={`habit-status-${habit.id}`} className="flex items-center justify-between gap-4">
                  <select
                    id={`habit-status-${habit.id}`}
                    name="isActive"
                    defaultValue={habit.isActive ? "1" : "0"}
                    disabled={isEditing || isDeleting}
                    className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                  >
                    <option value="1">{t.habitCard.statusActive}</option>
                    <option value="0">{t.habitCard.statusPaused}</option>
                  </select>
                  <Label>{t.habitCard.statusLabel}</Label>
                </label>
              </div>
            </div>

            <HabitScopeReminderFields
              key={scopeFieldsKey}
              members={members}
              workspaceKind={workspaceKind}
              currentUserId={currentUserId}
              initialTargetScope={habit.targetScope === "shared" ? "shared" : "self"}
              initialTargetUserId={habit.targetUserId}
              initialReminderEnabled={habit.reminderEnabled}
              initialReminderTime={habit.reminderTime}
              errors={errors}
              disabled={isEditing || isDeleting}
              idPrefix={`habit-${habit.id}`}
              compact
            />

            <div>
              <Label className="mb-3 block">Ricorrenza</Label>
              <input type="hidden" name="recurrenceType" value={recurrenceType} />
              <div className="mb-3 grid grid-cols-2 gap-2">
                {(["weekly", "monthly"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={isEditing || isDeleting}
                    onClick={() => setRecurrenceType(type)}
                    className={cn(
                      "h-10 rounded-[var(--r-control)] border text-sm font-medium disabled:opacity-60",
                      recurrenceType === type
                        ? "border-accent/50 bg-accent/10 text-foreground"
                        : "border-line text-ink-3",
                    )}
                  >
                    {type === "weekly" ? "Settimanale" : "Mensile"}
                  </button>
                ))}
              </div>

              {recurrenceType === "weekly" ? (
                <>
                  <div className="flex flex-wrap gap-3">
                    {WEEKDAY_VALUES.map((value) => {
                      const checked = selectedDays.includes(value);
                      const label = t.habitCard.weekdays[value - 1];

                      return (
                        <label
                          key={value}
                          className={cn(
                            "cursor-pointer border-b-[1.5px] pb-1.5 text-[13px]",
                            checked
                              ? "border-accent font-semibold text-foreground"
                              : "border-transparent font-[450] text-ink-3",
                          )}
                        >
                          <input
                            type="checkbox"
                            name="activeDays"
                            value={value}
                            checked={checked}
                            onChange={() => toggleDay(value)}
                            className="sr-only"
                            disabled={isEditing || isDeleting}
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                  {selectedLabels.length > 0 ? (
                    <p className="mt-2 text-xs text-ink-3">{selectedLabels.join(", ")}</p>
                  ) : null}
                </>
              ) : (
                <label className="flex items-center justify-between gap-4 border-y border-line py-3">
                  <select
                    name="activeDayOfMonth"
                    value={activeDayOfMonth}
                    onChange={(event) => setActiveDayOfMonth(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent font-num text-[15px] outline-none"
                    disabled={isEditing || isDeleting}
                  >
                    {Array.from({ length: 31 }, (_, index) => String(index + 1)).map((day) => (
                      <option key={day} value={day}>
                        Giorno {day}
                      </option>
                    ))}
                  </select>
                  <Label>Del mese</Label>
                </label>
              )}
              <FormFieldError message={errors.activeDays} />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                disabled={isEditing || isDeleting}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--r-control)] border border-destructive/35 px-3 text-sm font-medium text-destructive disabled:opacity-50"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {t.habitCard.delete}
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isEditing || isDeleting}
                  className="px-3 py-2 text-sm text-ink-3 underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isEditing || isDeleting}
                  className="inline-flex h-10 items-center gap-2 rounded-[var(--r-control)] bg-accent px-4 text-sm font-bold text-accent-foreground disabled:opacity-50"
                >
                  {isEditing ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {isEditing ? t.habitCard.savingChanges : t.habitCard.saveChanges}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-line sm:max-w-md">
          <DialogTitle>{t.habitCard.deleteTitle}</DialogTitle>
          <DialogDescription>{t.habitCard.deleteDesc}</DialogDescription>

          <div className="space-y-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => handleDelete("habit_only")}
              className="w-full rounded-[var(--r-control)] border border-line px-4 py-3 text-left transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <span className="block text-sm font-medium">{t.habitCard.deleteOnly}</span>
              <span className="mt-1 block text-xs text-ink-3">{t.habitCard.deleteOnlyDesc}</span>
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => handleDelete("habit_and_entries")}
              className="w-full rounded-[var(--r-control)] border border-destructive/30 px-4 py-3 text-left text-destructive transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <span className="block text-sm font-medium">{t.habitCard.deleteWithEntries}</span>
              <span className="mt-1 block text-xs opacity-80">{t.habitCard.deleteWithEntriesDesc}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CraftedHabits({
  habits,
  upcoming,
  groups,
  reviewHabits,
  perMonth,
  perYear,
  activeCount,
  pausedCount,
  potentialYearlySavings,
  currencySymbol,
  categories,
  members,
  currentUserId,
  workspaceKind,
}: CraftedHabitsComponentProps) {
  const [activeGroup, setActiveGroup] = useState<HabitGroup>(
    () =>
      groups.find((group) => habits.some((habit) => habit.group === group.group))?.group ??
      "abbonamenti",
  );
  const visibleHabits = useMemo(
    () => habits.filter((habit) => habit.group === activeGroup),
    [activeGroup, habits],
  );

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-[var(--sp-page-x)] pb-5 pt-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label className="mb-2 block">Abitudini</Label>
            <h1 className="text-[28px] font-semibold leading-none tracking-[-0.02em]">
              Costano{" "}
              <Serif className="font-normal text-muted-foreground">
                ogni mese
              </Serif>
            </h1>
          </div>
          <Link
            href="#nuova-abitudine"
            className="nlc-press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--r-chip)] bg-accent px-3 text-[13px] font-bold text-accent-foreground"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Nuova
          </Link>
        </div>

        <Mono className="block text-[clamp(3rem,16vw,4.75rem)] font-semibold leading-[0.84] tracking-[-0.04em]">
          {formatMoney(perMonth, currencySymbol)}
        </Mono>
        <Mono className="mt-3 block text-[12px] text-ink-3">
          {formatMoney(perYear, currencySymbol, { decimals: 0 })}/anno · {activeCount} attive · {pausedCount} in pausa
        </Mono>

        <div className="mt-6 flex h-0.5 w-full overflow-hidden rounded-full bg-transparent">
          {groups
            .filter((group) => group.total > 0)
            .map((group) => (
              <span
                key={group.group}
                className={GROUP_COLORS[group.group]}
                style={{ width: `${group.share}%` }}
                aria-hidden="true"
              />
            ))}
        </div>
        <div className="mt-3 grid gap-2">
          {groups.map((group) => (
            <div key={group.group} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
                <LegendDot group={group.group} />
                <span className="truncate">{group.label}</span>
              </span>
              <Mono className="shrink-0 text-[12px] text-muted-foreground">
                {formatMoney(group.total, currencySymbol)}
              </Mono>
            </div>
          ))}
        </div>
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <Label className="mb-3 block">Prossimi 7 giorni</Label>
        {upcoming.length > 0 ? (
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {upcoming.map((habit) => (
              <UpcomingCard
                key={`${habit.id}-${habit.nextDate}`}
                habit={habit}
                currencySymbol={currencySymbol}
              />
            ))}
          </div>
        ) : (
          <Serif className="block text-sm text-ink-3">
            Nessun addebito previsto nei prossimi sette giorni.
          </Serif>
        )}
      </section>
      <Rule soft />

      {reviewHabits.length > 0 ? (
        <>
          <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
            <div className="rounded-[var(--r-card)] border border-accent/25 bg-accent/[0.06] p-4">
              <div className="mb-3 flex items-center gap-2 text-accent">
                <AlertTriangle className="size-4" aria-hidden="true" />
                <h2 className="text-[16px] font-semibold">
                  {reviewHabits.length} abbonamenti poco usati
                </h2>
              </div>
              <Serif className="block text-sm text-muted-foreground">
                Potresti risparmiare fino a{" "}
                <Mono className="text-accent">
                  {formatMoney(potentialYearlySavings, currencySymbol, { decimals: 0 })}
                </Mono>{" "}
                in un anno
              </Serif>
              <div className="mt-4">
                {reviewHabits.map((habit, index) => (
                  <div key={habit.id}>
                    <div className="flex items-center justify-between gap-3 py-2">
                      <span className="truncate text-[14px] font-medium">{habit.name}</span>
                      <Mono className="shrink-0 text-[13px] text-accent">
                        {formatMoney(habit.monthlyAmount, currencySymbol)}
                      </Mono>
                    </div>
                    {index < reviewHabits.length - 1 ? <Rule soft /> : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
          <Rule soft />
        </>
      ) : null}

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          {groups.map((group) => (
            <GroupTab
              key={group.group}
              group={group}
              active={group.group === activeGroup}
              onClick={() => setActiveGroup(group.group)}
            />
          ))}
        </div>
      </section>

      <section className="px-[var(--sp-page-x)] pb-2">
        {visibleHabits.length > 0 ? (
          visibleHabits.map((habit, index) => (
            <div key={habit.id}>
              <HabitRow
                habit={habit}
                currencySymbol={currencySymbol}
                categories={categories}
                members={members}
                currentUserId={currentUserId}
                workspaceKind={workspaceKind}
              />
              {index < visibleHabits.length - 1 ? <Rule soft /> : null}
            </div>
          ))
        ) : (
          <div className="py-8 text-center">
            <Serif className="text-sm text-ink-3">
              Nessuna abitudine in questo gruppo.
            </Serif>
          </div>
        )}
      </section>
    </div>
  );
}
