"use client";

import dynamic from "next/dynamic";

const PwaInstallContent = dynamic(
  () =>
    import("@/src/components/pwa/install-button").then(
      (module) => module.PwaInstallContent,
    ),
  {
    ssr: false,
    loading: () => <div className="min-h-11 w-full rounded-2xl bg-surface-muted" />,
  },
);

export { PwaInstallContent };
