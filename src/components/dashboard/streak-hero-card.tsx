import { Flame } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StreakHeroCardProps = {
  currentStreak: number;
};

function getStreakCopy(currentStreak: number) {
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
    return "from-surface-muted/90 via-surface to-surface-muted/70";
  }

  if (currentStreak <= 3) {
    return "from-success/15 via-surface to-success/5";
  }

  if (currentStreak <= 7) {
    return "from-success/20 via-surface to-success/10";
  }

  return "from-success/25 via-surface to-success/10";
}

export function StreakHeroCard({ currentStreak }: StreakHeroCardProps) {
  const copy = getStreakCopy(currentStreak);
  const accentClass = getAccentClass(currentStreak);

  return (
    <Card
      className={cn(
        "overflow-hidden border-border shadow-sm dark:border-border",
        "bg-gradient-to-br",
        accentClass,
      )}
    >
      <div className="relative flex min-h-[13rem] flex-col items-center justify-center gap-3 px-5 py-8 text-center sm:min-h-[15rem] sm:px-6">
        <div className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-surface/80 text-success shadow-sm backdrop-blur dark:bg-surface/70">
          <Flame className="size-6" aria-hidden="true" />
        </div>

        <p className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          {currentStreak}{" "}
          <span className="text-2xl font-medium tracking-tight text-muted-text sm:text-3xl">
            giorni
          </span>
        </p>

        <p className="max-w-md text-sm leading-6 text-muted-text sm:text-base">
          {copy}
        </p>
      </div>
    </Card>
  );
}
