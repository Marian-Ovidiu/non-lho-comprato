"use client";

import { useCallback, useState } from "react";

import { StreakCelebrationOverlay } from "@/src/components/dashboard/streak-celebration-overlay";
import {
  markStreakCelebrationShownToday,
  shouldShowStreakCelebrationToday,
} from "@/src/lib/streak-celebration-storage";

export type StreakCelebrationSource = {
  success: boolean;
  isFirstEntryOfDay?: boolean;
  streakFrom?: number;
  streakTo?: number;
};

type UseStreakCelebrationTriggerOptions = {
  onComplete?: () => void;
};

export function useStreakCelebrationTrigger(
  options: UseStreakCelebrationTriggerOptions = {},
) {
  const [celebration, setCelebration] = useState<{
    streakFrom: number;
    streakTo: number;
  } | null>(null);
  const [instanceKey, setInstanceKey] = useState(0);

  const tryTrigger = useCallback((source: StreakCelebrationSource) => {
    if (!source.success || !source.isFirstEntryOfDay) {
      return false;
    }

    if (source.streakFrom === undefined || source.streakTo === undefined) {
      return false;
    }

    if (!shouldShowStreakCelebrationToday()) {
      return false;
    }

    markStreakCelebrationShownToday();
    setInstanceKey((current) => current + 1);
    setCelebration({
      streakFrom: source.streakFrom,
      streakTo: source.streakTo,
    });
    return true;
  }, []);

  const closeCelebration = useCallback(() => {
    setCelebration(null);
    options.onComplete?.();
  }, [options.onComplete]);

  const overlay =
    celebration !== null ? (
      <StreakCelebrationOverlay
        key={instanceKey}
        streakFrom={celebration.streakFrom}
        streakTo={celebration.streakTo}
        onClose={closeCelebration}
      />
    ) : null;

  return {
    tryTrigger,
    overlay,
    isCelebrating: celebration !== null,
  };
}
