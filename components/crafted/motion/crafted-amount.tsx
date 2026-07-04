"use client";

import { cn } from "@/lib/utils";

import { useWorkspaceLanguage } from "@/src/components/language/language-context";
import { languageToLocale } from "@/src/lib/i18n";

import { useCountUp } from "./use-count-up";

type CraftedAmountProps = {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  duration?: number;
  startOnMount?: boolean;
};

function formatAmount(
  locale: string,
  value: number,
  minimumFractionDigits: number,
  maximumFractionDigits: number,
) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function CraftedAmount({
  value,
  className,
  prefix = "",
  suffix = "",
  minimumFractionDigits = 0,
  maximumFractionDigits = 2,
  duration,
  startOnMount,
}: CraftedAmountProps) {
  const locale = languageToLocale(useWorkspaceLanguage());
  const displayValue = useCountUp(value, {
    duration,
    precision: maximumFractionDigits,
    startOnMount,
  });

  return (
    <span className={cn("tabular-nums", className)}>
      {prefix}
      {formatAmount(locale, displayValue, minimumFractionDigits, maximumFractionDigits)}
      {suffix}
    </span>
  );
}
