"use client";

import { useWorkspaceLanguage } from "@/src/components/language/language-context";
import { languageToLocale } from "@/src/lib/i18n";
import Link from "next/link";

import { CraftedIcon, Mono, Rule, Serif, type CraftedIconName } from "@/components/crafted";
import { cn } from "@/lib/utils";
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
  saved?: number;
  original?: number;
};

type CraftedEntryRowProps = {
  entry: CraftedEntryRowItem;
  className?: string;
  showDivider?: boolean;
  /** Chiamato all'apertura, per ricordare da quale riga si è usciti. */
  onOpen?: (entryId: string) => void;
};

function formatEUR(
  value: number,
  locale: string,
  options: { sign?: "plus" | "minus" | "none" } = {},
) {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  const sign = options.sign === "plus" ? "+" : options.sign === "minus" ? "−" : "";

  return `${sign}€${formatted}`;
}

function KindBadge({
  tone,
  children,
}: {
  tone: "success" | "accent";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-[var(--r-chip)] border px-2 py-1 text-[9.5px] font-semibold uppercase leading-none tracking-[0.12em]",
        tone === "success"
          ? "border-success/45 text-success"
          : "border-accent/45 text-accent",
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
}: CraftedEntryRowProps) {
  const locale = languageToLocale(useWorkspaceLanguage());
  const isAvoided = entry.kind === "evitata";
  const isComparison = entry.kind === "confronto";

  return (
    <div className={className} id={entryAnchorId(entry.id)}>
      <Link
        href={`/entries/${entry.id}/edit`}
        onClick={() => onOpen?.(entry.id)}
        className="nlc-press grid min-h-16 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-3 outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-[var(--r-control)]",
            entry.kind === "spesa" && "bg-surface-muted text-muted-foreground",
            isAvoided && "bg-success/10 text-success",
            isComparison && "bg-accent/10 text-accent",
          )}
        >
          <CraftedIcon name={entry.icon} size={18} />
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 truncate text-[14.5px] font-medium tracking-[-0.01em]">
              {entry.title}
            </p>
            {isAvoided ? <KindBadge tone="success">Evitata</KindBadge> : null}
            {isComparison ? <KindBadge tone="accent">Confronto</KindBadge> : null}
          </div>
          <p className="mt-1 truncate text-[11px] leading-4 text-ink-3">
            {entry.cat}
            {entry.who ? <> · {entry.who}</> : null}
          </p>
          {entry.note ? (
            <Serif className="mt-0.5 block truncate text-[13px] leading-4 text-muted-foreground">
              &quot;{entry.note}&quot;
            </Serif>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          {isComparison ? (
            <>
              <Mono className="block text-[14px] font-semibold leading-none text-accent">
                {formatEUR(entry.saved ?? 0, locale, { sign: "plus" })}
              </Mono>
              <Mono className="mt-1 block text-[10px] leading-none text-ink-3">
                vs {formatEUR(entry.original ?? entry.amount, locale)}
              </Mono>
            </>
          ) : (
            <Mono
              className={cn(
                "block text-[15px] font-semibold leading-none",
                isAvoided && "text-success",
              )}
            >
              {formatEUR(entry.amount, locale, { sign: isAvoided ? "plus" : "minus" })}
            </Mono>
          )}
        </div>
      </Link>
      {showDivider ? <Rule soft /> : null}
    </div>
  );
}
