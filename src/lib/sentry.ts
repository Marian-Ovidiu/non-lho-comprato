import type { ErrorEvent } from "@sentry/nextjs";

function hasSentryDsn() {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function isSentryEnabled() {
  return hasSentryDsn() && (process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true");
}

export function shouldUploadSourcemaps() {
  return Boolean(process.env.SENTRY_ORG && process.env.SENTRY_PROJECT && process.env.SENTRY_AUTH_TOKEN);
}

function stripQueryAndHash(value: string) {
  try {
    const parsedUrl = new URL(value, "http://sentry.local");
    return parsedUrl.pathname;
  } catch {
    return value.split("?")[0]?.split("#")[0] ?? value;
  }
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent | null {
  const sanitizedEvent: ErrorEvent = {
    ...event,
  };

  sanitizedEvent.user = undefined;

  if (sanitizedEvent.request) {
    const request = { ...(sanitizedEvent.request as Record<string, unknown>) };

    for (const key of ["data", "headers", "cookies", "query_string"]) {
      delete request[key];
    }

    for (const key of ["url", "path"]) {
      const value = request[key];
      if (typeof value === "string") {
        request[key] = stripQueryAndHash(value);
      }
    }

    sanitizedEvent.request = request as ErrorEvent["request"];
  }

  if (sanitizedEvent.breadcrumbs) {
    sanitizedEvent.breadcrumbs = sanitizedEvent.breadcrumbs.map((breadcrumb) => {
      const sanitizedBreadcrumb = {
        ...breadcrumb,
      };

      if (sanitizedBreadcrumb.data && typeof sanitizedBreadcrumb.data === "object") {
        const data = { ...(sanitizedBreadcrumb.data as Record<string, unknown>) };

        for (const key of ["url", "href", "path"]) {
          const value = data[key];
          if (typeof value === "string") {
            data[key] = stripQueryAndHash(value);
          }
        }

        delete data.body;
        delete data.headers;
        delete data.request;
        delete data.response;
        delete data.query;
        sanitizedBreadcrumb.data = data;
      }

      return sanitizedBreadcrumb;
    });
  }

  return sanitizedEvent;
}

export function getSentryInitOptions() {
  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: isSentryEnabled(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    debug: false,
    sendDefaultPii: false,
    beforeSend: sanitizeSentryEvent,
  };
}
