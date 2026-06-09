"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Label, Mono, Rule } from "@/components/crafted";
import {
  createEntryFromPreset,
  deletePreset,
  type SerializablePreset,
} from "@/src/actions/presets";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import { formatDate } from "@/src/lib/formatters";
import { useStreakCelebrationTrigger } from "@/src/hooks/use-streak-celebration-trigger";
import { triggerHaptic } from "@/src/lib/haptics";
import { cn } from "@/lib/utils";
import type { LegacyPersonValue } from "@/src/lib/ui-person";
import { getPersonOwnershipOptions, getPresetPersonLabel } from "@/src/lib/ui-person";

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    const decimal = value as { toString?: () => string };
    if (typeof decimal.toString === "function") {
      const parsed = Number(decimal.toString().replace(",", "."));
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return 0;
}

type CraftedPresetRowProps = {
  preset: SerializablePreset;
};

export function CraftedPresetRow({ preset }: CraftedPresetRowProps) {
  const router = useRouter();
  const { tryTrigger, overlay } = useStreakCelebrationTrigger({
    onComplete: () => router.refresh(),
  });
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const savings = Math.max(
    0,
    toNumber(preset.alternativeCost) - toNumber(preset.realCost),
  );

  function handleCreate(person?: LegacyPersonValue) {
    startTransition(async () => {
      const result = await createEntryFromPreset(preset.id, person);
      setMessage(result.message);
      if (result.success) {
        const showedCelebration = tryTrigger(result);
        if (!showedCelebration) {
          triggerHaptic("light");
          router.refresh();
        }
      }
    });
  }

  function handleDelete() {
    if (!window.confirm("Eliminare questo preset?")) return;

    startTransition(async () => {
      const result = await deletePreset(preset.id);
      setMessage(result.message);
      if (result.success) router.refresh();
    });
  }

  return (
    <>
      {overlay}
      <div className="py-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-[450]">{preset.title}</p>
            <p className="mt-0.5 text-xs text-ink-3">
              {preset.category.name} · {getPresetPersonLabel(preset.person)} ·{" "}
              {formatDate(preset.createdAt)}
            </p>
          </div>
          <Mono className="shrink-0 text-sm font-medium whitespace-nowrap">
            {formatCraftedCompact(savings)}
            <span className="text-[11px] text-accent">€</span>
          </Mono>
        </div>

        {preset.note ? <p className="mb-3 text-sm text-ink-3">{preset.note}</p> : null}

        <div className="flex flex-wrap gap-2">
          {preset.person ? (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleCreate()}
              className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Usa preset"}
            </button>
          ) : (
            getPersonOwnershipOptions().map((choice) => (
              <button
                key={choice.value}
                type="button"
                disabled={isPending}
                onClick={() => handleCreate(choice.value)}
                className="rounded-full border border-line px-3 py-2 text-[12px] font-medium text-muted-foreground"
              >
                {choice.label}
              </button>
            ))
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="text-[12px] text-destructive/70 hover:text-destructive"
          >
            Elimina
          </button>
        </div>

        {message ? <p className="mt-2 text-xs text-ink-3">{message}</p> : null}
      </div>
    </>
  );
}

export function CraftedPresetList({
  presets,
}: {
  presets: CraftedPresetRowProps["preset"][];
}) {
  if (presets.length === 0) {
    return (
      <p className="border-y border-line py-8 text-center text-sm text-ink-3">
        Ancora nessun preset. Salva una spesa ricorrente per riusarla in un tocco.
      </p>
    );
  }

  return (
    <div>
      {presets.map((preset, index) => (
        <div key={preset.id}>
          <CraftedPresetRow preset={preset} />
          {index < presets.length - 1 ? <Rule soft /> : null}
        </div>
      ))}
    </div>
  );
}
