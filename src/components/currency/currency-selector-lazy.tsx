"use client";

import dynamic from "next/dynamic";

const CurrencySelector = dynamic(
  () =>
    import("@/src/components/currency/currency-selector").then(
      (module) => module.CurrencySelector,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-6 w-40 rounded bg-surface-muted" />
    ),
  },
);

export { CurrencySelector };
