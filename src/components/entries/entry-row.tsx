import { formatDate, formatMoney } from "@/src/lib/formatters";
import { getCategoryEmoji } from "@/src/lib/visual-cues";

type EntryRowProps = {
  entry: {
    title: string;
    category: { name: string; slug?: string | null };
    date: string | Date;
    savedAmount: unknown;
    alternativeCost: unknown;
  };
  isLast?: boolean;
};

export function EntryRow({ entry, isLast = false }: EntryRowProps) {
  const emoji = getCategoryEmoji(entry.category);
  const saved = Number(entry.savedAmount);
  const alt = Number(entry.alternativeCost);

  return (
    <div
      className={`flex items-center gap-3.5 py-3.5${
        isLast ? "" : " border-b border-border"
      }`}
    >
      {/* Category disc */}
      <div
        className="flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-[21px]"
        style={{ width: 42, height: 42 }}
        aria-hidden="true"
      >
        {emoji}
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium leading-snug tracking-[-0.01em] text-foreground">
          {entry.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {entry.category.name}
          {" · "}
          {formatDate(entry.date)}
        </p>
      </div>

      {/* Amounts */}
      <div className="shrink-0 text-right">
        <p className="font-num text-[15px] font-semibold leading-snug tracking-[-0.02em] text-accent">
          +{formatMoney(Math.abs(saved))}
        </p>
        {alt > 0 && alt !== saved ? (
          <p
            className="font-num mt-0.5 text-[11px] leading-none"
            style={{ color: "var(--text-3)", textDecoration: "line-through" }}
          >
            {formatMoney(alt)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
