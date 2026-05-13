import { Compass } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StreakHeroCardProps = {
  currentStreak: number;
};

function getStreakCopy(currentStreak: number) {
  if (currentStreak <= 0) {
    return "Nessun ritmo ancora";
  }

  if (currentStreak <= 3) {
    return "Il ritmo comincia a farsi vedere.";
  }

  if (currentStreak <= 7) {
    return "Il quadro della settimana è più chiaro.";
  }

  return "Il ritmo è stabile.";
}

function getAccentClass(currentStreak: number) {
  if (currentStreak <= 0) {
    return "from-surface-muted/90 via-surface to-surface-muted/70";
  }

  if (currentStreak <= 3) {
    return "from-premium-accent/12 via-surface to-premium-accent/5";
  }

  if (currentStreak <= 7) {
    return "from-premium-accent/16 via-surface to-premium-accent/8";
  }

  return "from-premium-accent/20 via-surface to-premium-accent/10";
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
        <div className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-surface/80 text-premium-accent shadow-sm backdrop-blur dark:bg-surface/70">
          <Compass className="size-6" aria-hidden="true" />
        </div>

        <p className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          {currentStreak}{" "}
          <span className="text-2xl font-medium tracking-tight text-muted-text sm:text-3xl">
            giorni di ritmo
          </span>
        </p>

        <p className="max-w-md text-sm leading-6 text-muted-text sm:text-base">
          {copy}
        </p>
      </div>
    </Card>
  );
}
