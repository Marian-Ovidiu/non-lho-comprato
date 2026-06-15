"use client";

import dynamic from "next/dynamic";

const PostHogNavigationTracker = dynamic(
  () =>
    import("@/src/components/analytics/posthog-navigation-tracker").then(
      (m) => ({ default: m.PostHogNavigationTracker }),
    ),
  { ssr: false },
);

type Props = {
  userId?: string | null;
};

export function PostHogNavigationTrackerLoader({ userId }: Props) {
  return <PostHogNavigationTracker userId={userId} />;
}
