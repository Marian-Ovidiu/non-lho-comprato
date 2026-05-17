import Link from "next/link";
import { Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EntryCard } from "@/src/components/entries/entry-card";
import { EmptyState } from "@/src/components/shared/empty-state";
import {
  WORKSPACE_EMPTY_ENTRIES_DESCRIPTION,
  WORKSPACE_EMPTY_ENTRIES_TITLE,
} from "@/src/components/shared/workspace-empty-entries-copy";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type EntryListProps = {
  entries: Array<{
    id: string;
    title: string;
    category: {
      name: string;
      slug: string;
    };
    date: string;
    realCost: unknown;
    alternativeCost: unknown;
    savedAmount: unknown;
    note: string | null;
    source: string;
    paidByUserId: string;
    beneficiaryUserIds: string[];
  }>;
  members: WorkspaceMemberOption[];
};

export function EntryList({ entries, members }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title={WORKSPACE_EMPTY_ENTRIES_TITLE}
        description={WORKSPACE_EMPTY_ENTRIES_DESCRIPTION}
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
    <div className="space-y-3">
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} members={members} />
      ))}
    </div>
  );
}
