"use client";

import Link from "next/link";

import { Amount, CraftedIcon, Serif, type CraftedIconName } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/src/components/language/language-context";
import { entryAnchorId } from "@/src/features/entries/list-position";

export type EntryKind = "spesa" | "evitata" | "confronto";

export type CraftedEntryRowItem = {
  id: string;
  title: string;
  note: string | null;
  cat: string;
  icon: CraftedIconName;
  amount: number;
  kind: EntryKind;
  who?: string | null;
  /** Quanto sarebbe costata l'alternativa, sui movimenti con confronto. */
  original?: number;
};

type CraftedEntryRowProps = {
  entry: CraftedEntryRowItem;
  className?: string;
  showDivider?: boolean;
  /** Chiamato all'apertura, per ricordare da quale riga si è usciti. */
  onOpen?: (entryId: string) => void;
  /** Percorso a cui il movimento deve riportare, mese selezionato incluso. */
  returnTo?: string;
};

/**
 * Marcatore di tipo. Non è più un chip con il bordo: a duecento righe, settanta
 * riquadri colorati sono coriandoli. È una parola in maiuscoletto sulla riga
 * dei dettagli — dove sta il resto di ciò che *qualifica* il movimento — e il
 * colore ce l'ha solo "Evitata", perché è l'unica delle due che dice una cosa
 * sui soldi (non sono usciti). "Confronto" dice una cosa sul modo in cui il
 * movimento è stato registrato: è inchiostro, non colore.
 */
function KindMark({ tone, children }: { tone: "avoided" | "neutral"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "nlc-eyebrow shrink-0 [--fs-label:10px]",
        tone === "avoided"
          ? "[--eyebrow-ink:var(--avoided-ink)]"
          : "[--eyebrow-ink:var(--ink-3)]",
      )}
    >
      {children}
    </span>
  );
}

export function CraftedEntryRow({
  entry,
  className,
  showDivider = true,
  onOpen,
  returnTo,
}: CraftedEntryRowProps) {
  const t = useTranslations();
  const isAvoided = entry.kind === "evitata";
  const isComparison = entry.kind === "confronto";

  return (
    <div className={className} id={entryAnchorId(entry.id)}>
      <Link
        href={
          returnTo
            ? `/entries/${entry.id}/edit?returnTo=${encodeURIComponent(returnTo)}`
            : `/entries/${entry.id}/edit`
        }
        onClick={() => onOpen?.(entry.id)}
        className={cn(
          "nlc-press grid min-h-16 grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          // Il filetto è un bordo della riga, non un elemento in più: su
          // duecento movimenti sono duecento nodi risparmiati.
          showDivider && "border-b border-line-soft",
        )}
      >
        <span
          className={cn(
            "flex size-[38px] items-center justify-center rounded-[var(--r-control)] border",
            isAvoided
              ? "border-transparent bg-[color-mix(in_srgb,var(--avoided-ink)_16%,transparent)] text-[var(--avoided-ink)]"
              : "border-line-soft bg-foreground/[0.045] text-muted-foreground",
          )}
        >
          <CraftedIcon name={entry.icon} size={17} />
        </span>

        <div className="min-w-0">
          {/* Il titolo ha la riga tutta per sé: a 360px è la prima cosa che si
              tronca, ed è la sola per cui l'utente sta scorrendo. */}
          <p className="truncate text-[15px] font-medium leading-5 tracking-[-0.01em]">
            {entry.title}
          </p>
          <p className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-[11px] leading-4 text-ink-3">
            {isAvoided ? (
              <KindMark tone="avoided">{t.entries.avoidedBadge}</KindMark>
            ) : null}
            {isComparison ? (
              <KindMark tone="neutral">{t.entries.comparisonBadge}</KindMark>
            ) : null}
            <span className="min-w-0 truncate">
              {entry.cat}
              {entry.who ? <> · {entry.who}</> : null}
            </span>
          </p>
          {entry.note ? (
            <Serif className="mt-1 block truncate text-[13px] leading-4 text-muted-foreground">
              &quot;{entry.note}&quot;
            </Serif>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          {/* La colonna dei soldi dice sempre la stessa cosa: quanto è successo
              a questo movimento. Su un confronto è quanto è uscito davvero —
              altrimenti la colonna non somma con il totale del giorno, e in un
              registro una colonna che non somma è un errore. */}
          <Amount
            value={entry.amount}
            sign={isAvoided ? "plus" : "none"}
            className={cn(
              "block text-[15px] font-semibold",
              isAvoided && "text-[var(--avoided-ink)]",
            )}
          />
          {isComparison && entry.original ? (
            <span className="mt-1 block text-[11px] leading-none text-ink-3">
              {t.entries.insteadOf}{" "}
              <Amount value={entry.original} className="text-[11px]" />
            </span>
          ) : null}
        </div>
      </Link>
    </div>
  );
}
