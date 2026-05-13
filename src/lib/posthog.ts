"use client";

import posthog, { type PostHogConfig } from "posthog-js";

type PostHogEventName =
  | "onboarding_started"
  | "onboarding_completed"
  | "first_entry_created"
  | "entry_created"
  | "quick_add_opened"
  | "quick_add_saved"
  | "workspace_switched"
  | "stats_viewed"
  | "reflection_note_seen"
  | "pwa_navigation"
  | "invite_created"
  | "invite_accept_started"
  | "invite_accepted";

const POSTHOG_EVENT_NAMES = new Set<PostHogEventName>([
  "onboarding_started",
  "onboarding_completed",
  "first_entry_created",
  "entry_created",
  "quick_add_opened",
  "quick_add_saved",
  "workspace_switched",
  "stats_viewed",
  "reflection_note_seen",
  "pwa_navigation",
  "invite_created",
  "invite_accept_started",
  "invite_accepted",
]);

let initialized = false;

type SafePostHogConfig = Partial<PostHogConfig> & {
  autocapture_opt_out?: boolean;
  disable_session_recording?: boolean;
  capture_pageview?: false | "history_change";
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function isPostHogEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_HOST) &&
    (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "true");
}

function getPostHogConfig(): SafePostHogConfig {
  return {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    autocapture_opt_out: true,
    disable_session_recording: true,
    capture_pageview: false,
    persistence: "localStorage",
  };
}

export function initPostHog() {
  if (!isBrowser() || initialized || !isPostHogEnabled()) {
    return;
  }

  try {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string, getPostHogConfig());
    initialized = true;
  } catch (error) {
    initialized = false;
    if (process.env.NODE_ENV !== "production") {
      console.warn("[posthog] init failed", error);
    }
  }
}

export function identifyPostHogUser(userId?: string | null) {
  if (!isBrowser() || !isPostHogEnabled() || !userId) {
    return;
  }

  try {
    initPostHog();
    posthog.identify(userId);
  } catch {
    // Intentionally ignored. Analytics must never break UX.
  }
}

export function resetPostHog() {
  if (!isBrowser() || !isPostHogEnabled()) {
    return;
  }

  try {
    posthog.reset();
  } catch {
    // Intentionally ignored.
  }
}

export function trackPostHogEvent(
  eventName: PostHogEventName,
  properties?: Record<string, string | number | boolean | null | undefined>,
) {
  if (!isBrowser() || !isPostHogEnabled() || !POSTHOG_EVENT_NAMES.has(eventName)) {
    return;
  }

  try {
    initPostHog();
    posthog.capture(eventName, properties);
  } catch {
    // Intentionally ignored. Analytics must never break UX.
  }
}
