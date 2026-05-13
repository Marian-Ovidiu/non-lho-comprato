"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { isSentryEnabled } from "@/src/lib/sentry";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
};

export default function GlobalError({ error, unstable_retry, reset }: GlobalErrorProps) {
  const retry = unstable_retry ?? reset ?? (() => undefined);

  useEffect(() => {
    if (isSentryEnabled()) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          background: "#111111",
          color: "#f4f1ea",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div style={{ maxWidth: "28rem" }}>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, letterSpacing: 0 }}>Si è verificato un errore</h1>
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.9375rem", lineHeight: 1.5, color: "rgba(244, 241, 234, 0.76)" }}>
              L&apos;app non è riuscita a completare il caricamento. Puoi riprovare in sicurezza.
            </p>
            <button
              type="button"
              onClick={() => retry()}
              style={{
                marginTop: "1rem",
                height: "40px",
                borderRadius: "8px",
                border: "1px solid rgba(244, 241, 234, 0.2)",
                background: "transparent",
                color: "inherit",
                padding: "0 16px",
                fontSize: "0.9375rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Riprova
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
