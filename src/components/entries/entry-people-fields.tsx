"use client";

import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getDefaultBeneficiaryUserIds,
  getDefaultPaidByUserId,
  getWorkspaceMemberLabel,
  sortWorkspaceMembers,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

type EntryPeopleFieldsProps = {
  members: WorkspaceMemberOption[];
  paidByUserId?: string | null;
  beneficiaryUserIds?: string[];
  errors?: Record<string, string>;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

function getMemberGridClass(count: number) {
  if (count <= 2) {
    return "grid-cols-2";
  }

  if (count === 3) {
    return "grid-cols-3";
  }

  return "grid-cols-2 sm:grid-cols-3";
}

function getExpenseHelperText(
  beneficiaryUserIds: readonly string[],
): string | null {
  if (beneficiaryUserIds.length === 1) {
    return "Spesa personale";
  }

  if (beneficiaryUserIds.length > 1) {
    return "Spesa condivisa";
  }

  return null;
}

export function EntryPeopleFields({
  members,
  paidByUserId,
  beneficiaryUserIds,
  errors,
}: EntryPeopleFieldsProps) {
  const sortedMembers = sortWorkspaceMembers(members);
  const selectedPaidBy =
    paidByUserId &&
    sortedMembers.some((member) => member.userId === paidByUserId)
      ? paidByUserId
      : getDefaultPaidByUserId(sortedMembers, paidByUserId);
  const initialBeneficiaryUserIds = (
    beneficiaryUserIds ??
    getDefaultBeneficiaryUserIds(sortedMembers, selectedPaidBy)
  ).filter((userId) =>
    sortedMembers.some((member) => member.userId === userId),
  );
  const [selectedBeneficiaryUserIds, setSelectedBeneficiaryUserIds] = useState(
    initialBeneficiaryUserIds,
  );
  const selectedBeneficiaries = useMemo(
    () => new Set(selectedBeneficiaryUserIds),
    [selectedBeneficiaryUserIds],
  );
  const expenseHelperText = getExpenseHelperText(selectedBeneficiaryUserIds);
  const gridClass = getMemberGridClass(sortedMembers.length);

  function toggleBeneficiary(userId: string, checked: boolean) {
    setSelectedBeneficiaryUserIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, userId]));
      }

      return current.filter((id) => id !== userId);
    });
  }

  if (sortedMembers.length === 0) {
    return (
      <p className="text-sm text-muted-text">
        Nessun membro disponibile in questo workspace.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <input type="hidden" name="beneficiariesMode" value="explicit" />

      <div className="space-y-2">
        <Label htmlFor="paidByUserId">Chi paga</Label>
        <Select name="paidByUserId" defaultValue={selectedPaidBy} required>
          <SelectTrigger
            id="paidByUserId"
            className="w-full"
            aria-invalid={Boolean(errors?.paidByUserId)}
          >
            <SelectValue placeholder="Seleziona chi paga" />
          </SelectTrigger>
          <SelectContent>
            {sortedMembers.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {getWorkspaceMemberLabel(member)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={errors?.paidByUserId} />
      </div>

      <fieldset className="space-y-2.5">
        <legend className="text-sm font-medium text-foreground">
          Per chi è la spesa
        </legend>
        {expenseHelperText ? (
          <p
            className="text-xs font-medium leading-5 text-foreground"
            aria-live="polite"
          >
            {expenseHelperText}
          </p>
        ) : null}
        <div className={cn("grid gap-2", gridClass)}>
          {sortedMembers.map((member) => {
            const id = `beneficiary-${member.userId}`;
            const displayLabel = getWorkspaceMemberLabel(member);

            return (
              <div key={member.userId} className="min-w-0">
                <input
                  id={id}
                  name="beneficiaryUserIds"
                  type="checkbox"
                  value={member.userId}
                  checked={selectedBeneficiaries.has(member.userId)}
                  onChange={(event) =>
                    toggleBeneficiary(member.userId, event.target.checked)
                  }
                  className="peer sr-only"
                />
                <Label
                  htmlFor={id}
                  className={cn(
                    "flex min-h-11 w-full cursor-pointer items-center justify-center rounded-2xl border border-border bg-surface px-3 py-2 text-center text-sm font-medium text-muted-text shadow-sm transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]",
                    "hover:-translate-y-px hover:bg-surface-muted hover:text-foreground active:translate-y-px active:opacity-95",
                    "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
                    "peer-checked:border-foreground/15 peer-checked:bg-foreground peer-checked:text-background peer-checked:shadow-[0_8px_18px_-14px_rgba(0,0,0,0.6)]",
                  )}
                >
                  <span className="truncate">{displayLabel}</span>
                </Label>
              </div>
            );
          })}
        </div>
        <FieldError message={errors?.beneficiaryUserIds} />
      </fieldset>
    </div>
  );
}
