"use client";

import { useEffect, useRef, useState } from "react";

import { getExpenseSuggestion } from "@/src/actions/entries";
import type { ExpenseSuggestionResult } from "@/src/lib/expense-suggestion";

type UseExpenseSuggestionOptions = {
  title: string;
  categoryId: string;
  workspaceId: string;
  amountSpent: string;
  paidByUserId?: string | null;
  beneficiaryUserIds?: string[];
  enabled?: boolean;
};

function parseMoney(value: string): number {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function useExpenseSuggestion({
  title,
  categoryId,
  workspaceId,
  amountSpent,
  paidByUserId,
  beneficiaryUserIds,
  enabled = true,
}: UseExpenseSuggestionOptions) {
  const [suggestion, setSuggestion] = useState<ExpenseSuggestionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const lastSignatureRef = useRef<string | null>(null);
  const parsedRealCost = parseMoney(amountSpent);
  const hasRequiredFields =
    enabled &&
    categoryId.trim().length > 0 &&
    workspaceId.trim().length > 0 &&
    Number.isFinite(parsedRealCost);
  const resolvedSuggestion = hasRequiredFields ? suggestion : null;
  const resolvedIsLoading = hasRequiredFields ? isLoading : false;

  useEffect(() => {
    const signature = [
      categoryId.trim(),
      workspaceId.trim(),
      Number.isFinite(parsedRealCost) ? parsedRealCost.toFixed(2) : "",
    ].join("|");

    if (!hasRequiredFields) {
      lastSignatureRef.current = null;
      return;
    }

    if (lastSignatureRef.current === signature) {
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    lastSignatureRef.current = signature;
    setIsLoading(true);

    const timeout = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await getExpenseSuggestion({
            title,
            categoryId,
            workspaceId,
            currentRealCost: parsedRealCost,
            paidByUserId: paidByUserId ?? null,
            beneficiaryUserIds: beneficiaryUserIds ?? [],
          });

          if (requestIdRef.current !== currentRequestId) {
            return;
          }

          setSuggestion(result);
        } catch {
          if (requestIdRef.current !== currentRequestId) {
            return;
          }

          setSuggestion(null);
        } finally {
          if (requestIdRef.current === currentRequestId) {
            setIsLoading(false);
          }
        }
      })();
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [
    categoryId,
    enabled,
    parsedRealCost,
    hasRequiredFields,
    title,
    paidByUserId,
    beneficiaryUserIds,
    workspaceId,
  ]);

  return {
    suggestion: resolvedSuggestion,
    isLoading: resolvedIsLoading,
  };
}
