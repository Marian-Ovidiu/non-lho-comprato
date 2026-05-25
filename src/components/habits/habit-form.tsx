"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

import { createHabit } from "@/src/actions/habits";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/src/lib/haptics";
import { spacing } from "@/src/lib/spacing";
import { HabitScopeReminderFields } from "@/src/components/habits/habit-scope-reminder-fields";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};

type FormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string>;
};

type HabitFormProps = {
  categories: CategoryOption[];
  members: WorkspaceMemberOption[];
  currentUserId: string;
  workspaceKind: "private" | "shared";
};

const initialState: FormState = {
  success: false,
  message: "",
  errors: {},
};

const weekdayOptions = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Gio" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sab" },
  { value: 7, label: "Dom" },
] as const;

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

export function HabitForm({
  categories,
  members,
  currentUserId,
  workspaceKind,
}: HabitFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);
  const defaultCategoryId =
    categories.find((category) => category.slug === "altro")?.id ??
    categories[0]?.id ??
    "";
  const defaultSelectedDays = [1, 2, 3, 4, 5];
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [selectedDays, setSelectedDays] = useState<number[]>(defaultSelectedDays);
  const defaultTargetUserId =
    members.find((member) => member.userId === currentUserId)?.userId ??
    members[0]?.userId ??
    currentUserId;
  const [scopeFieldsKey, setScopeFieldsKey] = useState(0);
  const [successStage, setSuccessStage] = useState<"idle" | "confirming" | "closing">(
    "idle",
  );

  const [state, formAction, pending] = useActionState(
    async (_previousState: FormState, formData: FormData) => {
      const result = await createHabit(formData);

      if (result.success) {
        triggerHaptic("light");
        formRef.current?.reset();
        setCategoryId(defaultCategoryId);
        setSelectedDays(defaultSelectedDays);
        setScopeFieldsKey((current) => current + 1);
        setSuccessStage("confirming");

        if (refreshTimerRef.current) {
          window.clearTimeout(refreshTimerRef.current);
        }

        if (successTimerRef.current) {
          window.clearTimeout(successTimerRef.current);
        }

        successTimerRef.current = window.setTimeout(() => {
          setSuccessStage("closing");
        }, 120);

        refreshTimerRef.current = window.setTimeout(() => {
          router.refresh();
        }, 240);
      }

      return result;
    },
    initialState,
  );

  const hasCategories = categories.length > 0;

  const selectedLabels = useMemo(
    () =>
      weekdayOptions
        .filter((day) => selectedDays.includes(day.value))
        .map((day) => day.label),
    [selectedDays],
  );

  function toggleDay(day: number) {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const hasSuccessFeedback = successStage !== "idle" && state.success;

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className={spacing.cardHeader}>
        <CardTitle>Nuova abitudine</CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-5">
          Imposta una spesa che torna spesso. Se non la segni, la consideriamo
          già fatta.
        </CardDescription>
      </CardHeader>

      <form ref={formRef} action={formAction}>
        <CardContent
          className={cn(
            `space-y-4 ${spacing.cardBody} transition-[opacity,transform,filter] duration-200 ease-out`,
            successStage === "closing" && "opacity-0 translate-y-1 blur-[1px]",
          )}
        >
          {state.message ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm leading-6 transition-[opacity,transform,background-color,border-color,color] duration-200",
                state.success
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-destructive/20 bg-destructive/10 text-destructive",
                hasSuccessFeedback && "translate-y-0 opacity-100",
              )}
              aria-live="polite"
            >
              <span className="flex items-start gap-2">
                {state.success ? (
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                ) : null}
                <span>{state.message}</span>
              </span>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" name="name" placeholder="Caffè al bar" />
            <FieldError message={state.errors?.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId} name="categoryId">
              <SelectTrigger id="categoryId" className="w-full">
                <SelectValue
                  placeholder={
                    hasCategories ? "Seleziona una categoria" : "Categorie non disponibili"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-text">
              Di default partiamo da Altro, così puoi salvare più in fretta e cambiare
              etichetta dopo.
            </p>
            <FieldError message={state.errors?.categoryId} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Costo abituale</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="1.20"
              />
              <FieldError message={state.errors?.amount} />
            </div>

            <div className="space-y-2">
              <Label>Se non segno nulla</Label>
              <div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  Conta come spesa fatta
                </p>
                <p className="text-xs text-muted-text">
                  La lasci attiva e, se non la chiudi, finisce nel registro come spesa.
                </p>
              </div>
              <input type="hidden" name="defaultBehavior" value="spent" />
            </div>
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

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Giorni</Label>
              <p className="text-xs text-muted-text">
                Partiamo dai feriali: è il default più rapido da sistemare, poi puoi
                allargarlo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {weekdayOptions.map((day) => {
                const id = `day-${day.value}`;
                const checked = selectedDays.includes(day.value);

                return (
                  <label
                    key={day.value}
                    htmlFor={id}
                    className={
                      checked
                        ? "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-accent bg-accent px-3 py-3 text-sm font-medium text-background transition"
                        : "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 py-3 text-sm font-medium text-foreground transition hover:border-border hover:bg-surface-muted"
                    }
                  >
                    <input
                      id={id}
                      type="checkbox"
                      name="activeDays"
                      value={day.value}
                      checked={checked}
                      onChange={() => toggleDay(day.value)}
                      className="sr-only"
                    />
                    <span>{day.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedLabels.length > 0 ? (
                selectedLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {label}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-text">
                  Nessun giorno selezionato.
                </span>
              )}
            </div>

            <FieldError message={state.errors?.activeDays} />
          </div>
        </CardContent>

        <div className="border-t border-border bg-surface-muted p-4 sm:p-6">
          <Button
            type="submit"
            className="w-full sm:w-auto"
            disabled={pending || !hasCategories}
          >
            {pending ? "Salvataggio..." : "Salva abitudine"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
