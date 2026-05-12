"use client";

import { Flame } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getPersonFilterLabel, type LegacyPersonValue } from "@/src/lib/ui-person";

export type StreakCardProps = {
  title: string;
  currentStreak: number;
  bestStreak: number;
  person?: LegacyPersonValue;
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
    return "from-surface-muted/60 to-surface-muted/20";
  }

  if (currentStreak <= 3) {
    return "from-success/15 to-success/5";
  }

  if (currentStreak <= 7) {
    return "from-success/20 to-success/10";
  }

  return "from-success/20 to-success/10";
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
        "overflow-hidden border-border shadow-sm dark:border-border",
        "bg-gradient-to-br",
        accentClass,
      )}
    >
      <CardHeader className="space-y-2.5 p-4 pb-0 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-[1.05rem]">
              <Flame className="size-4 text-success" aria-hidden="true" />
              {title}
            </CardTitle>
            <p className="text-sm text-muted-text dark:text-muted-text">
              {microcopy}
            </p>
          </div>

          <Badge variant="secondary" className="shrink-0">
            {getPersonLabel(person)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5 p-4 pt-3 sm:p-5 sm:pt-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-surface/70 px-3 py-2.5 ring-1 ring-border backdrop-blur dark:bg-accent/70 dark:ring-border">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-text">
              Serie attuale
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground dark:text-foreground sm:text-3xl">
              {currentStreak}
            </p>
          </div>

          <div className="rounded-2xl bg-surface/70 px-3 py-2.5 ring-1 ring-border backdrop-blur dark:bg-accent/70 dark:ring-border">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-text">
              Migliore
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground dark:text-foreground sm:text-3xl">
              {bestStreak}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


