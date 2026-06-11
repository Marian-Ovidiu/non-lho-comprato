"use client";

import dynamic from "next/dynamic";

const PwaInstallSection = dynamic(
  () =>
    import("@/src/components/pwa/install-button").then(
      (module) => module.PwaInstallSection,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

export { PwaInstallSection };
