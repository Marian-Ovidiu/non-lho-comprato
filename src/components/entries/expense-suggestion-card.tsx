"use client";

import { Check, Sparkles } from "lucide-react";

import { Label, Mono } from "@/components/crafted";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import type { ExpenseSuggestionResult } from "@/src/lib/expense-suggestion";
import { cn } from "@/lib/utils";

type ExpenseSuggestionCardProps = {
  suggestion: ExpenseSuggestionResult;
  onApply: () => void;
  className?: string;
};

export function ExpenseSuggestionCard({
  suggestion,
  onApply,
  className,
}: ExpenseSuggestionCardProps) {
  const currencySymbol = useCurrencySymbol();
  return (
    <div className={cn("border-y border-line py-3.5", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
        <Label>Confronto trovato</Label>
      </div>

      <p className="mt-2 text-[15px] font-[450]">{suggestion.label}</p>

      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="min-w-0 text-[13px] text-ink-3">
          <Mono className="text-muted-foreground">
            {formatCraftedCompact(suggestion.alternativeCost)}{currencySymbol}
          </Mono>{" "}
          · da {suggestion.evidenceCount}{" "}
          {suggestion.evidenceCount === 1 ? "movimento simile" : "movimenti simili"}
        </span>

        <button
          type="button"
          onClick={onApply}
          aria-label="Usa suggerimento"
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/40 px-3.5 py-1.5",
            "text-[12.5px] font-medium text-accent transition-colors hover:bg-accent/10 active:scale-[0.98]",
          )}
        >
          <Check className="size-3.5" aria-hidden="true" />
          Aggiungi confronto
        </button>
      </div>
    </div>
  );
}
