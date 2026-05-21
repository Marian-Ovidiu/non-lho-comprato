"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/src/lib/formatters";
import type { ExpenseSuggestionResult } from "@/src/lib/expense-suggestion";
import { cn } from "@/lib/utils";

type ExpenseSuggestionCardProps = {
  suggestion: ExpenseSuggestionResult;
  onApply: () => void;
  className?: string;
};

function formatSuggestionCost(value: number): string {
  return formatMoney(value);
}

export function ExpenseSuggestionCard({
  suggestion,
  onApply,
  className,
}: ExpenseSuggestionCardProps) {
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
            <p className="text-sm font-medium tracking-tight text-foreground">
              Alternativa trovata
            </p>
            <p className="text-sm leading-5 text-muted-text">
              {suggestion.label} medio
            </p>
            <p className="text-sm leading-5 text-muted-text">
              {formatSuggestionCost(suggestion.alternativeCost)}, {suggestion.evidenceCount} movimenti simili
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-10 w-full rounded-2xl"
          onClick={onApply}
        >
          Usa suggerimento
        </Button>
      </CardContent>
    </Card>
  );
}
