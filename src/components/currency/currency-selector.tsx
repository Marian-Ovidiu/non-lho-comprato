"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateWorkspaceCurrencyAction } from "@/src/actions/workspace";
import { SUPPORTED_CURRENCIES } from "@/src/lib/workspace-currency";
import { useCurrencyCode } from "@/src/components/currency/currency-context";
import { cn } from "@/lib/utils";

export function CurrencySelector() {
  const currentCode = useCurrencyCode();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(code: string) {
    if (code === currentCode) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("currency", code);
      await updateWorkspaceCurrencyAction(formData);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Valuta" className="flex flex-wrap gap-x-5 gap-y-2">
        {SUPPORTED_CURRENCIES.map((currency) => {
          const active = currency.code === currentCode;
          return (
            <button
              key={currency.code}
              type="button"
              disabled={pending}
              onClick={() => handleChange(currency.code)}
              aria-pressed={active}
              className={cn(
                "border-b-[1.5px] pb-2 text-[13px] transition-colors disabled:opacity-50",
                active
                  ? "border-accent font-semibold text-foreground"
                  : "border-transparent font-[450] text-ink-3 hover:text-foreground",
              )}
            >
              {currency.code}
              <span className="ml-1 opacity-60">{currency.symbol}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink-3">
        {SUPPORTED_CURRENCIES.find((c) => c.code === currentCode)?.name ?? currentCode}
      </p>
    </div>
  );
}
