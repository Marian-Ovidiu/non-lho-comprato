"use client";

import dynamic from "next/dynamic";

const GenerateInviteButton = dynamic(
  () =>
    import("@/src/components/workspace/generate-invite-button").then(
      (module) => module.GenerateInviteButton,
    ),
  {
    ssr: false,
    loading: () => <div className="h-10 w-full rounded-2xl bg-surface-muted" />,
  },
);

export { GenerateInviteButton };
