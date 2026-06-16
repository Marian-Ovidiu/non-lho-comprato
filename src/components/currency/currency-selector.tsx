"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateWorkspaceCurrencyAction } from "@/src/actions/workspace";
import { SUPPORTED_CURRENCIES } from "@/src/lib/workspace-currency";
import { useCurrencyCode } from "@/src/components/currency/currency-context";
import { useTranslations } from "@/src/components/language/language-context";

export function CurrencySelector() {
  const t = useTranslations();
  const currentCode = useCurrencyCode();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const code = event.target.value;
    if (code === currentCode) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("currency", code);
      await updateWorkspaceCurrencyAction(formData);
      router.refresh();
    });
  }

  return (
    <select
      value={currentCode}
      onChange={handleChange}
      disabled={pending}
      aria-label={t.workspace.currencyAriaLabel}
      className="w-full bg-transparent text-[15px] text-foreground outline-none disabled:opacity-50"
    >
      {SUPPORTED_CURRENCIES.map((currency) => (
        <option key={currency.code} value={currency.code}>
          {currency.symbol} {currency.name} ({currency.code})
        </option>
      ))}
    </select>
  );
}
