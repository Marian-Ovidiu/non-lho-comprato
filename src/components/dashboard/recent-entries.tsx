import Link from "next/link";

import { EntryRow } from "@/src/components/entries/entry-row";

type RecentEntriesProps = {
  entries: Array<{
    id: string;
    title: string;
    category: { name: string; slug?: string | null };
    realCost: unknown;
    alternativeCost: unknown;
    savedAmount: unknown;
    date: string | Date;
    note: string | null;
  }>;
  description?: string;
};

export function RecentEntries({ entries }: RecentEntriesProps) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-surface">
      {/* Section header */}
      <div className="flex items-baseline justify-between px-4 pt-4 pb-0">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ultimi movimenti
          </h3>
          {entries.length > 0 ? (
            <span
              className="font-num text-[11px]"
              style={{ color: "var(--text-3)" }}
            >
              {entries.length}
            </span>
          ) : null}
        </div>
        <Link
          href="/entries"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Vedi tutto
        </Link>
      </div>

      {/* Rows */}
      <div className="px-4">
        {entries.length === 0 ? (
          <div
            className="my-4 rounded-2xl border border-dashed border-border/70 bg-surface-muted/50 px-4 py-5"
            role="status"
          >
            <p className="text-sm font-medium text-foreground">
              Nessun movimento recente
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Aggiungi un movimento per vedere qui gli ultimi segnali.
            </p>
          </div>
        ) : (
          entries.map((entry, index) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              isLast={index === entries.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
