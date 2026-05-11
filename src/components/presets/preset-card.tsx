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
import type { PersonFilterValue } from "@/src/lib/person-filter";

type PresetCardData = {
  id: string;
  title: string;
  category: {
    name: string;
  };
  realCost: unknown;
  alternativeCost: unknown;
  note: string | null;
  person: PersonFilterValue | null;
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

function getPersonLabel(person: PersonFilterValue | null) {
  if (person === "MARIAN") {
    return "Marian";
  }

  if (person === "MARTINA") {
    return "Martina";
  }

  if (person === "TUTTI") {
    return "Condivisa";
  }

  return "Da scegliere al momento";
}

export function PresetCard({
  preset,
  compact = false,
  showDelete = true,
}: PresetCardProps) {
  const router = useRouter();
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

  function handleCreate(person?: PersonFilterValue) {
    startTransition(async () => {
      const result = await createEntryFromPreset(preset.id, person);

      showFeedback(result.message, result.success ? "success" : "error");

      if (result.success) {
        router.refresh();
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
    <Card className="overflow-hidden border-zinc-200/80 shadow-sm">
      <CardHeader className={cn("space-y-3 p-5 pb-0", compact && "p-4 pb-0")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-base font-semibold text-zinc-950">
              {preset.title}
            </h3>
            <p className="text-sm text-zinc-500">{preset.category.name}</p>
          </div>

          <Badge variant="secondary" className="shrink-0 gap-1">
            <UserRound className="size-3.5" aria-hidden="true" />
            {getPersonLabel(preset.person)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-4 p-5", compact && "p-4")}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-zinc-50 px-3 py-2">
            <p className="text-zinc-500">Reale</p>
            <p className="font-medium">{formatMoney(preset.realCost)}</p>
          </div>
          <div className="rounded-2xl bg-zinc-50 px-3 py-2">
            <p className="text-zinc-500">Alternativo</p>
            <p className="font-medium">{formatMoney(preset.alternativeCost)}</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-emerald-50 px-3 py-2">
            <p className="text-emerald-700">Risparmio stimato</p>
            <p className="font-semibold text-emerald-700">
              {formatMoney(savings)}
            </p>
          </div>
        </div>

        {preset.note ? (
          <p className="rounded-2xl bg-zinc-50 px-3 py-3 text-sm leading-6 text-zinc-600">
            {preset.note}
          </p>
        ) : null}

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          <span>Creato il {formatDate(preset.createdAt)}</span>
        </div>

        {message ? (
          <p
            className={cn(
              "rounded-2xl px-3 py-2 text-sm leading-6",
              messageTone === "success"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-rose-50 text-rose-800",
            )}
          >
            {message}
          </p>
        ) : null}
      </CardContent>

      <CardFooter
        className={cn(
          "flex-col gap-3 border-t border-zinc-200/70 bg-zinc-50/50 p-5",
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
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full"
              onClick={() => handleCreate("MARIAN")}
              disabled={isPending}
            >
              Marian
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full"
              onClick={() => handleCreate("MARTINA")}
              disabled={isPending}
            >
              Martina
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full"
              onClick={() => handleCreate("TUTTI")}
              disabled={isPending}
            >
              Condivisa
            </Button>
          </div>
        )}

        {showDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full gap-2 text-zinc-600"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Elimina
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
