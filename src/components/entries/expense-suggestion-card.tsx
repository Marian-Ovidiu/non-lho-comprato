"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { Label, Mono } from "@/components/crafted";
import { useLocaleFormatters } from "@/src/components/language/use-locale-formatters";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations } from "@/src/components/language/language-context";
import type { ExpenseSuggestionResult } from "@/src/lib/expense-suggestion";
import { cn } from "@/lib/utils";

type ExpenseSuggestionCardProps = {
  suggestion: ExpenseSuggestionResult;
  /** Dove si va per registrare davvero il confronto: il form completo. */
  href: string;
  onNavigate?: () => void;
  className?: string;
};

/**
 * Il suggerimento non è più un'azione, è una memoria.
 *
 * Finché il confronto stava nell'aggiunta rapida, questo blocco poteva
 * applicarlo sul posto. Adesso il confronto vive solo nel form completo, e un
 * pulsante che dicesse "usa suggerimento" prometterebbe una cosa che questo
 * pannello non sa più fare. Quindi la card dice quello che sa — quanto spendi
 * di solito per questa cosa — mentre stai scrivendo l'importo, che è il momento
 * in cui quel numero serve; e il gesto per trasformarlo in un confronto porta
 * dove il confronto abita, con la bozza già in tasca.
 */
export function ExpenseSuggestionCard({
  suggestion,
  href,
  onNavigate,
  className,
}: ExpenseSuggestionCardProps) {
  const { formatCraftedCompact } = useLocaleFormatters();
  const currencySymbol = useCurrencySymbol();
  const t = useTranslations();

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Sparkles className="size-3.5 shrink-0 text-accent" aria-hidden="true" />

      <p className="min-w-0 flex-1 text-[12.5px] leading-4 text-ink-3">
        <Label className="tracking-[0.1em]">{t.expenseSuggestion.usually}</Label>{" "}
        <Mono className="text-[13px] text-foreground">
          {formatCraftedCompact(suggestion.alternativeCost)}
          {currencySymbol}
        </Mono>{" "}
        · {suggestion.evidenceCount}{" "}
        {suggestion.evidenceCount === 1
          ? t.expenseSuggestion.similarSingular
          : t.expenseSuggestion.similarPlural}
      </p>

      <Link
        href={href}
        onClick={onNavigate}
        aria-label={t.expenseSuggestion.compareInFullForm}
        className={cn(
          "inline-flex size-9 shrink-0 items-center justify-center rounded-full",
          "text-accent outline-none transition-colors hover:bg-accent/10",
          "focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
