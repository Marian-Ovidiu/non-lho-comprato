"use client";

import { useEffect, useRef } from "react";

import { trackPostHogEvent } from "@/src/lib/posthog";

type PostHogEventOnMountProps = {
  eventName:
    | "onboarding_completed"
    | "stats_viewed";
  enabled?: boolean;
};

export function PostHogEventOnMount({
  eventName,
  enabled = true,
}: PostHogEventOnMountProps) {
  const didTrackRef = useRef(false);

  useEffect(() => {
    if (!enabled || didTrackRef.current) {
      return;
    }

    didTrackRef.current = true;
    trackPostHogEvent(eventName);
  }, [enabled, eventName]);

  return null;
}
