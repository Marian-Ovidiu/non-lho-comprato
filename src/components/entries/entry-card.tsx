"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteEntry } from "@/src/actions/entries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/src/lib/formatters";
import { getEntryOwnershipLabel } from "@/src/lib/person-labels";

type EntryCardProps = {
  entry: {
    id: string;
    title: string;
    category: {
      name: string;
    };
    date: Date;
    realCost: unknown;
    alternativeCost: unknown;
    savedAmount: unknown;
    note: string | null;
    source: string;
    person: string | null;
  };
};

function getSavedLabel(savedAmount: unknown) {
  const amount = Number(savedAmount);

  if (amount > 0) {
    return "Risparmiati";
  }

  if (amount < 0) {
    return "Extra speso";
  }

  return "Nessun risparmio";
}

function getSourceLabel(source: string) {
  if (source === "habit") {
    return "Abitudine";
  }

  return "Manuale";
}

function getPersonLabel(person: string | null) {
  return getEntryOwnershipLabel(person as "MARIAN" | "MARTINA" | "TUTTI" | null);
}

export function EntryCard({ entry }: EntryCardProps) {
  const router = useRouter();
  const [isDeleting, startTransition] = useTransition();
  const savedLabel = getSavedLabel(entry.savedAmount);
  const savedAmount = Number(entry.savedAmount);

  function handleDelete() {
    const confirmed = window.confirm(
      "Vuoi eliminare questo movimento? L'operazione non si può annullare.",
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteEntry(entry.id);

      if (!result.success) {
        window.alert(result.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <Card className="overflow-hidden border-zinc-200/80 shadow-sm">
      <CardHeader className="space-y-4 p-5 pb-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate text-lg sm:text-xl">
              {entry.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span>{entry.category.name}</span>
              <span aria-hidden="true">•</span>
              <span>{formatDate(entry.date)}</span>
            </div>
          </div>

          <div
            className={
              savedAmount > 0
                ? "rounded-2xl bg-emerald-50 px-3 py-2 text-right"
                : savedAmount < 0
                  ? "rounded-2xl bg-rose-50 px-3 py-2 text-right"
                  : "rounded-2xl bg-zinc-50 px-3 py-2 text-right"
            }
          >
            <p
              className={
                savedAmount > 0
                  ? "text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-700"
                  : savedAmount < 0
                    ? "text-[11px] font-medium uppercase tracking-[0.18em] text-rose-700"
                    : "text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500"
              }
            >
              {savedLabel}
            </p>
            <p
              className={
                savedAmount > 0
                  ? "text-lg font-semibold text-emerald-700"
                  : savedAmount < 0
                    ? "text-lg font-semibold text-rose-700"
                    : "text-lg font-semibold text-zinc-950"
              }
            >
              {formatMoney(entry.savedAmount)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 pt-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl bg-zinc-50 px-3 py-2">
            <p className="text-zinc-500">Speso</p>
            <p className="font-medium text-zinc-950">
              {formatMoney(entry.realCost)}
            </p>
          </div>
          <div className="rounded-2xl bg-zinc-50 px-3 py-2">
            <p className="text-zinc-500">Avresti speso</p>
            <p className="font-medium text-zinc-950">
              {formatMoney(entry.alternativeCost)}
            </p>
          </div>
          <div className="col-span-2 rounded-2xl bg-emerald-50 px-3 py-2 sm:col-span-1">
            <p className="text-emerald-700">{savedLabel}</p>
            <p
              className={
                savedAmount > 0
                  ? "font-semibold text-emerald-700"
                  : savedAmount < 0
                    ? "font-semibold text-rose-700"
                    : "font-semibold text-zinc-950"
              }
            >
              {formatMoney(entry.savedAmount)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <Badge variant="outline">{getSourceLabel(entry.source)}</Badge>
          <Badge variant="secondary">{getPersonLabel(entry.person)}</Badge>
          <Button
            asChild
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3"
          >
            <Link href={`/entries/${entry.id}/edit`}>Modifica</Link>
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8 px-3"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            Elimina
          </Button>
        </div>

        {entry.note ? (
          <p className="rounded-2xl bg-zinc-50 px-3 py-3 text-sm leading-6 text-zinc-600">
            {entry.note}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
