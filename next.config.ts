import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

import { shouldUploadSourcemaps } from "./src/lib/sentry";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: shouldUploadSourcemaps(),
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
