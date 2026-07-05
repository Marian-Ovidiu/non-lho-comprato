"use client";

import { toMoneyNumber as toNumber } from "@/src/lib/money-number";
import Link from "next/link";
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
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useLocalizedCategoryName, useTranslations } from "@/src/components/language/language-context";
import { useLocaleFormatters } from "@/src/components/language/use-locale-formatters";
import type { Translations } from "@/src/lib/i18n/types";

function getPresetMoneySummary(
  preset: SerializablePreset,
  currencySymbol: string,
  t: Translations["preset"],
  locale: string,
) {
  const amountSpent = toNumber(preset.amountSpent);
  const comparisonAmount = toNumber(preset.comparisonAmount);
  const savingImpact = toNumber(preset.savingImpact);

  if (preset.mode === "avoided") {
    return {
      primaryAmount: `${formatCraftedCompact(comparisonAmount, locale)}${currencySymbol}`,
      detail: t.avoided,
      note: t.avoidedNote(`${formatCraftedCompact(comparisonAmount, locale)}${currencySymbol}`),
    };
  }

  if (preset.savingContext === "comparison") {
    return {
      primaryAmount: `${formatCraftedCompact(amountSpent, locale)}${currencySymbol}`,
      detail: t.comparisonDetail(`${formatCraftedCompact(comparisonAmount, locale)}${currencySymbol}`),
      note:
        savingImpact >= 0
          ? t.savedBetter(`${formatCraftedCompact(savingImpact, locale)}${currencySymbol}`)
          : t.spentMoreThan(`${formatCraftedCompact(Math.abs(savingImpact), locale)}${currencySymbol}`),
    };
  }

  return {
    primaryAmount: `${formatCraftedCompact(amountSpent, locale)}${currencySymbol}`,
    detail: t.normalSpend,
    note: t.noComparison,
  };
}

type CraftedPresetRowProps = {
  preset: SerializablePreset;
};

export function CraftedPresetRow({ preset }: CraftedPresetRowProps) {
  const { locale } = useLocaleFormatters();
  const t = useTranslations();
  const router = useRouter();
  const currencySymbol = useCurrencySymbol();
  const categoryName = useLocalizedCategoryName(preset.category.slug, preset.category.name);
  const { tryTrigger, overlay } = useStreakCelebrationTrigger({
    onComplete: () => router.refresh(),
  });
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const summary = getPresetMoneySummary(preset, currencySymbol, t.preset, locale);

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
    if (!window.confirm(t.preset.deleteConfirm)) return;

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
              {categoryName} · {preset.targetUserLabel} · {formatDate(preset.createdAt, locale)}
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
            {isPending ? <Loader2 className="size-3.5 animate-spin" /> : t.preset.useButton}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="text-[12px] text-destructive hover:opacity-80"
          >
            {t.preset.deleteButton}
          </button>
          <Link
            href={`/presets?edit=${encodeURIComponent(preset.id)}`}
            className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold"
          >
            {t.preset.editButton}
          </Link>
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
  const t = useTranslations();

  if (presets.length === 0) {
    return (
      <p className="border-y border-line py-8 text-center text-sm text-ink-3">
        {t.preset.emptyState}
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
