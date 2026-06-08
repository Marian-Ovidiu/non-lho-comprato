"use client";

import { useEffect, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";

import { CraftedIcon, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { getAiExpenseExportFilename } from "@/src/lib/ai-export";

type ToastState = {
  kind: "success" | "error";
  message: string;
} | null;

const EXPORT_URL = "/api/exports/ai-analysis";

function getFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;

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

export function CraftedAiAnalysisExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
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

      setToast({ kind: "success", message: "Export completato" });
    } catch {
      setToast({ kind: "error", message: "Export non riuscito" });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <CraftedIcon name="receipt" size={20} className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <Serif className="text-sm text-muted-foreground">
              Export per analisi AI
            </Serif>
            <p className="mt-1 text-xs leading-5 text-ink-3">
              Scarica lo storico del workspace in CSV pronto per analisi.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={isExporting}
          onClick={handleExport}
          className="flex h-11 w-full items-center justify-center gap-2 border border-line text-[14px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileDown className="size-4" aria-hidden="true" />
          )}
          {isExporting ? "Export in corso..." : "Scarica CSV"}
        </button>
      </div>

      {toast ? (
        <div
          className={cn(
            "fixed bottom-4 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 border px-4 py-3 text-sm backdrop-blur",
            toast.kind === "success"
              ? "border-green/30 bg-background text-green"
              : "border-destructive/30 bg-background text-destructive",
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
