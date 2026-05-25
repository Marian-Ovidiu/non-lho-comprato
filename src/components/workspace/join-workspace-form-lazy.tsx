"use client";

import dynamic from "next/dynamic";

const JoinWorkspaceForm = dynamic(
  () =>
    import("@/src/components/workspace/join-workspace-form").then(
      (module) => module.JoinWorkspaceForm,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3">
        <div className="h-11 rounded-2xl bg-surface-muted" />
        <div className="h-10 rounded-2xl bg-surface-muted" />
      </div>
    ),
  },
);

export { JoinWorkspaceForm };
