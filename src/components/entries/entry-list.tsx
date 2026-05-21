"use client";

import Link from "next/link";
import {
  ArrowDown,
  Inbox,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getEntriesPage } from "@/src/actions/entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntryCard } from "@/src/components/entries/entry-card";
import { EmptyState } from "@/src/components/shared/empty-state";
import {
  WORKSPACE_EMPTY_ENTRIES_DESCRIPTION,
  WORKSPACE_EMPTY_ENTRIES_TITLE,
} from "@/src/components/shared/workspace-empty-entries-copy";
import { formatMoney } from "@/src/lib/formatters";
import {
  formatRomeDateLabel,
  getRomeDateKey,
  shiftRomeDateKey,
} from "@/src/lib/rome-dates";
import type { WorkspaceMemberOption } from "@/src/lib/workspace-members";

type EntryListProps = {
  initialEntries: Array<{
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
  initialNextCursor: string | null;
  initialHasMore: boolean;
  members: WorkspaceMemberOption[];
};

type DayGroup = {
  dateKey: string;
  label: string;
  entries: EntryListProps["initialEntries"];
  totalRealSpent: number;
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;

function getDayLabel(dateKey: string) {
  const todayKey = getRomeDateKey(new Date());
  const yesterdayKey = shiftRomeDateKey(todayKey, -1);

  if (dateKey === todayKey) {
    return "Oggi";
  }

  if (dateKey === yesterdayKey) {
    return "Ieri";
  }

  return formatRomeDateLabel(dateKey);
}

function groupEntries(entries: EntryListProps["initialEntries"]): DayGroup[] {
  const groups: DayGroup[] = [];

  for (const entry of entries) {
    const dateKey = getRomeDateKey(new Date(entry.date));
    const currentGroup = groups.at(-1);

    if (!dateKey) {
      continue;
    }

    if (currentGroup && currentGroup.dateKey === dateKey) {
      currentGroup.entries.push(entry);
      currentGroup.totalRealSpent += Number(entry.realCost) || 0;
      continue;
    }

    groups.push({
      dateKey,
      label: getDayLabel(dateKey),
      entries: [entry],
      totalRealSpent: Number(entry.realCost) || 0,
    });
  }

  return groups;
}

function getDaySummary(group: DayGroup): string {
  const countLabel = group.entries.length === 1 ? "movimento" : "movimenti";
  return `${group.label} - ${group.entries.length} ${countLabel} - ${formatMoney(
    group.totalRealSpent,
  )} spesi`;
}

export function EntryList({
  initialEntries,
  initialNextCursor,
  initialHasMore,
  members,
}: EntryListProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const initialSearchHandledRef = useRef(false);
  const requestIdRef = useRef(0);
  const searchTerm = searchValue.trim();
  const hasSearchTerm = searchTerm.length > 0;

  const groups = useMemo(() => groupEntries(entries), [entries]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchValue(searchValue.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [searchValue]);

  useEffect(() => {
    if (!initialSearchHandledRef.current) {
      initialSearchHandledRef.current = true;
      return;
    }

    const currentRequestId = ++requestIdRef.current;

    async function runSearch() {
      setIsSearching(true);
      setLoadError(null);
      setSearchError(null);

      try {
        const result = await getEntriesPage({
          q: debouncedSearchValue,
          limit: PAGE_SIZE,
        });

        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        setEntries(result.entries);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (error) {
        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        console.error("Failed to search entries:", error);
        setSearchError("Non riesco a cercare i movimenti adesso.");
        setEntries([]);
        setNextCursor(null);
        setHasMore(false);
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsSearching(false);
        }
      }
    }

    void runSearch();
  }, [debouncedSearchValue]);

  async function loadMore() {
    if (!hasMore || !nextCursor) {
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoadError(null);
    setIsLoading(true);

    try {
      const result = await getEntriesPage({
        cursor: nextCursor,
        limit: PAGE_SIZE,
        q: debouncedSearchValue,
      });

      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      setEntries((current) => [...current, ...result.entries]);
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (error) {
      if (requestIdRef.current !== currentRequestId) {
        return;
      }

      console.error("Failed to load more entries:", error);
      setLoadError("Non riesco a caricare altri movimenti adesso.");
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setIsLoading(false);
      }
    }
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-4">
        <SearchBar
          value={searchValue}
          onChange={handleSearchChange}
          isSearching={isSearching}
        />

        {hasSearchTerm && !isSearching ? (
          <EmptyState
            title={searchError ? "Ricerca non disponibile" : "Nessun movimento trovato"}
            description={
              searchError
                ? searchError
                : "Prova con categoria, importo o persona."
            }
            note="Puoi anche svuotare la ricerca e ripartire da tutti i movimenti."
            icon={<Search className="size-5" aria-hidden="true" />}
            action={
              !searchError ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setSearchValue("")}
                >
                  Svuota ricerca
                </Button>
              ) : null
            }
          />
        ) : (
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
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar
        value={searchValue}
        onChange={handleSearchChange}
        isSearching={isSearching}
      />

      {searchError ? (
        <p className="text-sm text-destructive">{searchError}</p>
      ) : null}

      {groups.map((group) => (
        <section key={group.dateKey} className="space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
            <p className="text-sm font-medium leading-5 text-foreground">
              {getDaySummary(group)}
            </p>
          </div>

          <div className="space-y-3">
            {group.entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} members={members} />
            ))}
          </div>
        </section>
      ))}

      <div className="space-y-2">
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : null}

        {hasMore ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-2xl"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Caricamento...
              </>
            ) : (
              <>
                <ArrowDown className="size-4" aria-hidden="true" />
                Carica altri
              </>
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  isSearching,
}: {
  value: string;
  onChange: (value: string) => void;
  isSearching: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Cerca per titolo, categoria, importo o membro"
          className="h-11 rounded-2xl pl-9 pr-9"
          aria-label="Cerca movimenti"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-text transition-colors hover:text-foreground"
            aria-label="Cancella ricerca"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <p className="text-xs text-muted-text">
        {isSearching ? "Ricerca in corso..." : "Cerca nel workspace corrente."}
      </p>
    </div>
  );
}
