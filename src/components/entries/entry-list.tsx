import Link from "next/link";
import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EntryCard } from "@/src/components/entries/entry-card";
import { EmptyState } from "@/src/components/shared/empty-state";

type EntryListProps = {
  entries: Array<{
    id: string;
    title: string;
    category: {
      name: string;
      slug: string;
    };
    date: Date;
    realCost: unknown;
    alternativeCost: unknown;
    savedAmount: unknown;
    note: string | null;
    source: string;
  }>;
};

export function EntryList({ entries }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Nessun movimento ancora"
        description="Quando aggiungi il primo movimento, lo troverai qui con data, categoria e risparmio."
        note="È il posto giusto per tenere tutto ordinato, senza complicazioni."
        icon={<Inbox className="size-5" aria-hidden="true" />}
        action={
          <Button asChild className="w-full sm:w-auto">
            <Link href="/entries/new">Aggiungi movimento</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
