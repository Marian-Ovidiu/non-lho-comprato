"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Label as CraftedLabel } from "@/components/crafted";
import { createHabit } from "@/src/actions/habits";
import { HabitScopeReminderFields } from "@/src/components/habits/habit-scope-reminder-fields";
import { FormFieldError } from "@/src/components/shared/form-field-error";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/src/lib/haptics";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations } from "@/src/components/language/language-context";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type CategoryOption = {
  id: string;
  name: string;
  slug?: string;
};

type CraftedHabitFormProps = {
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
  currentUserId: string;
  workspaceKind: "private" | "shared";
};

export function CraftedHabitForm({
  categories,
  members,
  currentUserId,
  workspaceKind,
}: CraftedHabitFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const weekdayOptions = useMemo(
    () =>
      [
        { value: 1, label: t.habitCard.weekdays[0] },
        { value: 2, label: t.habitCard.weekdays[1] },
        { value: 3, label: t.habitCard.weekdays[2] },
        { value: 4, label: t.habitCard.weekdays[3] },
        { value: 5, label: t.habitCard.weekdays[4] },
        { value: 6, label: t.habitCard.weekdays[5] },
        { value: 7, label: t.habitCard.weekdays[6] },
      ] as const,
    [t.habitCard.weekdays],
  );
  const formRef = useRef<HTMLFormElement>(null);
  const defaultCategoryId =
    categories.find((category) => category.slug === "altro")?.id ??
    categories[0]?.id ??
    "";
  const defaultSelectedDays = [1, 2, 3, 4, 5];
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [recurrenceType, setRecurrenceType] = useState<"weekly" | "monthly">("weekly");
  const [selectedDays, setSelectedDays] = useState<number[]>(defaultSelectedDays);
  const [activeDayOfMonth, setActiveDayOfMonth] = useState("1");
  const defaultTargetUserId =
    members.find((member) => member.userId === currentUserId)?.userId ??
    members[0]?.userId ??
    currentUserId;
  const [scopeFieldsKey, setScopeFieldsKey] = useState(0);
  const [successStage, setSuccessStage] = useState<"idle" | "confirming" | "closing">("idle");

  const [state, formAction, pending] = useActionState(
    async (_previousState: { success: boolean; message: string; errors?: Record<string, string> }, formData: FormData) => {
      const result = await createHabit(formData);
      if (result.success) {
        triggerHaptic("light");
        formRef.current?.reset();
        setCategoryId(defaultCategoryId);
        setRecurrenceType("weekly");
        setSelectedDays(defaultSelectedDays);
        setActiveDayOfMonth("1");
        setScopeFieldsKey((current) => current + 1);
        setSuccessStage("confirming");
        window.setTimeout(() => setSuccessStage("closing"), 120);
        window.setTimeout(() => router.refresh(), 240);
      }
      return result;
    },
    { success: false, message: "", errors: {} },
  );

  const selectedLabels = useMemo(
    () =>
      weekdayOptions
        .filter((day) => selectedDays.includes(day.value))
        .map((day) => day.label),
    [selectedDays, weekdayOptions],
  );

  function toggleDay(day: number) {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className={cn(
        "space-y-4 transition-[opacity,transform,filter] duration-200",
        successStage === "closing" && "translate-y-1 opacity-0 blur-[1px]",
      )}
    >
      {state.message ? (
        <div
          className={cn(
            "border px-4 py-3 text-sm",
            state.success ? "border-green/30 text-green" : "border-destructive/30 text-destructive",
          )}
          role={state.success ? "status" : "alert"}
          aria-live={state.success ? "polite" : "assertive"}
        >
          <span className="flex items-start gap-2">
            {state.success ? <Check className="mt-0.5 size-4 shrink-0" /> : null}
            <span>{state.message}</span>
          </span>
        </div>
      ) : null}

      <div className="border-y border-line py-3">
        <label htmlFor="habit-name" className="flex items-center justify-between gap-4">
          <input
            id="habit-name"
            name="name"
            placeholder={t.habitForm.namePlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3/70"
            aria-describedby={state.errors?.name ? "habit-name-error" : undefined}
          />
          <CraftedLabel>{t.habitForm.nameLabel}</CraftedLabel>
        </label>
        <FormFieldError id="habit-name-error" message={state.errors?.name} />
      </div>

      <div className="border-y border-line py-3">
        <label htmlFor="habit-categoryId" className="flex items-center justify-between gap-4">
          <select
            id="habit-categoryId"
            name="categoryId"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <CraftedLabel>{t.habitForm.categoryLabel}</CraftedLabel>
        </label>
        <FormFieldError id="habit-categoryId-error" message={state.errors?.categoryId} />
      </div>

      <div className="border-y border-line py-3">
        <label htmlFor="habit-amount" className="flex items-center justify-between gap-4">
          <input
            id="habit-amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder={t.habitForm.amountPlaceholder}
            className="min-w-0 flex-1 bg-transparent font-num text-[15px] outline-none"
            aria-describedby={state.errors?.amount ? "habit-amount-error" : undefined}
          />
          <CraftedLabel>{t.habitForm.amountLabel(currencySymbol)}</CraftedLabel>
        </label>
        <FormFieldError id="habit-amount-error" message={state.errors?.amount} />
        <input type="hidden" name="defaultBehavior" value="spent" />
      </div>

      <HabitScopeReminderFields
        key={scopeFieldsKey}
        members={members}
        workspaceKind={workspaceKind}
        currentUserId={currentUserId}
        initialTargetScope="self"
        initialTargetUserId={defaultTargetUserId}
        initialReminderEnabled={false}
        initialReminderTime="09:30"
        errors={state.errors}
        disabled={pending}
        idPrefix="habit-create"
        compact
      />

      <div>
        <CraftedLabel className="mb-3 block">Ricorrenza</CraftedLabel>
        <input type="hidden" name="recurrenceType" value={recurrenceType} />
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["weekly", "monthly"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setRecurrenceType(type)}
              className={cn(
                "h-10 rounded-[var(--r-control)] border text-sm font-medium",
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
              {weekdayOptions.map((day) => {
                const checked = selectedDays.includes(day.value);
                return (
                  <label
                    key={day.value}
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
                      value={day.value}
                      checked={checked}
                      onChange={() => toggleDay(day.value)}
                      className="sr-only"
                    />
                    {day.label}
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
            >
              {Array.from({ length: 31 }, (_, index) => String(index + 1)).map((day) => (
                <option key={day} value={day}>
                  Giorno {day}
                </option>
              ))}
            </select>
            <CraftedLabel>Del mese</CraftedLabel>
          </label>
        )}
        <FormFieldError message={state.errors?.activeDays} />
      </div>

      <button
        type="submit"
        disabled={pending || categories.length === 0}
        className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15.5px] font-bold text-accent-foreground disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t.habitForm.savingButton}
          </>
        ) : (
          t.habitForm.saveButton
        )}
      </button>
    </form>
  );
}
