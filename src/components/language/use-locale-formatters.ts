"use client";

import { useMemo } from "react";

import { useWorkspaceLanguage } from "@/src/components/language/language-context";
import { languageToLocale } from "@/src/lib/i18n";
import {
  formatCraftedCompact,
  formatCraftedEntryAmount,
  splitCraftedAmount,
} from "@/src/lib/crafted-money";
import { formatDate, formatMoney } from "@/src/lib/formatters";

/**
 * Client-side formatters bound to the workspace locale, so components keep
 * the plain one-argument call sites while the locale follows
 * workspace.language instead of the hardcoded it-IT.
 */
/**
 * Binds a locale-first helper to the workspace locale, so components keep
 * their existing call sites: `const formatEUR = useBoundLocale(formatEURBase)`.
 */
export function useBoundLocale<A extends unknown[], R>(
  fn: (locale: string, ...args: A) => R,
): (...args: A) => R {
  const locale = languageToLocale(useWorkspaceLanguage());

  return useMemo(() => (...args: A) => fn(locale, ...args), [fn, locale]);
}

export function useLocaleFormatters() {
  const locale = languageToLocale(useWorkspaceLanguage());

  return useMemo(
    () => ({
      locale,
      formatCraftedCompact: (value: number) =>
        formatCraftedCompact(value, locale),
      formatCraftedEntryAmount: (value: unknown) =>
        formatCraftedEntryAmount(value, locale),
      splitCraftedAmount: (value: number) => splitCraftedAmount(value, locale),
      formatDate: (value: string | number | Date) => formatDate(value, locale),
      formatMoney: (value: unknown, currency?: string) =>
        formatMoney(value, currency, locale),
    }),
    [locale],
  );
}
