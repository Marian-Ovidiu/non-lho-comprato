"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";

type DailyCheckinOverlayProps = {
  savedToday: number;
  currentStreak: number;
  pendingHabitsCount?: number;
};

function getLocalDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getStorageKey() {
  return `nlc_daily_overlay_seen_${getLocalDateKey()}`;
}

export function DailyCheckinOverlay({
  savedToday,
  currentStreak,
  pendingHabitsCount,
}: DailyCheckinOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);

  const title = useMemo(() => "Situazione portafoglio", []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const storageKey = getStorageKey();
        const seen = window.localStorage.getItem(storageKey);

        if (!seen) {
          setIsOpen(true);
          window.localStorage.setItem(storageKey, "1");
        }
      } catch (error) {
        console.error("Failed to read daily overlay state:", error);
        setIsOpen(false);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={() => setIsOpen(false)}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-checkin-title"
        className="w-full max-w-lg overflow-hidden border-border bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader className="space-y-3 p-5 pb-0 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-background">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-text">
                  Check veloce del giorno
                </p>
                <CardTitle
                  id="daily-checkin-title"
                  className="text-xl tracking-tight text-foreground"
                >
                  {title}
                </CardTitle>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full text-muted-text hover:bg-surface-muted hover:text-foreground"
              onClick={() => setIsOpen(false)}
              aria-label="Chiudi"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-5 pt-4 sm:p-6 sm:pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-text">
                Risparmiato oggi
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatMoney(savedToday)}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-text">
                Serie attuale
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {currentStreak} giorni
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-surface-muted px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-text">
                Abitudini in attesa
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {typeof pendingHabitsCount === "number"
                  ? `${pendingHabitsCount}`
                  : "—"}
              </p>
            </div>
          </div>

          <p className="text-sm leading-6 text-muted-text">
            {savedToday > 0
              ? `Oggi avete già schivato ${formatMoney(savedToday)}.`
              : "Oggi ancora niente. C'è tempo per muovere il portafoglio nella direzione giusta."}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="w-full sm:flex-1">
              <Link href="/entries/new">Aggiungi movimento</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:flex-1">
              <Link href="/habits">Vai alle abitudini</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
