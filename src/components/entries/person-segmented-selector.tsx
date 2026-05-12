"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LEGACY_PERSON,
  getPersonOwnershipOptions,
  normalizeLegacyPerson,
  type LegacyPersonValue,
} from "@/src/lib/ui-person";

type PersonSegmentedSelectorProps = {
  name?: string;
  value?: LegacyPersonValue | null;
  defaultValue?: LegacyPersonValue;
};

function getSelectedValue(
  value?: LegacyPersonValue | null,
  defaultValue?: LegacyPersonValue,
) {
  return normalizeLegacyPerson(value) ?? defaultValue ?? DEFAULT_LEGACY_PERSON;
}

export function PersonSegmentedSelector({
  name = "person",
  value,
  defaultValue,
}: PersonSegmentedSelectorProps) {
  const selectedValue = getSelectedValue(value, defaultValue);

  return (
    <div className="grid grid-cols-3 gap-2">
      {getPersonOwnershipOptions().map((choice) => {
        const id = `${name}-${choice.value.toLowerCase()}`;

        return (
          <div key={choice.value} className="min-w-0">
            <input
              id={id}
              name={name}
              type="radio"
              value={choice.value}
              defaultChecked={choice.value === selectedValue}
              className="peer sr-only"
            />
            <Label
              htmlFor={id}
              className={cn(
                "flex min-h-11 w-full cursor-pointer items-center justify-center rounded-2xl border border-border bg-surface px-2.5 py-2 text-center text-sm font-medium text-muted-text shadow-sm transition-all duration-150 ease-out",
                "hover:bg-surface-muted hover:text-foreground",
                "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
                "peer-checked:border-foreground/15 peer-checked:bg-foreground peer-checked:text-background",
              )}
            >
              <span className="truncate">{choice.label}</span>
            </Label>
          </div>
        );
      })}
    </div>
  );
}
