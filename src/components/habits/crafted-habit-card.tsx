"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  CraftedIcon,
  Label as CraftedLabel,
  Mono,
  ProgressLine,
} from "@/components/crafted";
import {
  deleteHabit,
  updateHabit,
  type HabitDeleteMode,
} from "@/src/actions/habits";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { triggerHaptic } from "@/src/lib/haptics";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations } from "@/src/components/language/language-context";
import { HabitScopeReminderFields } from "@/src/components/habits/habit-scope-reminder-fields";
import { FormFieldError } from "@/src/components/shared/form-field-error";
import {
  getHabitTargetDisplayLabel,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};

type CraftedHabitCardProps = {
  habit: {
    id: string;
    name: string;
    categoryId: string;
    amount: number;
    activeDays: unknown;
    isActive: boolean;
    defaultBehavior: string;
    targetScope: string;
    targetUserId: string | null;
    reminderEnabled: boolean;
    reminderTime: string | null;
    category: {
      id: string;
      name: string;
      slug: string;
      color: string | null;
      icon: string | null;
    };
    _count: {
      occurrences: number;
    };
  };
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
  currentUserId: string;
  workspaceKind: "private" | "shared";
};

const weekdayValues = [1, 2, 3, 4, 5, 6, 7] as const;

function getActiveDayLabels(activeDays: unknown, labels: readonly [string, string, string, string, string, string, string]): string[] {
  if (!Array.isArray(activeDays)) return [];
  const nums = activeDays.map((value) => Number(value));
  return weekdayValues
    .filter((v) => nums.includes(v))
    .map((v) => labels[v - 1]);
}

function getInitialActiveDays(activeDays: unknown): number[] {
  if (!Array.isArray(activeDays)) return [];
  return activeDays
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7)
    .sort((left, right) => left - right);
}

export function CraftedHabitCard({
  habit,
  categories,
  members,
  currentUserId,
  workspaceKind,
}: CraftedHabitCardProps) {
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const t = useTranslations();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const [categoryId, setCategoryId] = useState(habit.categoryId);
  const [selectedDays, setSelectedDays] = useState<number[]>(() =>
    getInitialActiveDays(habit.activeDays),
  );
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editMessage, setEditMessage] = useState("");
  const [editSuccessStage, setEditSuccessStage] = useState<"idle" | "confirming" | "closing">(
    "idle",
  );
  const [scopeFieldsKey, setScopeFieldsKey] = useState(0);
  const [isEditing, startEditTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const refreshTimerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);

  const activeDayLabels = getActiveDayLabels(habit.activeDays, t.habitCard.weekdays);
  const selectedLabels = useMemo(
    () =>
      weekdayValues
        .filter((v) => selectedDays.includes(v))
        .map((v) => t.habitCard.weekdays[v - 1]),
    [selectedDays, t.habitCard.weekdays],
  );

  const icon = getCategoryCraftedIcon(habit.category);
  const freqLabel =
    activeDayLabels.length > 0 ? activeDayLabels.join(", ") : t.habitCard.weekdays.join(", ");
  const targetLabel = getHabitTargetDisplayLabel({
    targetScope: habit.targetScope,
    targetUserId: habit.targetUserId,
    currentUserId,
    members,
  });
  const reminderLabel = habit.reminderEnabled
    ? `${t.habitCard.reminderOn} ${habit.reminderTime ?? "09:30"}`
    : t.habitCard.reminderOff;

  function toggleDay(day: number) {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((left, right) => left - right),
    );
  }

  function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startEditTransition(async () => {
      setEditMessage("");
      setEditErrors({});

      const result = await updateHabit(habit.id, formData);

      if (!result.success) {
        setEditSuccessStage("idle");
        setEditMessage(result.message);
        setEditErrors(result.errors ?? {});
        return;
      }

      triggerHaptic("light");
      setEditMessage(result.message);
      setEditSuccessStage("confirming");
      setMenuOpen(false);

      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);

      successTimerRef.current = window.setTimeout(() => {
        setEditSuccessStage("closing");
      }, 120);

      refreshTimerRef.current = window.setTimeout(() => {
        setEditOpen(false);
        router.refresh();
      }, 240);
    });
  }

  function handleDelete(mode: HabitDeleteMode) {
    startDeleteTransition(async () => {
      const result = await deleteHabit(habit.id, mode);

      if (!result.success) {
        window.alert(result.message);
        return;
      }

      triggerHaptic("success");
      setDeleteOpen(false);
      setMenuOpen(false);
      setIsRemoved(true);
      router.refresh();
    });
  }

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) window.clearTimeout(refreshTimerRef.current);
      if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    };
  }, []);

  if (isRemoved) return null;

  return (
    <>
      <div
        className={cn("relative py-3.5", isDeleting && "pointer-events-none opacity-60")}
        aria-busy={isDeleting}
      >
        {isDeleting ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/55">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              {t.habitCard.deleting}
            </span>
          </div>
        ) : null}

        <div className="flex items-center gap-3.5">
          <CraftedIcon name={icon} size={18} className="shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-[450]">{habit.name}</p>
            <Mono className="mt-0.5 block text-[11px] text-ink-3">
              {freqLabel} · {habit.isActive ? t.habitCard.statusActive : t.habitCard.statusPaused}
            </Mono>
            <Mono className="mt-0.5 block truncate text-[11px] text-ink-3">
              {targetLabel} · {reminderLabel}
            </Mono>
          </div>
          <Mono className="shrink-0 text-[15px] font-medium whitespace-nowrap">
            {formatCraftedCompact(habit.amount)}
            <span className="text-[11px] text-accent">{currencySymbol}</span>
          </Mono>
          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              aria-label={t.habitCard.actions}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((value) => !value)}
              disabled={isDeleting}
              className="flex size-8 items-center justify-center text-ink-3 transition-opacity hover:opacity-80"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div
                role="menu"
                aria-label={t.habitCard.actions}
                className="absolute right-0 top-9 z-20 w-40 border border-line bg-background p-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex h-9 w-full items-center gap-2 px-3 text-sm transition-opacity hover:opacity-80"
                  onClick={() => {
                    setCategoryId(habit.categoryId);
                    setSelectedDays(getInitialActiveDays(habit.activeDays));
                    setEditErrors({});
                    setEditMessage("");
                    setScopeFieldsKey((current) => current + 1);
                    setEditOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  {t.habitCard.edit}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex h-9 w-full items-center gap-2 px-3 text-sm text-destructive transition-opacity hover:opacity-80"
                  onClick={() => {
                    setDeleteOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  {t.habitCard.delete}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2.5">
          <ProgressLine value={habit.isActive ? 100 : 0} className="flex-1" />
          <Mono className="text-[10.5px] whitespace-nowrap text-ink-3">
            {habit._count.occurrences} {t.habits.occAbbr}
          </Mono>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-line sm:max-w-lg">
          <DialogTitle>{t.habitCard.editTitle}</DialogTitle>
          <DialogDescription>
            {t.habitCard.editDesc}
          </DialogDescription>

          <form
            className={cn(
              "space-y-4 transition-[opacity,transform,filter] duration-200 ease-out",
              editSuccessStage === "closing" && "translate-y-1 opacity-0 blur-[1px]",
            )}
            onSubmit={handleEditSubmit}
          >
            {editMessage ? (
              <div
                className={cn(
                  "border px-4 py-3 text-sm",
                  editSuccessStage !== "idle"
                    ? "border-green/30 text-green"
                    : "border-destructive/30 text-destructive",
                )}
                aria-live="polite"
              >
                <span className="flex items-start gap-2">
                  {editSuccessStage !== "idle" ? (
                    <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  ) : null}
                  <span>{editMessage}</span>
                </span>
              </div>
            ) : null}

            <div className="border-y border-line py-3">
              <div className="flex items-center justify-between gap-4">
                <input
                  id={`habit-name-${habit.id}`}
                  name="name"
                  defaultValue={habit.name}
                  disabled={isEditing}
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                />
                <CraftedLabel>{t.habitCard.nameLabel}</CraftedLabel>
              </div>
              <FormFieldError message={editErrors.name} />
            </div>

            <div className="border-y border-line py-3">
              <div className="flex items-center justify-between gap-4">
                <select
                  name="categoryId"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  disabled={isEditing}
                  className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <CraftedLabel>{t.habitCard.categoryLabel}</CraftedLabel>
              </div>
              <FormFieldError message={editErrors.categoryId} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border-y border-line py-3">
                <div className="flex items-center justify-between gap-4">
                  <input
                    id={`habit-amount-${habit.id}`}
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    defaultValue={String(habit.amount)}
                    disabled={isEditing}
                    className="min-w-0 flex-1 bg-transparent font-num text-[15px] outline-none"
                  />
                  <CraftedLabel>{t.habitCard.amountLabel(currencySymbol)}</CraftedLabel>
                </div>
                <FormFieldError message={editErrors.amount} />
              </div>

              <div className="border-y border-line py-3">
                <div className="flex items-center justify-between gap-4">
                  <select
                    name="isActive"
                    defaultValue={habit.isActive ? "1" : "0"}
                    disabled={isEditing}
                    className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
                  >
                    <option value="1">{t.habitCard.statusActive}</option>
                    <option value="0">{t.habitCard.statusPaused}</option>
                  </select>
                  <CraftedLabel>{t.habitCard.statusLabel}</CraftedLabel>
                </div>
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
              errors={editErrors}
              disabled={isEditing}
              idPrefix={`habit-${habit.id}`}
              compact
            />

            <div>
              <CraftedLabel className="mb-3 block">{t.habitCard.daysLabel}</CraftedLabel>
              <div className="flex flex-wrap gap-3">
                {weekdayValues.map((value) => {
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
                        disabled={isEditing}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
              {selectedLabels.length > 0 ? (
                <p className="mt-2 text-xs text-ink-3">{selectedLabels.join(", ")}</p>
              ) : null}
              <FormFieldError message={editErrors.activeDays} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={isEditing}
                className="px-4 py-2 text-sm text-ink-3 underline-offset-4 hover:underline disabled:opacity-50"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isEditing}
                className="rounded-2xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-50"
              >
                {isEditing ? t.habitCard.savingChanges : t.habitCard.saveChanges}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-line sm:max-w-md">
          <DialogTitle>{t.habitCard.deleteTitle}</DialogTitle>
          <DialogDescription>
            {t.habitCard.deleteDesc}
          </DialogDescription>

          <div className="space-y-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => handleDelete("habit_only")}
              className="w-full border border-line px-4 py-3 text-left transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <span className="block text-sm font-medium">{t.habitCard.deleteOnly}</span>
              <span className="mt-1 block text-xs text-ink-3">
                {t.habitCard.deleteOnlyDesc}
              </span>
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => handleDelete("habit_and_entries")}
              className="w-full border border-destructive/30 px-4 py-3 text-left text-destructive transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <span className="block text-sm font-medium">{t.habitCard.deleteWithEntries}</span>
              <span className="mt-1 block text-xs opacity-80">
                {t.habitCard.deleteWithEntriesDesc}
              </span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
