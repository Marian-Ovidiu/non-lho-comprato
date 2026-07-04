import Link from "next/link";

import { Label, Mono, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { useBoundLocale } from "@/src/components/language/use-locale-formatters";

type ImportBatchListItem = {
  id: string;
  originalFilename: string | null;
  status: "parsing" | "ready" | "partial" | "completed" | "failed";
  rowCount: number;
  confirmedCount: number;
  duplicateCount: number;
  createdAt: Date;
};

type CraftedImportBatchListProps = {
  batches: ImportBatchListItem[];
};

const STATUS_LABELS: Record<ImportBatchListItem["status"], string> = {
  parsing: "In lettura",
  ready: "Pronto",
  partial: "Parziale",
  completed: "Completato",
  failed: "Errore",
};

const STATUS_CLASSES: Record<ImportBatchListItem["status"], string> = {
  parsing: "border-line bg-surface-muted text-ink-3",
  ready: "border-line bg-background text-foreground",
  partial: "border-warm/20 bg-warm/10 text-warm",
  completed: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  failed: "border-destructive/20 bg-destructive/10 text-destructive",
};

function formatDateBase(locale: string, value: Date): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function CraftedImportBatchList({ batches }: CraftedImportBatchListProps) {
  const formatDate = useBoundLocale(formatDateBase);
  if (batches.length === 0) {
    return (
      <section className="border-y border-line py-5">
        <Label className="mb-2 block">Batch recenti</Label>
        <h2 className="text-lg font-semibold tracking-tight">
          Nessun import ancora
        </h2>
        <Serif className="mt-2 block text-sm text-muted-foreground">
          Carica il primo CSV qui sopra. Dopo l&apos;upload troverai il batch in questa lista.
        </Serif>
      </section>
    );
  }

  return (
    <section className="space-y-3 border-y border-line py-5">
      <Label className="block">Batch recenti</Label>
      <div className="space-y-3">
        {batches.map((batch) => (
          <Link
            key={batch.id}
            href={`/workspace/imports/${batch.id}`}
            className={cn(
              "block rounded-[var(--r-card)] border border-line bg-surface-muted/35 px-4 py-4 transition-colors hover:border-border hover:bg-surface",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold tracking-[-0.02em]">
                  {batch.originalFilename ?? "Import CSV"}
                </h3>
                <Mono className="mt-1 text-[11px] text-muted-foreground">
                  {formatDate(batch.createdAt)}
                </Mono>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
                  STATUS_CLASSES[batch.status],
                )}
              >
                {STATUS_LABELS[batch.status]}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3">Righe</p>
                <p className="mt-1 font-medium">{batch.rowCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3">Confermate</p>
                <p className="mt-1 font-medium">{batch.confirmedCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-ink-3">Duplicate</p>
                <p className="mt-1 font-medium">{batch.duplicateCount}</p>
              </div>
            </div>

            <Serif className="mt-3 block text-sm text-muted-foreground">
              {batch.status === "ready" || batch.status === "parsing"
                ? "Continua"
                : "Apri"}
            </Serif>
          </Link>
        ))}
      </div>
    </section>
  );
}

