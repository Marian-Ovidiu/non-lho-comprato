"use client";

import { cn } from "@/lib/utils";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useWorkspaceLanguage } from "@/src/components/language/language-context";
import { languageToLocale } from "@/src/lib/i18n";

type AmountProps = {
  value: number;
  /** Di norma arriva dal workspace: si passa solo dove è già stato risolto. */
  currencySymbol?: string;
  decimals?: boolean;
  /**
   * Il segno si mette solo dove è un'eccezione da leggere (una spesa evitata
   * dentro una colonna di spese). Su una colonna in cui *tutto* è denaro
   * uscito, il meno è la cosa che ogni riga ha in comune: non informa.
   */
  sign?: "none" | "plus";
  className?: string;
};

/**
 * L'importo dell'app: unico. Gerarchia interna — simbolo di valuta e centesimi
 * arretrano di corpo e di colore, gli euro comandano. I centesimi restano,
 * perché su un'app di soldi "circa" non è una risposta.
 *
 * Vive qui e non nella dashboard perché due modi di scrivere i soldi nella
 * stessa app sono uno di troppo: l'elenco movimenti usa questo stesso oggetto.
 */
export function Amount({
  value,
  currencySymbol,
  decimals = true,
  sign = "none",
  className,
}: AmountProps) {
  const workspaceCurrencySymbol = useCurrencySymbol();
  const symbol = currencySymbol ?? workspaceCurrencySymbol;
  const language = useWorkspaceLanguage();
  const locale = languageToLocale(language);
  const parts = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).formatToParts(Math.abs(value));
  const integer = parts
    .filter((part) => part.type !== "decimal" && part.type !== "fraction")
    .map((part) => part.value)
    .join("");
  const decimalSeparator = parts.find((part) => part.type === "decimal")?.value;
  const fraction = parts.find((part) => part.type === "fraction")?.value;

  return (
    <span className={cn("nlc-amount", className)}>
      {sign === "plus" ? "+" : null}
      <span className="nlc-currency">{symbol}</span>
      {integer}
      {fraction ? (
        <span className="nlc-cents">
          {decimalSeparator}
          {fraction}
        </span>
      ) : null}
    </span>
  );
}
