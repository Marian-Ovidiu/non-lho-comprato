"use client";

import Link from "next/link";
import { Loader2, Receipt, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Label, Mono, Rule, Serif } from "@/components/crafted";
import { getEntriesPage } from "@/src/actions/entries";
import {
  CraftedEntryRow,
  type CraftedEntryRowItem,
  type EntryKind,
} from "@/src/components/entries/crafted-entry-row";
import { Button } from "@/components/ui/button";
import { calculateEntryMetrics } from "@/src/lib/entry-metrics";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { getDateKey, shiftDateKey } from "@/src/lib/workspace-dates";
import { cn } from "@/lib/utils";
import { useTranslations, useWorkspaceLanguage } from "@/src/components/language/language-context";
import { languageToLocale } from "@/src/lib/i18n";
import { getLocalizedCategoryName } from "@/src/lib/category-locale";

type EntryItem = {
  id: string;
  title: string;
  category: {
    name: string;
    slug: string;
  };
  date: string;
  mode?: "spent" | "avoided";
  savingContext?: "none" | "comparison";
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
  amountSpent?: unknown;
  comparisonAmount?: unknown;
  savingImpact?: unknown;
  note: string | null;
  source: string;
  paidByUserId: string;
  paidByLabel?: string | null;
  beneficiaryUserIds: string[];
  createdAt?: string;
};

type KindFilter = {
  id: EntryKind | "all";
  label: string;
};

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type CraftedEntryListProps = {
  initialEntries: EntryItem[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  newEntryHref: string;
  monthLabel: string;
  monthKey: string;
  categories?: CategoryOption[];
  previousMonthSummary?: {
    label: string;
    totalRealSpent: number;
    totalSaved: number;
    entriesCount: number;
  } | null;
};

type DayGroupData = {
  dateKey: string;
  label: string;
  relative: string | null;
  count: number;
  dayTotal: number;
  entries: CraftedEntryRowItem[];
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;
const RECENT_ENTRY_HIGHLIGHT_MS = 2_000;

function formatEUR(value: number, locale: string) {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  return `€${formatted}`;
}

function getEntryKind(entry: EntryItem): EntryKind {
  const metrics = calculateEntryMetrics(entry);

  if (metrics.mode === "avoided") {
    return "evitata";
  }

  if (metrics.isComparisonEntry) {
    return "confronto";
  }

  return "spesa";
}

function toRowEntry(entry: EntryItem, locale: string, language: string): CraftedEntryRowItem {
  const metrics = calculateEntryMetrics(entry);
  const kind = getEntryKind(entry);
  const categoryName =
    getLocalizedCategoryName(entry.category.slug, language) ?? entry.category.name;

  return {
    id: entry.id,
    title: entry.title,
    note: entry.note,
    cat: categoryName,
    icon: getCategoryCraftedIcon(entry.category),
    amount: kind === "evitata" ? metrics.avoidedAmount : metrics.spentReal,
    kind,
    who: entry.paidByLabel,
    saved: metrics.comparisonSaved,
    original: metrics.wouldHaveSpent,
  };
}

function parseDateKey(dateKey: string) {
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  return {
    year: Number(yearPart),
    month: Number(monthPart),
    day: Number(dayPart),
  };
}

function getDayLabel(dateKey: string, locale: string) {
  const { year, month, day } = parseDateKey(dateKey);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return dateKey;
  }

  const formatted = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getRelativeLabel(dateKey: string) {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayKey = getDateKey(new Date(), browserTz);
  const yesterdayKey = shiftDateKey(todayKey, -1);

  if (dateKey === todayKey) {
    return "oggi";
  }

  if (dateKey === yesterdayKey) {
    return "ieri";
  }

  return null;
}

function groupByDay(
  entries: EntryItem[],
  locale: string,
  language: string,
): DayGroupData[] {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const groups = new Map<string, DayGroupData>();

  for (const entry of entries) {
    const dateKey = getDateKey(new Date(entry.date), browserTz);
    const rowEntry = toRowEntry(entry, locale, language);
    const existing = groups.get(dateKey);
    const dayTotal = rowEntry.kind === "spesa" ? rowEntry.amount : 0;

    if (existing) {
      existing.entries.push(rowEntry);
      existing.count += 1;
      existing.dayTotal += dayTotal;
      continue;
    }

    groups.set(dateKey, {
      dateKey,
      label: getDayLabel(dateKey, locale),
      relative: getRelativeLabel(dateKey),
      count: 1,
      dayTotal,
      entries: [rowEntry],
    });
  }

  return [...groups.values()].sort((left, right) =>
    right.dateKey.localeCompare(left.dateKey),
  );
}

function getRecentEntryHighlight(
  entries: EntryItem[],
  now = Date.now(),
): { ids: string[]; duration: number } {
  let duration = 0;
  const ids = entries.flatMap((entry) => {
    if (!entry.createdAt) {
      return [];
    }

    const createdAt = Date.parse(entry.createdAt);
    if (!Number.isFinite(createdAt)) {
      return [];
    }

    const age = now - createdAt;
    if (age < 0 || age > RECENT_ENTRY_HIGHLIGHT_MS) {
      return [];
    }

    duration = Math.max(duration, RECENT_ENTRY_HIGHLIGHT_MS - age);
    return [entry.id];
  });

  return {
    ids,
    duration: Math.max(320, duration),
  };
}

function EmptyState({
  hasActiveFilters,
  newEntryHref,
}: {
  hasActiveFilters: boolean;
  newEntryHref: string;
}) {
  const t = useTranslations();
  const hasSearchTerm = hasActiveFilters;

  return (
    <div className="px-[var(--sp-page-x)] py-8">
      <div className="rounded-[var(--r-card)] border border-dashed border-line px-5 py-8 text-center">
        <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground">
          <Receipt className="size-5" aria-hidden="true" />
        </div>
        <p className="text-[16px] font-semibold">
          {hasSearchTerm ? t.entries.noResultsTitle : t.entries.emptyTitle}
        </p>
        <Serif className="mt-2 block text-sm text-ink-3">
          {hasSearchTerm ? t.entries.noResultsDesc : t.entries.emptyDesc}
        </Serif>
        {!hasSearchTerm ? (
          <div className="mt-5">
            <Button asChild className="h-11 rounded-[var(--r-cta)] px-5">
              <Link href={newEntryHref}>{t.entries.addFirst}</Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CraftedEntryList({
  initialEntries,
  initialNextCursor,
  initialHasMore,
  newEntryHref,
  monthLabel,
  monthKey,
  categories = [],
}: CraftedEntryListProps) {
  const t = useTranslations();
  const language = useWorkspaceLanguage();
  const locale = languageToLocale(language);

  const KIND_FILTERS: KindFilter[] = [
    { id: "all", label: "Tutti" },
    { id: "spesa", label: "Spese" },
    { id: "evitata", label: "Evitate" },
    { id: "confronto", label: "Confronti" },
  ];

  const [entries, setEntries] = useState(initialEntries);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const [activeFilterId, setActiveFilterId] = useState<KindFilter["id"]>("all");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [showCategoryFilters, setShowCategoryFilters] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedRecentEntryIds, setHighlightedRecentEntryIds] = useState<string[]>([]);
  const initialSearchHandledRef = useRef(false);
  const requestIdRef = useRef(0);

  const groups = useMemo(
    () => groupByDay(entries, locale, language),
    [entries, locale, language],
  );
  const hasSearchTerm = searchValue.trim().length > 0;
  const hasActiveFilters = hasSearchTerm || selectedCategoryIds.length > 0;
  const categoryOptions = useMemo(
    () =>
      categories
        .map((category) => ({
          id: category.id,
          label: getLocalizedCategoryName(category.slug, language) ?? category.name,
        }))
        .sort((left, right) => left.label.localeCompare(right.label, locale)),
    [categories, language, locale],
  );
  // La query si rifà solo quando cambia l'insieme, non l'ordine di selezione.
  const categoryFilterKey = useMemo(
    () => [...selectedCategoryIds].sort().join(","),
    [selectedCategoryIds],
  );

  useEffect(() => {
    const highlight = getRecentEntryHighlight(entries);
    let timeoutId = 0;
    const frameId = window.requestAnimationFrame(() => {
      setHighlightedRecentEntryIds(highlight.ids);
    });

    if (highlight.ids.length > 0) {
      timeoutId = window.setTimeout(() => {
        setHighlightedRecentEntryIds((current) =>
          current.filter((id) => !highlight.ids.includes(id)),
        );
      }, highlight.duration);
    }

    return () => {
      window.cancelAnimationFrame(frameId);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [entries]);

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
          monthKey,
          kind: activeFilterId,
          categoryIds: selectedCategoryIds,
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
        setSearchError(t.entries.searchError);
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
    // selectedCategoryIds è tracciato tramite categoryFilterKey per non
    // rilanciare la ricerca quando cambia solo l'identità dell'array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeFilterId,
    categoryFilterKey,
    debouncedSearchValue,
    monthKey,
    t.entries.searchError,
  ]);

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
        monthKey,
        kind: activeFilterId,
        categoryIds: selectedCategoryIds,
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
      setLoadError(t.entries.loadError);
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setIsLoading(false);
      }
    }
  }

  function handleSearchChange(value: string) {
    setSearchValue(value);

    if (value.trim() === "") {
      setDebouncedSearchValue("");
    }
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <div className="sticky top-14 z-30 border-b border-line bg-background/95 px-[var(--sp-page-x)] py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex min-h-11 flex-1 items-center gap-2.5 rounded-[var(--r-control)] border border-line bg-background px-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-offset-2">
            <Search className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
            <input
              value={searchValue}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={t.entries.searchPlaceholder}
              aria-label={t.entries.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-ink-3"
            />
            {isSearching ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-ink-3" aria-hidden="true" />
            ) : null}
            {searchValue ? (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="nlc-press rounded-full p-1 text-ink-3 transition-colors hover:text-foreground"
                aria-label={t.entries.clearSearch}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          {categoryOptions.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowCategoryFilters((current) => !current)}
              className={cn(
                "nlc-press relative flex size-11 shrink-0 items-center justify-center rounded-[var(--r-control)] border outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selectedCategoryIds.length > 0 || showCategoryFilters
                  ? "border-accent/40 bg-accent/10 text-foreground"
                  : "border-line text-muted-foreground",
              )}
              aria-label="Filtra per categoria"
              aria-expanded={showCategoryFilters}
              aria-controls="entries-category-filters"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              {selectedCategoryIds.length > 0 ? (
                <Mono className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold leading-none text-background">
                  {selectedCategoryIds.length}
                </Mono>
              ) : null}
            </button>
          ) : null}
        </div>

        {showCategoryFilters && categoryOptions.length > 0 ? (
          <div id="entries-category-filters" className="mt-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <Label>Categorie</Label>
              {selectedCategoryIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryIds([])}
                  className="nlc-press rounded-[var(--r-chip)] px-1 text-[12px] font-medium text-ink-3 transition-colors hover:text-foreground"
                >
                  Azzera
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((category) => {
                const selected = selectedCategoryIds.includes(category.id);

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    aria-pressed={selected}
                    className={cn(
                      "nlc-press min-h-9 rounded-[var(--r-chip)] border px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      selected
                        ? "border-accent/40 bg-accent/10 text-foreground"
                        : "border-line bg-transparent text-ink-3 hover:text-foreground",
                    )}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {KIND_FILTERS.map((filter) => {
            const active = filter.id === activeFilterId;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilterId(filter.id)}
                className={cn(
                  "nlc-press min-h-9 shrink-0 rounded-[var(--r-chip)] border px-3 text-[13px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "border-accent/40 bg-accent/10 text-foreground"
                    : "border-line bg-transparent text-ink-3 hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {searchError ? (
        <p className="px-[var(--sp-page-x)] pt-3 text-sm text-destructive">
          {searchError}
        </p>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState hasActiveFilters={hasActiveFilters} newEntryHref={newEntryHref} />
      ) : (
        groups.map((group) => (
          <section key={group.dateKey}>
            <div className="flex items-baseline justify-between gap-4 px-[var(--sp-page-x)] pb-1 pt-5">
              <div className="min-w-0">
                <h2 className="truncate text-[13px] font-semibold text-muted-foreground">
                  {group.label}
                </h2>
                {group.relative ? (
                  <Serif className="mt-1 block text-[13px] text-ink-3">
                    {group.relative}
                  </Serif>
                ) : null}
              </div>
              <Mono className="shrink-0 text-right text-[11px] text-ink-3">
                {group.count} mov · {formatEUR(group.dayTotal, locale)}
              </Mono>
            </div>
            <div className="px-[var(--sp-page-x)]">
              {group.entries.map((entry, index) => (
                <CraftedEntryRow
                  key={entry.id}
                  entry={entry}
                  className={cn(
                    highlightedRecentEntryIds.includes(entry.id) &&
                      "nlc-row-in nlc-flash",
                  )}
                  showDivider={index < group.entries.length - 1}
                />
              ))}
            </div>
            <Rule />
          </section>
        ))
      )}

      <div className="px-[var(--sp-page-x)] py-5 text-center">
        <Rule soft />
        <Label className="mt-5 block">Fine {monthLabel.toLowerCase()}</Label>
      </div>

      <div className="space-y-2 px-[var(--sp-page-x)] pb-6">
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : null}

        {hasMore ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-[var(--r-cta)] border-line"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {t.entries.loadingMore}
              </>
            ) : (
              t.entries.loadMore
            )}
          </Button>
        ) : entries.length > 0 ? (
          <div className="rounded-[var(--r-control)] border border-line-soft px-4 py-3 text-center">
            <Serif className="text-sm text-ink-3">
              {activeFilterId === "all"
                ? "Tutti i movimenti sono stati caricati."
                : `Tutte le ${KIND_FILTERS.find((filter) => filter.id === activeFilterId)?.label.toLowerCase() ?? "spese"} sono state caricate.`}
            </Serif>
          </div>
        ) : null}
      </div>
    </div>
  );
}
