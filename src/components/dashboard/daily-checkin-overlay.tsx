"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { Label, Mono, Rule, Serif } from "@/components/crafted";
import { Button } from "@/components/ui/button";
import { splitCraftedAmount } from "@/src/lib/crafted-money";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations } from "@/src/components/language/language-context";
import { cn } from "@/lib/utils";

type DailyCheckinOverlayProps = {
  spentToday: number;
  savedToday: number;
  pendingHabitsCount?: number;
  isVisible?: boolean;
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
  spentToday,
  savedToday,
  pendingHabitsCount,
  isVisible = true,
}: DailyCheckinOverlayProps) {
  const t = useTranslations();
  const currencySymbol = useCurrencySymbol();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

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
  }, [isVisible]);

  if (typeof document === "undefined" || !isVisible || !isOpen) {
    return null;
  }

  const spentHero = splitCraftedAmount(spentToday);
  const hasSpent = spentToday > 0;
  const hasSaved = savedToday > 0;
  const showHabits =
    typeof pendingHabitsCount === "number" && pendingHabitsCount > 0;

  const lede = hasSpent
    ? t.dailyCheckin.ledeSpent(`${spentHero.whole},${spentHero.decimals}${currencySymbol}`)
    : hasSaved
      ? t.dailyCheckin.ledeSaved
      : t.dailyCheckin.ledeEmpty;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      role="presentation"
      onClick={() => setIsOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-checkin-title"
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "w-full max-w-lg border border-line bg-surface",
          "rounded-t-[28px] px-[22px] pb-[calc(env(safe-area-inset-bottom)+1.75rem)] pt-2.5",
          "max-h-[calc(100dvh_-_env(safe-area-inset-bottom)_-_0.75rem)] overflow-y-auto overscroll-contain",
          "shadow-[0_-24px_60px_-30px_rgba(0,0,0,0.8)]",
          "sm:rounded-[24px] sm:pb-7 sm:shadow-2xl",
        )}
      >
        <div className="mx-auto mb-3.5 h-1 w-9 rounded-full bg-line sm:hidden" />

        <div className="mb-[18px] flex items-center justify-between gap-3">
          <span id="daily-checkin-title">
            <Label>{t.dailyCheckin.title}</Label>
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={t.dailyCheckin.close}
            className="flex size-[30px] items-center justify-center rounded-full text-ink-3 transition-colors hover:text-foreground"
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </div>

        <Label className="mb-3 block">{t.dailyCheckin.spentToday}</Label>
        <div className="flex items-start gap-1.5">
          <Mono
            className={cn(
              "text-[52px] font-semibold leading-[0.85] tracking-[-0.05em]",
              hasSpent ? "text-accent" : "text-foreground",
            )}
          >
            {spentHero.whole}
          </Mono>
          <Mono className="mt-1.5 text-xl text-muted-foreground">
            ,{spentHero.decimals}{currencySymbol}
          </Mono>
        </div>

        {hasSaved ? (
          <div className="mt-3">
            <Label className="mb-1.5 block">{t.dailyCheckin.netImpactToday}</Label>
            <Mono className="text-lg font-medium text-accent">
              {savedToday.toLocaleString("it-IT", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              {currencySymbol}
            </Mono>
          </div>
        ) : null}

        <Serif className="mt-3.5 block text-base leading-[1.4] text-muted-foreground">
          {lede}
        </Serif>

        {showHabits ? (
          <div className="mt-5">
            <Rule />
            <div className="flex items-center justify-between gap-3 py-3.5">
              <span className="flex items-center gap-2.5">
                <span className="size-[7px] rounded-full bg-accent" />
                <span className="whitespace-nowrap text-sm font-[450]">
                  {t.dailyCheckin.pendingHabits}
                </span>
              </span>
              <Mono className="text-xl font-semibold">{pendingHabitsCount}</Mono>
            </div>
            <Rule />
          </div>
        ) : null}

        <div className="mt-[22px] flex flex-col gap-2.5">
          <Button
            asChild
            className="h-[52px] w-full rounded-[18px] text-[15px] font-bold"
          >
            <Link href="/entries/new">{t.dailyCheckin.registerExpense}</Link>
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
