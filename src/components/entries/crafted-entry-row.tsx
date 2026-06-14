import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";

import { CraftedIcon, Mono, Rule } from "@/components/crafted";
import { formatCraftedEntryAmount } from "@/src/lib/crafted-money";
import { calculateEntryMetrics } from "@/src/lib/entry-metrics";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { formatDate } from "@/src/lib/formatters";
import { cn } from "@/lib/utils";

type CraftedEntryRowProps = {
  entry: {
    id: string;
    title: string;
    category: {
      name: string;
      slug?: string | null;
    };
    date: string | Date;
    mode?: "spent" | "avoided";
    savingContext?: "none" | "comparison";
    realCost: unknown;
    alternativeCost?: unknown;
    savedAmount: unknown;
  };
  className?: string;
  showDivider?: boolean;
};

function formatEntryMeta(date: string | Date, categoryName: string) {
  const parsedDate = new Date(date);
  const daysAgo = differenceInCalendarDays(new Date(), parsedDate);

  if (daysAgo === 0) {
    const time = new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    }).format(parsedDate);
    return `${categoryName} · ${time}`;
  }

  if (daysAgo === 1) {
    return `${categoryName} · ieri`;
  }

  return `${categoryName} · ${formatDate(parsedDate)}`;
}

function toFiniteNumber(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function getSecondaryMeta(entry: CraftedEntryRowProps["entry"]) {
  const mode = entry.mode === "avoided" ? "avoided" : "spent";
  const savingContext =
    entry.savingContext === "comparison" ? "comparison" : "none";
  const savedAmount = calculateEntryMetrics(entry).netImpact;
  const alternativeCost = toFiniteNumber(entry.alternativeCost);

  if (mode === "avoided") {
    return {
      badge: "Evitata",
      detail: `${formatCraftedEntryAmount(alternativeCost)}€ non comprati`,
      tone: "accent" as const,
    };
  }

  if (savingContext === "comparison") {
    if (savedAmount > 0) {
      return {
        badge: "Confronto",
        detail: `${formatCraftedEntryAmount(savedAmount)}€ risparmiati scegliendo meglio`,
        tone: "accent" as const,
      };
    }

    if (savedAmount < 0) {
      return {
        badge: "Confronto",
        detail: `${formatCraftedEntryAmount(Math.abs(savedAmount))}€ spesi in più del confronto`,
        tone: "default" as const,
      };
    }

    return {
      badge: "Confronto",
      detail: "In linea con il confronto",
      tone: "muted" as const,
    };
  }

  return null;
}

export function CraftedEntryRow({
  entry,
  className,
  showDivider = true,
}: CraftedEntryRowProps) {
  const meta = getSecondaryMeta(entry);

  return (
    <div className={className}>
      <Link
        href={`/entries/${entry.id}/edit`}
        className="nlc-press flex min-h-12 items-center gap-4 py-[var(--sp-row-y)] outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <CraftedIcon
          name={getCategoryCraftedIcon(entry.category)}
          size={20}
          className="shrink-0 text-muted-foreground"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-[450]">{entry.title}</p>
          <Mono className="mt-0.5 block text-[11px] leading-4 tracking-[0.02em] text-ink-3">
            {formatEntryMeta(entry.date, entry.category.name)}
          </Mono>
          {meta ? (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={cn(
                  "rounded-full border px-[9px] py-[3px] text-[10px] font-medium uppercase leading-none tracking-[0.12em]",
                  meta.tone === "accent"
                    ? "border-accent/30 text-accent"
                    : meta.tone === "muted"
                      ? "border-line text-ink-3"
                      : "border-border text-foreground",
                )}
              >
                {meta.badge}
              </span>
              <Mono
                className={cn(
                  "basis-full text-[11px] leading-4 sm:basis-auto",
                  meta.tone === "accent" ? "text-accent" : "text-ink-3",
                )}
              >
                {meta.detail}
              </Mono>
            </div>
          ) : null}
        </div>
        <Mono className="shrink-0 whitespace-nowrap text-[15px] font-medium">
          {formatCraftedEntryAmount(entry.realCost)}
          <span className="align-baseline text-[11px] text-accent">€</span>
        </Mono>
      </Link>
      {showDivider ? <Rule soft /> : null}
    </div>
  );
}
