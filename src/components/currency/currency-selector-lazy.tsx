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
      <div className="space-y-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-10 rounded bg-surface-muted" />
          ))}
        </div>
        <div className="h-3 w-24 rounded-full bg-surface-muted" />
      </div>
    ),
  },
);

export { CurrencySelector };
