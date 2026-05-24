"use client";

import { useEffect, useState } from "react";
import { FileDown, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getAiExpenseExportFilename } from "@/src/lib/ai-export";

type ToastState = {
  kind: "success" | "error";
  message: string;
} | null;

const EXPORT_URL = "/api/exports/ai-analysis";

function getFilenameFromContentDisposition(
  header: string | null,
): string | null {
  if (!header) {
    return null;
  }

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ?? null;
}

export function AiAnalysisExportCard() {
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function handleExport() {
    setIsExporting(true);

    try {
      const response = await fetch(EXPORT_URL, {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Export request failed with ${response.status}`);
      }

      const blob = await response.blob();
      const fileName =
        getFilenameFromContentDisposition(response.headers.get("content-disposition")) ??
        getAiExpenseExportFilename();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);

      setToast({ kind: "success", message: "Export completed" });
    } catch {
      setToast({ kind: "error", message: "Export failed" });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <Card className="overflow-hidden border-border shadow-sm dark:border-border">
        <CardHeader className="space-y-3 p-4 pb-0 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-background dark:bg-surface dark:text-foreground">
              <Sparkles className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base text-foreground dark:text-foreground">
                Export for AI Analysis
              </CardTitle>
              <p className="text-sm leading-6 text-muted-text dark:text-muted-text">
                Scarica tutto lo storico del workspace in un CSV pronto per analisi
                AI.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-4 sm:p-5 sm:pt-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-center rounded-2xl px-4"
            disabled={isExporting}
            onClick={handleExport}
          >
            {isExporting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="size-4" aria-hidden="true" />
                Export for AI Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {toast ? (
        <div
          className={cn(
            "fixed bottom-4 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur",
            toast.kind === "success"
              ? "border-emerald-500/30 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-50"
              : "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20 dark:text-destructive-foreground",
          )}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}

