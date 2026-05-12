"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteEntry } from "@/src/actions/entries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/src/lib/formatters";
import {
  getEntryOwnershipLabel,
  type LegacyPersonValue,
} from "@/src/lib/ui-person";

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
    person: LegacyPersonValue | null;
  };
};

function getSourceLabel(source: string) {
  return source === "habit" ? "Abitudine" : "Manuale";
}

function formatSignedMoney(value: unknown) {
  const amount = Number(value);
  const formatted = formatMoney(Math.abs(amount));

  if (amount > 0) {
    return `+${formatted}`;
  }

  if (amount < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

export function EntryCard({ entry }: EntryCardProps) {
  const router = useRouter();
  const [isDeleting, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const savedAmount = Number(entry.savedAmount);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  function handleDelete() {
    const confirmed = window.confirm(
      "Vuoi eliminare questo movimento? L'operazione non si può annullare.",
    );

    if (!confirmed) {
      return;
    }

    setMenuOpen(false);

    startTransition(async () => {
      const result = await deleteEntry(entry.id);

      if (!result.success) {
        window.alert(result.message);
        return;
      }

      router.refresh();
    });
  }

  const savedTone =
    savedAmount > 0
      ? "text-success"
      : savedAmount < 0
        ? "text-destructive"
        : "text-foreground";

  const savedSurface =
    savedAmount > 0
      ? "bg-success/8 border-success/15"
      : savedAmount < 0
        ? "bg-destructive/8 border-destructive/15"
        : "bg-surface-muted/80 border-border/70";

  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="space-y-3 p-4 pb-0 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {entry.title}
            </h2>
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-5 text-muted-text sm:text-sm">
              <span>{entry.category.name}</span>
              <span aria-hidden="true">•</span>
              <span>{formatDate(entry.date)}</span>
              <span aria-hidden="true">•</span>
              <span>{getEntryOwnershipLabel(entry.person)}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-text">
                Risparmio
              </p>
              <p className={cn("text-lg font-semibold tracking-tight sm:text-xl", savedTone)}>
                {formatSignedMoney(entry.savedAmount)}
              </p>
            </div>

            <div ref={menuRef} className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="rounded-full border border-border/70 bg-background/70 text-muted-text hover:text-foreground"
                aria-label="Azioni movimento"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                onClick={() => setMenuOpen((value) => !value)}
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>

              {menuOpen ? (
                <div
                  role="menu"
                  aria-label="Azioni movimento"
                  className="absolute right-0 top-10 z-20 w-36 rounded-2xl border border-border/80 bg-surface/95 p-1.5 shadow-lg backdrop-blur"
                >
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full justify-start rounded-xl px-3 text-sm"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Link href={`/entries/${entry.id}/edit`}>Modifica</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full justify-start rounded-xl px-3 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    Elimina
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-4 pt-3 sm:p-5 sm:pt-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className={cn("rounded-2xl border px-3 py-2.5", savedSurface)}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-text">
              Speso
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatMoney(entry.realCost)}
            </p>
          </div>

          <div className={cn("rounded-2xl border px-3 py-2.5", savedSurface)}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-text">
              Avresti speso
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatMoney(entry.alternativeCost)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Badge
            variant="outline"
            className="h-5 rounded-full px-2 text-[11px] uppercase tracking-[0.14em]"
          >
            {getSourceLabel(entry.source)}
          </Badge>
          {entry.note ? (
            <p className="min-w-0 flex-1 truncate text-xs leading-5 text-muted-text">
              {entry.note}
            </p>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
