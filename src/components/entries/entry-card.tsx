"use client";

import Link from "next/link";
import { Loader2, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteEntry } from "@/src/actions/entries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney } from "@/src/lib/formatters";
import {
  getMemberLabel,
  type WorkspaceMemberOption,
} from "@/src/lib/workspace-members";
import { CategoryPill } from "@/src/components/shared/category-pill";

type EntryCardProps = {
  entry: {
    id: string;
    title: string;
    category: {
      name: string;
      slug?: string | null;
    };
    date: string | Date;
    realCost: unknown;
    alternativeCost: unknown;
    savedAmount: unknown;
    note: string | null;
    source: string;
    paidByUserId?: string | null;
    beneficiaryUserIds?: string[];
  };
  members: WorkspaceMemberOption[];
};

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

function getSourceLabel(source: string) {
  return source === "habit" ? "Abitudine" : "Manuale";
}

function getBeneficiariesLabel(
  members: WorkspaceMemberOption[],
  beneficiaryUserIds: string[] | undefined,
) {
  if (!beneficiaryUserIds || beneficiaryUserIds.length === 0) {
    return null;
  }

  const labels = beneficiaryUserIds
    .map((userId) => getMemberLabel(members, userId))
    .filter((label): label is string => Boolean(label));

  if (labels.length === 0) {
    return null;
  }

  return labels.join(", ");
}

export function EntryCard({ entry, members }: EntryCardProps) {
  const router = useRouter();
  const [isDeleting, startTransition] = useTransition();
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const collapseTimerRef = useRef<number | null>(null);
  const savedAmount = Number(entry.savedAmount);
  const paidByLabel = getMemberLabel(members, entry.paidByUserId);
  const beneficiariesLabel = getBeneficiariesLabel(members, entry.beneficiaryUserIds);
  const isBusy = isDeleting || isCollapsing;

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) {
        window.clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

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

      setIsCollapsing(true);
      collapseTimerRef.current = window.setTimeout(() => {
        setIsRemoved(true);
        router.refresh();
      }, 180);
    });
  }

  if (isRemoved) {
    return null;
  }

  const savedTone =
    savedAmount > 0
      ? "text-success"
      : savedAmount < 0
        ? "text-destructive"
        : "text-foreground";

  const spentSurface =
    savedAmount > 0
      ? "border-success/15 bg-success/8"
      : savedAmount < 0
        ? "border-destructive/15 bg-destructive/8"
        : "border-border/70 bg-surface-muted/80";

  return (
    <div
      className={cn(
        "overflow-hidden transition-[max-height,opacity,transform,margin] duration-200 ease-[cubic-bezier(.2,.8,.2,1)]",
        isCollapsing && "max-h-0 -translate-y-1 opacity-0",
      )}
      style={{
        maxHeight: isCollapsing ? 0 : 1200,
      }}
    >
      <Card
        className={cn(
          "relative overflow-hidden border-border/80 shadow-sm transition-opacity duration-200",
          isBusy && "pointer-events-none opacity-60",
        )}
        aria-busy={isBusy}
      >
        {isBusy ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/55 backdrop-blur-[1px]">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Eliminazione...
            </span>
          </div>
        ) : null}
        <CardContent className="space-y-3 p-4 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h2 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-[1.05rem]">
              {entry.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <CategoryPill
                category={entry.category}
                className="px-2.5 py-0.5 text-[11px]"
              />
              <p className="text-xs leading-5 text-muted-text sm:text-sm">
                {formatDate(entry.date)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-1.5">
            <p className={cn("text-lg font-semibold tracking-tight sm:text-xl", savedTone)}>
              {formatSignedMoney(entry.savedAmount)}
            </p>

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
                  className="absolute right-0 top-10 z-20 w-36 rounded-2xl border border-border/80 bg-surface/96 p-1.5 shadow-lg backdrop-blur"
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

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-text sm:text-sm">
          {paidByLabel ? (
            <>
              <span>Pagato da {paidByLabel}</span>
              {beneficiariesLabel ? (
                <>
                  <span aria-hidden="true">•</span>
                  <span>Per {beneficiariesLabel}</span>
                </>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className={cn("rounded-2xl border px-3 py-2.5", spentSurface)}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-text">
              Speso
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatMoney(entry.realCost)}
            </p>
          </div>

          <div className={cn("rounded-2xl border px-3 py-2.5", spentSurface)}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-text">
              Avresti speso
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatMoney(entry.alternativeCost)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="h-5 rounded-full px-2 text-[11px] uppercase tracking-[0.12em]"
          >
            {getSourceLabel(entry.source)}
          </Badge>
          {entry.note ? (
            <p className="min-w-0 flex-1 truncate text-xs leading-5 text-muted-text">
              {entry.note}
            </p>
          ) : null}
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
