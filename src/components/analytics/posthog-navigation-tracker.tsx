"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";

import { identifyPostHogUser, trackPostHogEvent } from "@/src/lib/posthog";

type PostHogNavigationTrackerProps = {
  userId?: string | null;
};

function getScreenName(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname === "/entries") return "entries";
  if (pathname === "/entries/new") return "entry_new";
  if (pathname.startsWith("/entries/") && pathname.endsWith("/edit")) return "entry_edit";
  if (pathname === "/goals") return "goals";
  if (pathname === "/habits") return "habits";
  if (pathname === "/stats") return "stats";
  if (pathname === "/insights") return "insights";
  if (pathname === "/more") return "more";
  if (pathname === "/login") return "login";
  if (pathname === "/onboarding") return "onboarding";
  if (pathname === "/reports/monthly") return "reports_monthly";
  return "other";
}

export function PostHogNavigationTracker({ userId }: PostHogNavigationTrackerProps) {
  const pathname = usePathname();
  const didIdentifyRef = useRef(false);
  const screenName = useMemo(() => getScreenName(pathname), [pathname]);

  useEffect(() => {
    if (userId && !didIdentifyRef.current) {
      didIdentifyRef.current = true;
      identifyPostHogUser(userId);
    }
  }, [userId]);

  useEffect(() => {
    trackPostHogEvent("pwa_navigation", { screen: screenName });
  }, [screenName]);

  return null;
}
