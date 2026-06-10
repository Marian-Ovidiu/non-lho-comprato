"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Mono, Rule } from "@/components/crafted";
import {
  createEntryFromPreset,
  deletePreset,
  type SerializablePreset,
} from "@/src/actions/presets";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import { formatDate } from "@/src/lib/formatters";
import { useStreakCelebrationTrigger } from "@/src/hooks/use-streak-celebration-trigger";
import { triggerHaptic } from "@/src/lib/haptics";
import { getPresetPersonLabel } from "@/src/lib/ui-person";

function toNumber(value: string): number {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPresetMoneySummary(preset: SerializablePreset) {
  const amountSpent = toNumber(preset.amountSpent);
  const comparisonAmount = toNumber(preset.comparisonAmount);
  const savingImpact = toNumber(preset.savingImpact);

  if (preset.mode === "avoided") {
    return {
      primaryAmount: `${formatCraftedCompact(comparisonAmount)}€`,
      detail: "Spesa evitata",
      note: `${formatCraftedCompact(comparisonAmount)}€ non spesi`,
    };
  }

  if (preset.savingContext === "comparison") {
    return {
      primaryAmount: `${formatCraftedCompact(amountSpent)}€`,
      detail: `${formatCraftedCompact(comparisonAmount)}€ di confronto`,
      note:
        savingImpact >= 0
          ? `${formatCraftedCompact(savingImpact)}€ sotto il confronto`
          : `${formatCraftedCompact(Math.abs(savingImpact))}€ sopra il confronto`,
    };
  }

  return {
    primaryAmount: `${formatCraftedCompact(amountSpent)}€`,
    detail: "Spesa normale",
    note: "Senza confronto",
  };
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
  const summary = getPresetMoneySummary(preset);

  function handleCreate() {
    startTransition(async () => {
      const result = await createEntryFromPreset(preset.id);
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
              {preset.category.name} · {getPresetPersonLabel(preset.person)} · {formatDate(preset.createdAt)}
            </p>
            <p className="mt-1 text-xs text-ink-3">{summary.detail} · {summary.note}</p>
          </div>
          <Mono className="shrink-0 text-sm font-medium whitespace-nowrap">
            {summary.primaryAmount}
          </Mono>
        </div>

        {preset.note ? <p className="mb-3 text-sm text-ink-3">{preset.note}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleCreate}
            className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Usa preset"}
          </button>
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
        Ancora nessun preset. Salva una spesa o un confronto per riusarlo in un tocco.
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
