"use client";

import { Flame } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPersonFilterLabel } from "@/src/lib/person-labels";

export type StreakCardProps = {
  title: string;
  currentStreak: number;
  bestStreak: number;
  person?: "MARIAN" | "MARTINA" | "TUTTI";
};

function getPersonLabel(person?: StreakCardProps["person"]) {
  return getPersonFilterLabel(person);
}

function getMicrocopy(currentStreak: number): string {
  if (currentStreak <= 0) {
    return "Nessuna serie attiva";
  }

  if (currentStreak <= 3) {
    return "Si parte.";
  }

  if (currentStreak <= 7) {
    return "Stai entrando nel flow.";
  }

  return "Macchina da risparmio.";
}

function getAccentClass(currentStreak: number) {
  if (currentStreak <= 0) {
    return "from-zinc-500/15 to-zinc-500/5";
  }

  if (currentStreak <= 3) {
    return "from-amber-500/20 to-orange-500/10";
  }

  if (currentStreak <= 7) {
    return "from-orange-500/20 to-rose-500/10";
  }

  return "from-emerald-500/20 to-lime-500/10";
}

export function StreakCard({
  title,
  currentStreak,
  bestStreak,
  person,
}: StreakCardProps) {
  const microcopy = getMicrocopy(currentStreak);
  const accentClass = getAccentClass(currentStreak);

  return (
    <Card
      className={cn(
        "overflow-hidden border-zinc-200/80 shadow-sm dark:border-zinc-800",
        "bg-gradient-to-br",
        accentClass,
      )}
    >
      <CardHeader className="space-y-3 p-5 pb-0 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Flame className="size-4 text-amber-500" aria-hidden="true" />
              {title}
            </CardTitle>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {microcopy}
            </p>
          </div>

          <Badge variant="secondary" className="shrink-0">
            {getPersonLabel(person)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 pt-4 sm:p-6 sm:pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/70 px-3 py-3 ring-1 ring-zinc-200/70 backdrop-blur dark:bg-zinc-950/70 dark:ring-zinc-800">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Serie attuale
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {currentStreak}
            </p>
          </div>

          <div className="rounded-2xl bg-white/70 px-3 py-3 ring-1 ring-zinc-200/70 backdrop-blur dark:bg-zinc-950/70 dark:ring-zinc-800">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Migliore
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {bestStreak}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
