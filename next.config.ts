import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

import { shouldUploadSourcemaps } from "./src/lib/sentry";

const allowedDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? ["192.168.1.46:3000"];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  productionBrowserSourceMaps: shouldUploadSourcemaps(),
  cacheComponents: true,
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
