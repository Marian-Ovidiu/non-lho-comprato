import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";

import { CraftedIcon, Mono, Rule } from "@/components/crafted";
import { formatCraftedEntryAmount } from "@/src/lib/crafted-money";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { formatDate } from "@/src/lib/formatters";

type CraftedEntryRowProps = {
  entry: {
    id: string;
    title: string;
    category: {
      name: string;
      slug?: string | null;
    };
    date: string | Date;
    savedAmount: unknown;
  };
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

export function CraftedEntryRow({
  entry,
  showDivider = true,
}: CraftedEntryRowProps) {
  return (
    <div>
      <Link
        href={`/entries/${entry.id}/edit`}
        className="flex items-center gap-4 py-3.5 transition-opacity hover:opacity-80"
      >
        <CraftedIcon
          name={getCategoryCraftedIcon(entry.category)}
          size={20}
          className="shrink-0 text-muted-foreground"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-[450]">{entry.title}</p>
          <Mono className="mt-0.5 block text-[11px] tracking-[0.02em] text-ink-3">
            {formatEntryMeta(entry.date, entry.category.name)}
          </Mono>
        </div>
        <Mono className="shrink-0 whitespace-nowrap text-[15px] font-medium">
          {formatCraftedEntryAmount(entry.savedAmount)}
          <span className="text-[11px] text-accent">€</span>
        </Mono>
      </Link>
      {showDivider ? <Rule soft /> : null}
    </div>
  );
}
