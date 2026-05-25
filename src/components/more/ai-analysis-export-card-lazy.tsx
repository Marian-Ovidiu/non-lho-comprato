"use client";

import dynamic from "next/dynamic";

const AiAnalysisExportCard = dynamic(
  () =>
    import("@/src/components/more/ai-analysis-export-card").then(
      (module) => module.AiAnalysisExportCard,
    ),
  {
    ssr: false,
    loading: () => <div className="h-10 w-full rounded-2xl bg-surface-muted" />,
  },
);

export { AiAnalysisExportCard };
