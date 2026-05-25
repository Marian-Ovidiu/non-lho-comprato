"use client";

import dynamic from "next/dynamic";

const ThemeSelector = dynamic(
  () =>
    import("@/src/components/theme/theme-toggle").then(
      (module) => module.ThemeSelector,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        <div className="grid h-[44px] grid-cols-3 rounded-2xl border border-border bg-surface p-1 shadow-sm">
          <div className="rounded-xl bg-surface-muted" />
          <div className="rounded-xl bg-surface-muted" />
          <div className="rounded-xl bg-surface-muted" />
        </div>
        <div className="h-4 w-44 rounded-full bg-surface-muted" />
      </div>
    ),
  },
);

export { ThemeSelector };
