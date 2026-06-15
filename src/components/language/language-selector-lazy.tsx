"use client";

import dynamic from "next/dynamic";

const LanguageSelector = dynamic(
  () =>
    import("@/src/components/language/language-selector").then(
      (module) => module.LanguageSelector,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        <div className="flex gap-5">
          <div className="h-7 w-16 rounded bg-surface-muted" />
          <div className="h-7 w-16 rounded bg-surface-muted" />
        </div>
        <div className="h-3 w-20 rounded-full bg-surface-muted" />
      </div>
    ),
  },
);

export { LanguageSelector };
