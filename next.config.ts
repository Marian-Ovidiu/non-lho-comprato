import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

import { shouldUploadSourcemaps } from "./src/lib/sentry";

const isProduction = process.env.NODE_ENV === "production";

const allowedDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? ["192.168.1.46:3000"];

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function getOrigin(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getWebsocketOrigin(origin: string | null) {
  if (!origin) {
    return null;
  }

  if (origin.startsWith("https://")) {
    return origin.replace("https://", "wss://");
  }

  if (origin.startsWith("http://")) {
    return origin.replace("http://", "ws://");
  }

  return null;
}

// posthog-js fetches its remote config and lazy-loaded features (session
// replay, surveys) from the region assets host, e.g. eu.i.posthog.com →
// eu-assets.i.posthog.com. Without it in script-src/connect-src the browser
// blocks the loads and analytics degrade silently.
function getPosthogAssetsOrigin(origin: string | null) {
  if (!origin) {
    return null;
  }

  const match = origin.match(/^https:\/\/(eu|us)\.i\.posthog\.com$/);

  if (!match) {
    return null;
  }

  return `https://${match[1]}-assets.i.posthog.com`;
}

function buildContentSecurityPolicy() {
  const supabaseOrigin = getOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseRealtimeOrigin = getWebsocketOrigin(supabaseOrigin);
  const posthogOrigin = getOrigin(process.env.NEXT_PUBLIC_POSTHOG_HOST);
  const posthogAssetsOrigin = getPosthogAssetsOrigin(posthogOrigin);
  const sentryOrigin = getOrigin(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const connectSrc = unique([
    "'self'",
    supabaseOrigin,
    supabaseRealtimeOrigin,
    posthogOrigin,
    posthogAssetsOrigin,
    sentryOrigin,
    isProduction ? null : "ws:",
    isProduction ? null : "http://localhost:*",
    isProduction ? null : "http://127.0.0.1:*",
  ]);
  // 'unsafe-inline' stays until Next supports per-request nonces together
  // with cacheComponents/PPR: the prerendered shells embed build-time inline
  // framework scripts that cannot carry a nonce, so a nonce-based policy
  // breaks hydration in production (verified 2026-07: $RC undefined, React
  // #419). Revisit when the framework closes that gap.
  const scriptSrc = unique([
    "'self'",
    "'unsafe-inline'",
    posthogAssetsOrigin,
    isProduction ? null : "'unsafe-eval'",
  ]);

  return [
    ["default-src", "'self'"],
    ["base-uri", "'self'"],
    ["child-src", "'self' blob:"],
    ["connect-src", connectSrc.join(" ")],
    ["font-src", "'self' data:"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ["img-src", "'self' data: blob: https:"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["script-src", scriptSrc.join(" ")],
    ["style-src", "'self' 'unsafe-inline'"],
    ["worker-src", "'self' blob:"],
    isProduction ? ["upgrade-insecure-requests", ""] : null,
  ]
    .filter((directive): directive is [string, string] => Boolean(directive))
    .map(([key, value]) => `${key}${value ? ` ${value}` : ""}`)
    .join("; ");
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy(),
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  productionBrowserSourceMaps: shouldUploadSourcemaps(),
  cacheComponents: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  debug: false,
  telemetry: false,
  suppressOnRouterTransitionStartWarning: true,
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeTracing: true,
  },
  sourcemaps: {
    disable: !shouldUploadSourcemaps(),
    deleteSourcemapsAfterUpload: shouldUploadSourcemaps(),
  },
});
