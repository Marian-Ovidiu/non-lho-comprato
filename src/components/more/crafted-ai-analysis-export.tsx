"use client";

import { useEffect, useState } from "react";
import { FileDown, Loader2, Sparkles } from "lucide-react";

import { useTranslations } from "@/src/components/language/language-context";
import { cn } from "@/lib/utils";
import {
  getAiExpenseExportFilename,
  type AiExpenseExportRange,
} from "@/src/lib/ai-export";

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
  const t = useTranslations();
  const exportOptions: Array<{ range: AiExpenseExportRange; label: string }> = [
    { range: "current-month", label: t.aiExport.currentMonthOption },
    { range: "all", label: t.aiExport.allOption },
  ];
  const [exportingRange, setExportingRange] = useState<AiExpenseExportRange | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function handleExport(range: AiExpenseExportRange) {
    setExportingRange(range);

    try {
      const searchParams = new URLSearchParams({ range });
      const response = await fetch(`${EXPORT_URL}?${searchParams.toString()}`, {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Export request failed with ${response.status}`);
      }

      const blob = await response.blob();
      const fileName =
        getFilenameFromContentDisposition(response.headers.get("content-disposition")) ??
        getAiExpenseExportFilename(Intl.DateTimeFormat().resolvedOptions().timeZone, new Date(), range);
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

      setToast({ kind: "success", message: t.aiExport.successToast });
    } catch {
      setToast({ kind: "error", message: t.aiExport.errorToast });
    } finally {
      setExportingRange(null);
    }
  }

  return (
    <>
      <div className="space-y-3.5">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-background text-muted-foreground">
            <Sparkles className="size-[17px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[14.5px] font-semibold leading-5 tracking-[-0.01em]">
              {t.aiExport.title}
            </h3>
            <p className="mt-1 text-[12px] leading-[18px] text-muted-foreground">
              {t.aiExport.description}
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {exportOptions.map((option) => {
            const isCurrentExport = exportingRange === option.range;

            return (
              <button
                key={option.range}
                type="button"
                disabled={exportingRange !== null}
                onClick={() => handleExport(option.range)}
                aria-busy={isCurrentExport}
                className="nlc-press flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--r-control)] border border-line bg-background px-3 text-[13.5px] font-semibold transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCurrentExport ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <FileDown className="size-4" aria-hidden="true" />
                )}
                {isCurrentExport ? t.aiExport.exportingButton : option.label}
              </button>
            );
          })}
        </div>
      </div>

      {toast ? (
        <div
          className={cn(
            "fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-[var(--r-control)] border bg-background px-4 py-3 text-sm shadow-[var(--shadow-pop)] md:bottom-4",
            toast.kind === "success"
              ? "border-nlc-under/30 text-nlc-under"
              : "border-nlc-over/30 text-nlc-over",
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
