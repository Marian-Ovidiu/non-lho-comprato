"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  deleteHabit,
  updateHabit,
  type HabitDeleteMode,
} from "@/src/actions/habits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { formatMoney } from "@/src/lib/formatters";
import { triggerHaptic } from "@/src/lib/haptics";
import { getCategoryEmoji } from "@/src/lib/visual-cues";
import { HabitScopeReminderFields } from "@/src/components/habits/habit-scope-reminder-fields";
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

type HabitCardProps = {
  habit: {
    id: string;
    name: string;
    categoryId: string;
    amount: unknown;
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
  showSeparator?: boolean;
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

function getActiveDayLabels(activeDays: unknown): string[] {
  if (!Array.isArray(activeDays)) {
    return [];
  }

  return weekdayOptions
    .filter((day) => activeDays.map((value) => Number(value)).includes(day.value))
    .map((day) => day.label);
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

export function HabitCard({
  habit,
  categories,
  members,
  currentUserId,
  workspaceKind,
}: HabitCardProps) {
  const router = useRouter();
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

  const activeDayLabels = getActiveDayLabels(habit.activeDays);
  const selectedLabels = useMemo(
    () =>
      weekdayOptions
        .filter((day) => selectedDays.includes(day.value))
        .map((day) => day.label),
    [selectedDays],
  );

  const emoji = getCategoryEmoji({ slug: habit.category.slug, name: habit.category.name });
  const freqLabel =
    activeDayLabels.length > 0 ? activeDayLabels.join(", ") : "Tutti i giorni";
  const targetLabel = getHabitTargetDisplayLabel(
    {
      targetScope: habit.targetScope,
      targetUserId: habit.targetUserId,
      currentUserId,
      members,
    },
  );
  const reminderLabel = habit.reminderEnabled
    ? `Promemoria ${habit.reminderTime ?? "09:30"}`
    : "Promemoria off";

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

      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }

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
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  if (isRemoved) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "relative overflow-hidden rounded-[14px] border border-border bg-surface p-4",
          isDeleting && "pointer-events-none opacity-60",
        )}
        aria-busy={isDeleting}
      >
        {isDeleting ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[14px] bg-background/55 backdrop-blur-[1px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Eliminazione...
            </span>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <div
            className="flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted"
            style={{ width: 44, height: 44, fontSize: 22 }}
          >
            {emoji}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold">{habit.name}</p>
            <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
              {freqLabel} · {habit.isActive ? "Attiva" : "In pausa"}
            </p>
            <p className="truncate text-[11px]" style={{ color: "var(--text-3)" }}>
              {targetLabel} · {reminderLabel}
            </p>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            <div className="text-right">
              <p className="font-num text-[18px] font-semibold text-accent">
                {formatMoney(habit.amount)}
              </p>
              <p
                className="text-[10px] uppercase tracking-[0.1em]"
                style={{ color: "var(--text-3)" }}
              >
                per volta
              </p>
            </div>

            <div ref={menuRef} className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="rounded-full border border-border/70 bg-background/70 text-muted-foreground hover:text-foreground"
                aria-label="Azioni abitudine"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((value) => !value)}
                disabled={isDeleting}
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>

              {menuOpen ? (
                <div
                  role="menu"
                  aria-label="Azioni abitudine"
                  className="absolute right-0 top-10 z-20 w-40 rounded-2xl border border-border/80 bg-surface/96 p-1.5 shadow-lg backdrop-blur"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full justify-start gap-2 rounded-xl px-3 text-sm"
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
                    Modifica
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full justify-start gap-2 rounded-xl px-3 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setDeleteOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Elimina
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <div
            className="flex-1 overflow-hidden rounded-full bg-surface-muted"
            style={{ height: 4 }}
          >
            <div
              style={{
                width: habit.isActive ? "100%" : "0%",
                height: "100%",
                background: "var(--accent)",
                borderRadius: 2,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <span className="font-num text-[11px]" style={{ color: "var(--text-3)" }}>
            {habit._count.occurrences} occorrenze
          </span>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>Modifica abitudine</DialogTitle>
          <DialogDescription>
            Aggiorna nome, categoria, importo e giorni attivi.
          </DialogDescription>

          <form
            className={cn(
              "space-y-4 transition-[opacity,transform,filter] duration-200 ease-out",
              editSuccessStage === "closing" && "opacity-0 translate-y-1 blur-[1px]",
            )}
            onSubmit={handleEditSubmit}
          >
            {editMessage ? (
              <p
                className={cn(
                  "rounded-2xl border px-4 py-3 text-sm leading-6 transition-[opacity,transform,background-color,border-color,color] duration-200",
                  editSuccessStage !== "idle"
                    ? "border-accent/20 bg-accent/10 text-accent"
                    : "border-destructive/20 bg-destructive/10 text-destructive",
                  editSuccessStage !== "idle" && "opacity-100",
                )}
                aria-live="polite"
              >
                <span className="flex items-start gap-2">
                  {editSuccessStage !== "idle" ? (
                    <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  ) : null}
                  <span>{editMessage}</span>
                </span>
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor={`habit-name-${habit.id}`}>Nome</Label>
              <Input
                id={`habit-name-${habit.id}`}
                name="name"
                defaultValue={habit.name}
                disabled={isEditing}
              />
              <FieldError message={editErrors.name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`habit-category-${habit.id}`}>Categoria</Label>
              <Select
                value={categoryId}
                onValueChange={setCategoryId}
                name="categoryId"
                disabled={isEditing}
              >
                <SelectTrigger id={`habit-category-${habit.id}`} className="w-full">
                  <SelectValue placeholder="Seleziona una categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={editErrors.categoryId} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`habit-amount-${habit.id}`}>Costo abituale</Label>
                <Input
                  id={`habit-amount-${habit.id}`}
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  defaultValue={String(habit.amount)}
                  disabled={isEditing}
                />
                <FieldError message={editErrors.amount} />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`habit-active-${habit.id}`}>Stato</Label>
                <Select
                  name="isActive"
                  defaultValue={habit.isActive ? "1" : "0"}
                  disabled={isEditing}
                >
                  <SelectTrigger id={`habit-active-${habit.id}`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Attiva</SelectItem>
                    <SelectItem value="0">In pausa</SelectItem>
                  </SelectContent>
                </Select>
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

            <div className="space-y-3">
              <Label>Giorni</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {weekdayOptions.map((day) => {
                  const id = `edit-day-${habit.id}-${day.value}`;
                  const checked = selectedDays.includes(day.value);

                  return (
                    <label
                      key={day.value}
                      htmlFor={id}
                      className={cn(
                        "flex cursor-pointer items-center justify-center rounded-2xl border px-3 py-3 text-sm font-medium transition",
                        checked
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-surface text-foreground hover:bg-surface-muted",
                      )}
                    >
                      <input
                        id={id}
                        type="checkbox"
                        name="activeDays"
                        value={day.value}
                        checked={checked}
                        onChange={() => toggleDay(day.value)}
                        className="sr-only"
                        disabled={isEditing}
                      />
                      {day.label}
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedLabels.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
              <FieldError message={editErrors.activeDays} />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isEditing}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing ? "Salvataggio..." : "Salva modifiche"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Elimina abitudine</DialogTitle>
          <DialogDescription>
            Scegli se mantenere i movimenti già generati da questa abitudine.
          </DialogDescription>

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full justify-start whitespace-normal px-4 py-3 text-left"
              disabled={isDeleting}
              onClick={() => handleDelete("habit_only")}
            >
              <span className="block font-medium">Solo abitudine</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                I movimenti restano nel registro, scollegati dall&apos;abitudine.
              </span>
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-auto w-full justify-start whitespace-normal px-4 py-3 text-left"
              disabled={isDeleting}
              onClick={() => handleDelete("habit_and_entries")}
            >
              <span className="block font-medium">Abitudine e movimenti collegati</span>
              <span className="mt-1 block text-xs text-destructive-foreground/80">
                Elimina anche i movimenti creati dalle occorrenze di questa abitudine.
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
