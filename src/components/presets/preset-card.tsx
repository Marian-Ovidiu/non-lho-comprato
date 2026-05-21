"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Trash2, UserRound } from "lucide-react";

import { createEntryFromPreset, deletePreset } from "@/src/actions/presets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/src/lib/formatters";
import { cn } from "@/lib/utils";
import type { LegacyPersonValue } from "@/src/lib/ui-person";
import {
  getPersonOwnershipOptions,
  getPresetPersonLabel,
} from "@/src/lib/ui-person";
import { CategoryPill } from "@/src/components/shared/category-pill";
import { useStreakCelebrationTrigger } from "@/src/hooks/use-streak-celebration-trigger";
import { triggerHaptic } from "@/src/lib/haptics";

type PresetCardData = {
  id: string;
  title: string;
  category: {
    name: string;
  };
  realCost: unknown;
  alternativeCost: unknown;
  note: string | null;
  person: LegacyPersonValue | null;
  createdAt: Date;
};

type PresetCardProps = {
  preset: PresetCardData;
  compact?: boolean;
  showDelete?: boolean;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

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

function getPersonLabel(person: LegacyPersonValue | null) {
  return getPresetPersonLabel(person);
}

export function PresetCard({
  preset,
  compact = false,
  showDelete = true,
}: PresetCardProps) {
  const router = useRouter();
  const { tryTrigger, overlay } = useStreakCelebrationTrigger({
    onComplete: () => router.refresh(),
  });
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error" | null>(
    null,
  );

  const savings = Math.max(
    0,
    toNumber(preset.alternativeCost) - toNumber(preset.realCost),
  );

  function showFeedback(text: string, tone: "success" | "error") {
    setMessage(text);
    setMessageTone(tone);
  }

  function handleCreate(person?: LegacyPersonValue) {
    startTransition(async () => {
      const result = await createEntryFromPreset(preset.id, person);

      showFeedback(result.message, result.success ? "success" : "error");

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
    const confirmed = window.confirm("Eliminare questo preset?");

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deletePreset(preset.id);

      showFeedback(result.message, result.success ? "success" : "error");

      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <>
      {overlay}
      <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className={cn("space-y-3 p-5 pb-0", compact && "p-4 pb-0")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-base font-semibold text-foreground">
              {preset.title}
            </h3>
            <CategoryPill
              category={{ name: preset.category.name }}
              className="px-2.5 py-0.5 text-[11px]"
            />
          </div>

          <Badge variant="secondary" className="shrink-0 gap-1">
            <UserRound className="size-3.5" aria-hidden="true" />
            {getPersonLabel(preset.person)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-4 p-5", compact && "p-4")}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-surface-muted px-3 py-2">
            <p className="text-muted-text">Reale</p>
            <p className="font-medium">{formatMoney(preset.realCost)}</p>
          </div>
          <div className="rounded-2xl bg-surface-muted px-3 py-2">
            <p className="text-muted-text">Alternativo</p>
            <p className="font-medium">{formatMoney(preset.alternativeCost)}</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-success/10 px-3 py-2">
            <p className="text-success">Risparmio stimato</p>
            <p className="font-semibold text-success">
              {formatMoney(savings)}
            </p>
          </div>
        </div>

        {preset.note ? (
          <p className="rounded-2xl bg-surface-muted px-3 py-3 text-sm leading-6 text-muted-text">
            {preset.note}
          </p>
        ) : null}

        <div className="flex items-center gap-2 text-xs text-muted-text">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          <span>Creato il {formatDate(preset.createdAt)}</span>
        </div>

        {message ? (
          <p
            className={cn(
              "rounded-2xl px-3 py-2 text-sm leading-6",
              messageTone === "success"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {message}
          </p>
        ) : null}
      </CardContent>

      <CardFooter
        className={cn(
          "flex-col gap-3 border-t border-border bg-surface-muted/50 p-5",
          compact && "p-4",
        )}
      >
        {preset.person ? (
          <Button
            type="button"
            className="h-11 w-full"
            onClick={() => handleCreate()}
            disabled={isPending}
          >
            {isPending ? "Creazione..." : "Usa preset"}
          </Button>
        ) : (
          <div className="grid w-full grid-cols-3 gap-2">
            {getPersonOwnershipOptions().map((choice) => (
              <Button
                key={choice.value}
                type="button"
                variant="secondary"
                className="h-11 w-full"
                onClick={() => handleCreate(choice.value)}
                disabled={isPending}
              >
                {choice.label}
              </Button>
            ))}
          </div>
        )}

        {showDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full gap-2 text-muted-text"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Elimina
          </Button>
        ) : null}
      </CardFooter>
    </Card>
    </>
  );
}
