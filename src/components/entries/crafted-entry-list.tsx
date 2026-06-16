"use client";

import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CraftedIcon, Label, Mono, Rule, Serif } from "@/components/crafted";
import { getEntriesPage } from "@/src/actions/entries";
import { CraftedEntryRow } from "@/src/components/entries/crafted-entry-row";
import { Button } from "@/components/ui/button";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import {
  getDateKey,
  shiftDateKey,
} from "@/src/lib/workspace-dates";
import { calculateEntryMetrics } from "@/src/lib/entry-metrics";
import { cn } from "@/lib/utils";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations, useWorkspaceLanguage } from "@/src/components/language/language-context";
import { languageToLocale } from "@/src/lib/i18n";

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
  beneficiaryUserIds: string[];
  createdAt?: string;
};

type CategoryFilter = {
  id: string;
  label: string;
  matches?: string[];
};

type CraftedEntryListProps = {
  initialEntries: EntryItem[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  newEntryHref: string;
  previousMonthSummary?: {
    label: string;
    totalRealSpent: number;
    totalSaved: number;
    entriesCount: number;
  } | null;
};

type DayGroup = {
  dateKey: string;
  label: string;
  entries: EntryItem[];
  totalRealSpent: number;
  totalSaved: number;
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;
const RECENT_ENTRY_HIGHLIGHT_MS = 2_000;

function normalizeFilterKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesCategoryFilter(entry: EntryItem, filter: CategoryFilter) {
  if (filter.id === "all" || !filter.matches) {
    return true;
  }

  const slug = normalizeFilterKey(entry.category.slug ?? "");
  const name = normalizeFilterKey(entry.category.name ?? "");

  return filter.matches.some(
    (match) => slug.includes(match) || name.includes(match),
  );
}

function getShortRomeDateLabel(dateKey: string, locale: string) {
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace(".", "");
}

function getCraftedDayGroupLabel(
  dateKey: string,
  locale: string,
  todayLabel: string,
  yesterdayLabel: string,
) {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayKey = getDateKey(new Date(), browserTz);
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const shortDate = getShortRomeDateLabel(dateKey, locale);

  if (dateKey === todayKey) {
    return `${todayLabel} · ${shortDate}`;
  }

  if (dateKey === yesterdayKey) {
    return `${yesterdayLabel} · ${shortDate}`;
  }

  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(
      new Date(
        Date.UTC(Number(yearPart), Number(monthPart) - 1, Number(dayPart)),
      ),
    )
    .replace(".", "");

  return `${weekday} · ${shortDate}`;
}

function groupEntries(
  entries: EntryItem[],
  locale: string,
  todayLabel: string,
  yesterdayLabel: string,
): DayGroup[] {
  const groups: DayGroup[] = [];
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  for (const entry of entries) {
    const dateKey = getDateKey(new Date(entry.date), browserTz);
    const currentGroup = groups.at(-1);

    if (!dateKey) {
      continue;
    }

    const realSpent = Number(entry.realCost) || 0;
    const saved = calculateEntryMetrics(entry).netImpact;

    if (currentGroup && currentGroup.dateKey === dateKey) {
      currentGroup.entries.push(entry);
      currentGroup.totalRealSpent += realSpent;
      currentGroup.totalSaved += saved;
      continue;
    }

    groups.push({
      dateKey,
      label: getCraftedDayGroupLabel(dateKey, locale, todayLabel, yesterdayLabel),
      entries: [entry],
      totalRealSpent: realSpent,
      totalSaved: saved,
    });
  }

  return groups;
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

export function CraftedEntryList({
  initialEntries,
  initialNextCursor,
  initialHasMore,
  newEntryHref,
  previousMonthSummary,
}: CraftedEntryListProps) {
  const currencySymbol = useCurrencySymbol();
  const t = useTranslations();
  const language = useWorkspaceLanguage();
  const locale = languageToLocale(language);

  const CATEGORY_FILTERS: CategoryFilter[] = [
    { id: "all", label: t.entries.filterAll },
    { id: "caffe", label: t.entries.filterCoffee, matches: ["caffe", "caffè", "coffee"] },
    { id: "delivery", label: t.entries.filterDelivery, matches: ["delivery", "cibo", "spesa"] },
    { id: "shopping", label: t.entries.filterShopping, matches: ["shopping"] },
    { id: "svago", label: t.entries.filterFun, matches: ["svago"] },
  ];

  const [entries, setEntries] = useState(initialEntries);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
  const [activeFilterId, setActiveFilterId] = useState("all");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedRecentEntryIds, setHighlightedRecentEntryIds] = useState<
    string[]
  >([]);
  const initialSearchHandledRef = useRef(false);
  const requestIdRef = useRef(0);
  const initialEntriesRef = useRef(initialEntries);
  const initialNextCursorRef = useRef(initialNextCursor);
  const initialHasMoreRef = useRef(initialHasMore);

  const activeFilter =
    CATEGORY_FILTERS.find((filter) => filter.id === activeFilterId) ??
    CATEGORY_FILTERS[0]!;

  const filteredEntries = useMemo(
    () => entries.filter((entry) => matchesCategoryFilter(entry, activeFilter)),
    [entries, activeFilter],
  );

  const groups = useMemo(
    () => groupEntries(filteredEntries, locale, t.entries.todayLabel, t.entries.yesterdayLabel),
    [filteredEntries, locale, t.entries.todayLabel, t.entries.yesterdayLabel],
  );
  const hasSearchTerm = searchValue.trim().length > 0;

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

    if (debouncedSearchValue === "") {
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
      requestIdRef.current += 1;
      setLoadError(null);
      setSearchError(null);
      setIsSearching(false);
      setEntries(initialEntriesRef.current);
      setNextCursor(initialNextCursorRef.current);
      setHasMore(initialHasMoreRef.current);
      setDebouncedSearchValue("");
    }
  }

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <div className="flex gap-4 overflow-x-auto px-5 pb-3.5">
        {CATEGORY_FILTERS.map((filter) => {
          const active = filter.id === activeFilterId;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilterId(filter.id)}
              className={cn(
                "shrink-0 border-b-[1.5px] pb-2 text-[13px] whitespace-nowrap transition-colors",
                active
                  ? "border-accent font-semibold text-foreground"
                  : "border-transparent font-[450] text-ink-3",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="px-5">
        <div className="flex items-center gap-2.5 border-b border-line py-2.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring/45 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:rounded-[var(--r-control)]">
          <CraftedIcon name="search" size={17} className="shrink-0 text-ink-3" />
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
              className="rounded-full p-1 text-ink-3 transition-colors hover:text-foreground"
              aria-label={t.entries.clearSearch}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {searchError ? (
        <p className="px-5 pt-3 text-sm text-destructive">{searchError}</p>
      ) : null}

      {filteredEntries.length === 0 ? (
        <div className="space-y-4 px-5 py-8">
          <div className="space-y-2 text-center">
            <p className="text-lg font-semibold tracking-[-0.02em]">
              {hasSearchTerm
                ? t.entries.noResultsTitle
                : t.entries.emptyTitle}
            </p>
            <Serif className="block text-sm text-ink-3">
              {hasSearchTerm
                ? t.entries.noResultsDesc
                : t.entries.emptyDesc}
            </Serif>
          </div>
          {!hasSearchTerm ? (
            <div className="flex justify-center">
              <Button asChild className="h-11 rounded-[var(--r-cta)] px-5">
                <Link href={newEntryHref}>{t.entries.addFirst}</Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.dateKey}>
            <div className="flex items-baseline justify-between gap-4 px-5 pb-1 pt-5">
              <div className="min-w-0">
                <Label>{group.label}</Label>
                <Mono className="mt-1 block text-[10px] text-ink-3">
                  {group.entries.length}{" "}
                  {group.entries.length === 1 ? t.entries.entrySingular : t.entries.entryPlural}
                </Mono>
              </div>
              <div className="shrink-0 text-right">
                <Mono className="block text-sm font-medium">
                  {formatCraftedCompact(group.totalRealSpent)}{currencySymbol}
                  <span className="font-normal text-ink-3"> {t.entries.spentLabel}</span>
                </Mono>
                <Mono
                  className={cn(
                    "mt-0.5 block text-xs",
                    group.totalSaved > 0
                      ? "text-accent"
                      : group.totalSaved < 0
                        ? "text-foreground"
                        : "text-ink-3",
                  )}
                >
                  {group.totalSaved > 0 ? "+" : ""}
                  {formatCraftedCompact(group.totalSaved)}{currencySymbol}
                  <span className="ml-1 font-normal text-ink-3">
                    {t.entries.netImpactLabel}
                  </span>
                </Mono>
              </div>
            </div>
            <div className="px-5">
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
          </div>
        ))
      )}

      {previousMonthSummary ? (
        <div className="px-5 py-5 text-center">
          <Serif className="text-sm text-ink-3">
            {previousMonthSummary.label.toLowerCase()} —{" "}
            {formatCraftedCompact(previousMonthSummary.totalRealSpent)}{currencySymbol} {t.entries.spentLabel}
            {previousMonthSummary.totalSaved > 0
              ? ` · ${formatCraftedCompact(previousMonthSummary.totalSaved)}${currencySymbol} ${t.entries.netImpactLabel}`
              : ""}{" "}
            in {previousMonthSummary.entriesCount} {previousMonthSummary.entriesCount === 1 ? t.entries.entrySingular : t.entries.entryPlural}
          </Serif>
        </div>
      ) : null}

      <div className="space-y-2 px-5 pb-6">
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
        ) : null}
      </div>
    </div>
  );
}
