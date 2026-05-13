"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { isSentryEnabled } from "@/src/lib/sentry";

type ErrorProps = {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
};

export default function Error({ error, unstable_retry, reset }: ErrorProps) {
  const retry = unstable_retry ?? reset ?? (() => undefined);

  useEffect(() => {
    if (isSentryEnabled()) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center gap-4 px-6 py-10 sm:px-8">
      <div className="max-w-md space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Si è verificato un errore</h2>
        <p className="text-sm text-muted-foreground">
          Riprova tra un momento. Se il problema continua, l&apos;errore è già stato registrato per la diagnosi.
        </p>
      </div>
      <button
        type="button"
        onClick={() => retry()}
        className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        Riprova
      </button>
    </div>
  );
}
