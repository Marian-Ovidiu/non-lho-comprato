"use client";

import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { useTranslations } from "@/src/components/language/language-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FormFieldError } from "@/src/components/shared/form-field-error";
import { getHabitTargetOptionLabel, sortWorkspaceMembers } from "@/src/lib/workspace-members";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type HabitScopeReminderFieldsProps = {
  members: WorkspaceMemberOption[];
  workspaceKind: "private" | "shared";
  currentUserId: string;
  initialTargetScope?: "self" | "shared";
  initialTargetUserId?: string | null;
  initialReminderEnabled?: boolean;
  initialReminderTime?: string | null;
  errors?: Record<string, string>;
  disabled?: boolean;
  idPrefix: string;
  compact?: boolean;
};

function getSelectionValue(
  targetScope: "self" | "shared",
  targetUserId: string,
): string {
  return targetScope === "shared" ? "shared" : `self:${targetUserId}`;
}

function parseSelection(
  value: string,
): { targetScope: "self" | "shared"; targetUserId: string } {
  if (value === "shared") {
    return { targetScope: "shared", targetUserId: "" };
  }

  if (value.startsWith("self:")) {
    return {
      targetScope: "self",
      targetUserId: value.slice("self:".length),
    };
  }

  return { targetScope: "self", targetUserId: "" };
}

export function HabitScopeReminderFields({
  members,
  workspaceKind,
  currentUserId,
  initialTargetScope = "self",
  initialTargetUserId,
  initialReminderEnabled = false,
  initialReminderTime = "09:30",
  errors,
  disabled = false,
  idPrefix,
  compact = false,
}: HabitScopeReminderFieldsProps) {
  const t = useTranslations();
  const sortedMembers = useMemo(
    () => sortWorkspaceMembers(members),
    [members],
  );
  const initialUserId =
    initialTargetUserId &&
    sortedMembers.some((member) => member.userId === initialTargetUserId)
      ? initialTargetUserId
      : sortedMembers.find((member) => member.userId === currentUserId)?.userId ??
        sortedMembers[0]?.userId ??
        currentUserId;
  const [selection, setSelection] = useState(
    getSelectionValue(initialTargetScope, initialUserId),
  );
  const [reminderEnabled, setReminderEnabled] = useState(initialReminderEnabled);
  const [reminderTime, setReminderTime] = useState(
    initialReminderTime?.trim() ? initialReminderTime : "09:30",
  );

  function handleSelectionChange(value: string) {
    setSelection(value);
  }

  const parsedSelection = parseSelection(selection);
  const targetScope = parsedSelection.targetScope;
  const targetUserId = parsedSelection.targetUserId || initialUserId || "";

  return (
    <div className={cn("grid gap-4", compact ? "sm:grid-cols-2" : "")}>
      <input type="hidden" name="targetScope" value={targetScope} />
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <input
        type="hidden"
        name="reminderEnabled"
        value={reminderEnabled ? "1" : "0"}
      />

      <div className={compact ? "space-y-2 sm:col-span-2" : "space-y-2"}>
        <Label htmlFor={`${idPrefix}-target`}>{t.habitCard.forLabel}</Label>
        <Select
          value={selection}
          onValueChange={handleSelectionChange}
          disabled={disabled}
        >
          <SelectTrigger
            id={`${idPrefix}-target`}
            className="w-full"
            aria-invalid={Boolean(errors?.targetScope || errors?.targetUserId)}
          >
            <SelectValue placeholder="Seleziona" />
          </SelectTrigger>
          <SelectContent>
            {sortedMembers.map((member) => (
              <SelectItem key={member.userId} value={`self:${member.userId}`}>
                {getHabitTargetOptionLabel(member, currentUserId)}
              </SelectItem>
            ))}
            {workspaceKind === "shared" ? (
              <SelectItem value="shared">{t.habitCard.forShared}</SelectItem>
            ) : null}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-text">
          {workspaceKind === "shared"
            ? t.habitCard.forHelp
            : t.habitCard.forHelpPrivate}
        </p>
        <FormFieldError
          message={errors?.targetScope ?? errors?.targetUserId}
          className="text-sm"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`${idPrefix}-reminder`}>{t.habitCard.reminderLabel}</Label>
          <label
            htmlFor={`${idPrefix}-reminder`}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              reminderEnabled
                ? "border-accent bg-accent text-background"
                : "border-border bg-surface text-muted-foreground",
            )}
          >
            <input
              id={`${idPrefix}-reminder`}
              type="checkbox"
              checked={reminderEnabled}
              onChange={(event) => {
                const nextEnabled = event.target.checked;
                setReminderEnabled(nextEnabled);
                if (nextEnabled && !reminderTime.trim()) {
                  setReminderTime("09:30");
                }
              }}
              className="sr-only"
              disabled={disabled}
            />
            {reminderEnabled ? t.habitCard.reminderOn : t.habitCard.reminderOff}
          </label>
        </div>
        <p className="text-xs text-muted-text">
          {t.habitCard.reminderHelp}
        </p>
      </div>

      {reminderEnabled ? (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-reminder-time`}>{t.habitCard.reminderTimeLabel}</Label>
          <input
            id={`${idPrefix}-reminder-time`}
            name="reminderTime"
            type="time"
            value={reminderTime}
            onChange={(event) => setReminderTime(event.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-border focus-visible:ring-2 focus-visible:ring-border/40"
            disabled={disabled}
            aria-invalid={Boolean(errors?.reminderTime)}
          />
          <p className="text-xs text-muted-text">{t.habitCard.reminderTimeHelp}</p>
          <FormFieldError message={errors?.reminderTime} className="text-sm" />
        </div>
      ) : null}
    </div>
  );
}
