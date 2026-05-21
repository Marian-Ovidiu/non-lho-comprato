"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import type { ExpenseSuggestionResult } from "@/src/lib/expense-suggestion";
import { cn } from "@/lib/utils";

type ExpenseSuggestionCardProps = {
  suggestion: ExpenseSuggestionResult;
  realCost: string;
  alternativeCost: string;
  onApply: () => void;
  isAppliedAutomatically?: boolean;
  className?: string;
};

function formatSuggestionCost(value: number): string {
  return formatMoney(value);
}

export function ExpenseSuggestionCard({
  suggestion,
  realCost,
  alternativeCost,
  onApply,
  isAppliedAutomatically = false,
  className,
}: ExpenseSuggestionCardProps) {
  const real = Number(realCost.replace(",", "."));
  const appliedAlternative = Number(alternativeCost.replace(",", "."));
  const hasAppliedValue =
    Number.isFinite(appliedAlternative) &&
    Math.abs(appliedAlternative - suggestion.alternativeCost) < 0.01;
  const estimatedSavings = Number.isFinite(real)
    ? Math.max(0, suggestion.alternativeCost - real)
    : 0;

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/70 bg-surface/80 shadow-sm",
        className,
      )}
    >
      <CardContent className="space-y-3 p-4 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-premium-accent/20 bg-premium-accent/10 text-premium-accent">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-text">
              Alternativa trovata
            </p>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              {suggestion.label}
            </p>
            <p className="text-sm leading-5 text-muted-text">
              {formatSuggestionCost(suggestion.alternativeCost)} (
              {suggestion.evidenceCount} movimenti simili)
            </p>
            <p className="text-sm leading-5 text-success">
              Risparmio stimato: {formatSuggestionCost(estimatedSavings)}
            </p>
          </div>
        </div>

        {isAppliedAutomatically ? (
          <div className="rounded-2xl border border-premium-accent/20 bg-premium-accent/10 px-3 py-2 text-xs font-medium leading-5 text-premium-accent">
            Suggerito in base alle tue spese in questa categoria
          </div>
        ) : null}

        {!isAppliedAutomatically ? (
          <p className="text-xs leading-5 text-muted-text">
            Suggerito in base alle tue spese in questa categoria.
          </p>
        ) : null}

        {isAppliedAutomatically || hasAppliedValue ? (
          <p className="text-sm font-medium text-muted-text">
            Suggerimento applicato.
          </p>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="h-10 w-full rounded-2xl"
            onClick={onApply}
          >
            Usa suggerimento
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
