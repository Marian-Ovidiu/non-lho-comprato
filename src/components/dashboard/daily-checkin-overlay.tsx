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
  const [mounted, setMounted] = useState(false);

  const title = useMemo(
    () => "Situazione portafoglio",
    [],
  );

  useEffect(() => {
    setMounted(true);

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
  }, []);

  if (!mounted || !isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={() => setIsOpen(false)}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-checkin-title"
        className="w-full max-w-lg overflow-hidden border-zinc-200/80 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <CardHeader className="space-y-3 p-5 pb-0 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  Check veloce del giorno
                </p>
                <CardTitle
                  id="daily-checkin-title"
                  className="text-xl tracking-tight text-zinc-950 dark:text-zinc-50"
                >
                  {title}
                </CardTitle>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              onClick={() => setIsOpen(false)}
              aria-label="Chiudi"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-5 pt-4 sm:p-6 sm:pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                Risparmiato oggi
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {formatMoney(savedToday)}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                Serie attuale
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {currentStreak} giorni
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                Abitudini in attesa
              </p>
              <p className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {typeof pendingHabitsCount === "number"
                  ? `${pendingHabitsCount}`
                  : "—"}
              </p>
            </div>
          </div>

          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {savedToday > 0
              ? `Oggi avete già schivato ${formatMoney(savedToday)}.`
              : "Oggi ancora niente. C&apos;è tempo per muovere il portafoglio nella direzione giusta."}
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
