"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/src/components/language/language-context";
import { FormFieldError } from "@/src/components/shared/form-field-error";
import {
  getDefaultBeneficiaryUserIds,
  getDefaultPaidByUserId,
  sortWorkspaceMembers,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";

type EntryPeopleFieldsProps = {
  members: WorkspaceMemberOption[];
  /**
   * `default` e `inset` sono le due forme del form completo e non cambiano.
   * `quick` è l'aggiunta rapida: stesse scelte, ma su righe che accostano
   * l'etichetta al controllo invece di impilarle — in un pannello che si apre
   * dal basso una parola sola su una riga è spazio speso per niente.
   */
  variant?: "default" | "inset" | "quick";
  paidByUserId?: string | null;
  beneficiaryUserIds?: string[];
  errors?: Record<string, string>;
  onPaidByUserIdChange?: (userId: string) => void;
  onBeneficiaryUserIdsChange?: (userIds: string[]) => void;
};

function getMemberGridClass(count: number) {
  if (count <= 2) {
    return "grid-cols-2";
  }

  if (count === 3) {
    return "grid-cols-3";
  }

  return "grid-cols-2 sm:grid-cols-3";
}

export function EntryPeopleFields({
  members,
  variant = "default",
  paidByUserId,
  beneficiaryUserIds,
  errors,
  onPaidByUserIdChange,
  onBeneficiaryUserIdsChange,
}: EntryPeopleFieldsProps) {
  const t = useTranslations();
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
  const gridClass = getMemberGridClass(sortedMembers.length);

  useEffect(() => {
    onPaidByUserIdChange?.(selectedPaidBy);
  }, [onPaidByUserIdChange, selectedPaidBy]);

  useEffect(() => {
    onBeneficiaryUserIdsChange?.(selectedBeneficiaryUserIds);
  }, [onBeneficiaryUserIdsChange, selectedBeneficiaryUserIds]);

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
        {t.entryForm.noMembers}
      </p>
    );
  }

  function renderBeneficiaryChip(
    member: WorkspaceMemberOption,
    labelClassName: string,
    mark?: React.ReactNode,
  ) {
    const id = `beneficiary-${member.userId}`;

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
        <Label htmlFor={id} className={labelClassName}>
          {mark}
          <span className="truncate">{member.label}</span>
        </Label>
      </div>
    );
  }

  if (variant === "quick") {
    // Le due domande stanno su due righe, ognuna con la sua parola a sinistra e
    // la sua sostanza a destra. Sopra i due membri il gruppo va a capo da solo:
    // tre nomi su una riga da 360px non sono più leggibili di tre nomi sotto
    // l'etichetta.
    const inlineLegend = sortedMembers.length <= 2;

    return (
      <div className="grid divide-y divide-line">
        <input type="hidden" name="beneficiariesMode" value="explicit" />

        <div className="px-3.5 py-2.5">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            <Label
              htmlFor="paidByUserId"
              className="font-num text-[10.5px] font-normal uppercase tracking-[0.14em] text-muted-foreground"
            >
              {t.entryForm.paidByLabel}
            </Label>
            <Select
              name="paidByUserId"
              value={selectedPaidBy}
              onValueChange={(value) => onPaidByUserIdChange?.(value)}
              required
            >
              <SelectTrigger
                id="paidByUserId"
                className="h-9 w-full min-w-0 justify-end gap-1.5 border-0 bg-transparent px-0 text-[14px] font-medium text-foreground shadow-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-invalid={Boolean(errors?.paidByUserId)}
              >
                <SelectValue placeholder={t.entryForm.paidByPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {sortedMembers.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FormFieldError message={errors?.paidByUserId} className="mt-1 text-xs" />
        </div>

        <div className="px-3.5 py-2.5">
          <div
            className={cn(
              inlineLegend
                ? "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3"
                : "space-y-2",
            )}
          >
            <span
              id="quick-applies-to"
              className="font-num text-[10.5px] font-normal uppercase tracking-[0.14em] text-muted-foreground"
            >
              {t.entryForm.appliesToLabel}
            </span>
            {/* Non un segmentato: qui si può prendere più di un nome, e nel
                vocabolario di quest'app la scelta multipla si dice con il
                segno di spunta, non con la cella piena. Il posto vuoto della
                spunta è sempre riservato, così togliere una persona non fa
                saltare la riga. */}
            <div
              role="group"
              aria-labelledby="quick-applies-to"
              className={cn("grid gap-1.5", gridClass)}
            >
              {sortedMembers.map((member) =>
                renderBeneficiaryChip(
                  member,
                  cn(
                    "flex min-h-9 w-full cursor-pointer items-center justify-center gap-1 rounded-full border border-line px-2.5 py-1.5",
                    "text-center text-[13px] font-medium text-muted-text transition-colors",
                    "hover:bg-surface hover:text-foreground",
                    "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
                    "peer-checked:border-foreground/25 peer-checked:bg-foreground/10 peer-checked:text-foreground",
                  ),
                  <Check
                    className="size-3.5 shrink-0 opacity-0 transition-opacity peer-checked:opacity-100"
                    aria-hidden="true"
                  />,
                ),
              )}
            </div>
          </div>
          <FormFieldError
            message={errors?.beneficiaryUserIds}
            className="mt-1 text-xs"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid",
        variant === "inset" ? "divide-y divide-line" : "gap-4",
      )}
    >
      <input type="hidden" name="beneficiariesMode" value="explicit" />

      <div className={cn(variant === "inset" ? "px-4 py-3" : "space-y-2")}>
        <div
          className={cn(
            variant === "inset" &&
              "grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-4",
          )}
        >
          <Label
            htmlFor="paidByUserId"
            className={cn(
              variant === "inset" &&
                "font-num text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground",
            )}
          >
            {t.entryForm.paidByLabel}
          </Label>
          <Select
            name="paidByUserId"
            value={selectedPaidBy}
            onValueChange={(value) => onPaidByUserIdChange?.(value)}
            required
          >
            <SelectTrigger
              id="paidByUserId"
              className={cn(
                "w-full",
                variant === "inset" &&
                  "h-11 border-0 bg-background px-3 shadow-none focus-visible:ring-2 focus-visible:ring-ring/50",
              )}
              aria-invalid={Boolean(errors?.paidByUserId)}
            >
              <SelectValue placeholder={t.entryForm.paidByPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {sortedMembers.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FormFieldError message={errors?.paidByUserId} className="text-sm" />
      </div>

      <fieldset
        className={cn("space-y-3", variant === "inset" && "px-4 py-3")}
      >
        <legend
          className={cn(
            "text-sm font-medium text-foreground",
            variant === "inset" &&
              "font-num text-[10px] font-normal uppercase tracking-[0.18em] text-muted-foreground",
          )}
        >
          {t.entryForm.appliesToLabel}
        </legend>
        <div
          className={cn(
            "grid gap-2",
            gridClass,
            variant === "inset" &&
              "rounded-[var(--r-control)] bg-background p-1",
          )}
        >
          {sortedMembers.map((member) =>
            renderBeneficiaryChip(
              member,
              cn(
                "flex min-h-11 w-full cursor-pointer items-center justify-center rounded-2xl border border-border bg-surface px-3 py-2 text-center text-sm font-medium text-muted-text shadow-sm transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]",
                "hover:-translate-y-px hover:bg-surface-muted hover:text-foreground active:translate-y-px active:opacity-95",
                "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
                "peer-checked:border-foreground/15 peer-checked:bg-foreground peer-checked:text-background peer-checked:shadow-[0_8px_18px_-14px_rgba(0,0,0,0.6)]",
                variant === "inset" && [
                  "rounded-[calc(var(--r-control)-4px)] border-0 bg-transparent shadow-none",
                  "hover:translate-y-0 hover:bg-surface-muted active:translate-y-0",
                  "peer-checked:bg-foreground peer-checked:text-background peer-checked:shadow-none",
                ],
              ),
            ),
          )}
        </div>
        <FormFieldError message={errors?.beneficiaryUserIds} className="text-sm" />
      </fieldset>
    </div>
  );
}
