"use client";

import Link from "next/link";
import { Check, Loader2, Receipt, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Amount, Eyebrow, Rule, Serif } from "@/components/crafted";
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
import {
  clampRestoredCount,
  entryAnchorId,
  planRestoreScroll,
  isSnapshotUsable,
  readSnapshot,
  writeSnapshot,
} from "@/src/features/entries/list-position";

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
  shortLabel: string;
  relative: "today" | "yesterday" | null;
  count: number;
  dayTotal: number;
  entries: CraftedEntryRowItem[];
};

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;
const RECENT_ENTRY_HIGHLIGHT_MS = 2_000;

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

function toRowEntry(entry: EntryItem, language: string): CraftedEntryRowItem {
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

function formatDayLabel(
  dateKey: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) {
  const { year, month, day } = parseDateKey(dateKey);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return dateKey;
  }

  const formatted = new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function getRelativeLabel(dateKey: string): DayGroupData["relative"] {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const todayKey = getDateKey(new Date(), browserTz);
  const yesterdayKey = shiftDateKey(todayKey, -1);

  if (dateKey === todayKey) {
    return "today";
  }

  if (dateKey === yesterdayKey) {
    return "yesterday";
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
    const rowEntry = toRowEntry(entry, language);
    const existing = groups.get(dateKey);
    // Il totale del giorno è la stessa cosa del totale in testata: i soldi
    // usciti davvero. Esclude la spesa evitata, e nient'altro — prima
    // scartava anche i confronti, e la colonna degli importi non tornava.
    const dayTotal = rowEntry.kind === "evitata" ? 0 : rowEntry.amount;

    if (existing) {
      existing.entries.push(rowEntry);
      existing.count += 1;
      existing.dayTotal += dayTotal;
      continue;
    }

    groups.set(dateKey, {
      dateKey,
      label: formatDayLabel(dateKey, locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      shortLabel: formatDayLabel(dateKey, locale, {
        day: "numeric",
        month: "long",
      }),
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
    <div className="px-[var(--sp-page-x)] py-10 text-center">
      <div className="mx-auto mb-4 flex size-[38px] items-center justify-center rounded-[var(--r-control)] border border-line-soft bg-foreground/[0.045] text-muted-foreground">
        <Receipt className="size-[17px]" aria-hidden="true" />
      </div>
      <p className="text-[16px] font-semibold">
        {hasSearchTerm ? t.entries.noResultsTitle : t.entries.emptyTitle}
      </p>
      <Serif className="mx-auto mt-2 block max-w-[26ch] text-[14px] text-ink-3">
        {hasSearchTerm ? t.entries.noResultsDesc : t.entries.emptyDesc}
      </Serif>
      {!hasSearchTerm ? (
        <div className="mt-6">
          <Button asChild className="h-11 rounded-[var(--r-cta)] px-5">
            <Link href={newEntryHref}>{t.entries.addFirst}</Link>
          </Button>
        </div>
      ) : null}
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
    { id: "all", label: t.entries.filterAll },
    { id: "spesa", label: t.entries.filterExpenses },
    { id: "evitata", label: t.entries.filterAvoided },
    { id: "confronto", label: t.entries.filterComparisons },
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
  /**
   * Firma della vista attualmente a schermo. Confrontarla con quella dei
   * filtri dice se serve una nuova query, senza dipendere dall'ordine in cui
   * gli effetti vengono eseguiti: è quello che permette al ripristino di
   * applicare filtri ed elenco insieme senza farsi sovrascrivere.
   */
  const queryKey = `${debouncedSearchValue}|${activeFilterId}|${categoryFilterKey}`;
  const loadedQueryKeyRef = useRef(queryKey);

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
    // L'elenco a schermo corrisponde già a questi filtri: è il primo montaggio,
    // oppure un ripristino appena concluso. In entrambi i casi rifare la query
    // servirebbe solo a buttare via quello che c'è.
    if (loadedQueryKeyRef.current === queryKey) {
      return;
    }

    loadedQueryKeyRef.current = queryKey;
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
    // I filtri entrano tramite queryKey, che li riassume tutti in una stringa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, queryKey, t.entries.searchError]);

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

  // Ritorno da un movimento aperto: si rimettono i filtri di prima, si
  // ricaricano tutte le pagine che erano state caricate e si torna sulla riga
  // da cui si era usciti.
  useEffect(() => {
    const storage = typeof window === "undefined" ? null : window.sessionStorage;
    const snapshot = readSnapshot(storage);

    if (!isSnapshotUsable(snapshot, monthKey, Date.now())) {
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    const restoredKey = `${snapshot.query}|${snapshot.kind}|${[...snapshot.categoryIds].sort().join(",")}`;

    void (async () => {
      try {
        const result = await getEntriesPage({
          q: snapshot.query,
          limit: clampRestoredCount(snapshot.loadedCount, PAGE_SIZE),
          monthKey,
          kind: snapshot.kind,
          categoryIds: snapshot.categoryIds,
        });

        if (requestIdRef.current !== currentRequestId) {
          return;
        }

        // Filtri ed elenco vanno applicati nello stesso aggiornamento: separarli
        // farebbe vedere per un istante i filtri di prima sui movimenti nuovi.
        loadedQueryKeyRef.current = restoredKey;
        setSearchValue(snapshot.query);
        setDebouncedSearchValue(snapshot.query);
        setActiveFilterId(snapshot.kind);
        setSelectedCategoryIds(snapshot.categoryIds);
        setEntries(result.entries);
        setNextCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (error) {
        // Il ripristino è un miglioramento, non un requisito: se fallisce
        // resta l'elenco renderizzato dal server.
        console.error("Failed to restore entries list:", error);
        return;
      }

      requestAnimationFrame(() => {
        const anchor = document.getElementById(
          entryAnchorId(snapshot.anchorEntryId),
        );

        if (!anchor) {
          return;
        }

        const rect = anchor.getBoundingClientRect();
        const destination = Math.max(
          0,
          rect.top +
            window.scrollY -
            window.innerHeight / 2 +
            rect.height / 2,
        );
        const plan = planRestoreScroll({
          currentScroll: window.scrollY,
          destination,
          rowHeight: rect.height,
          prefersReducedMotion: window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches,
        });

        if (plan.instantTo !== null) {
          window.scrollTo({ top: plan.instantTo });
        }

        if (plan.smoothTo === null) {
          return;
        }

        /* Il tratto morbido parte al fotogramma dopo: chiesti nello stesso, il
           browser fonde i due scorrimenti e il salto se lo mangia. */
        const smoothTo = plan.smoothTo;
        requestAnimationFrame(() => {
          window.scrollTo({ top: smoothTo, behavior: "smooth" });
        });
      });
    })();
  }, [monthKey]);

  function rememberPosition(entryId: string) {
    writeSnapshot(typeof window === "undefined" ? null : window.sessionStorage, {
      monthKey,
      query: debouncedSearchValue,
      kind: activeFilterId,
      categoryIds: selectedCategoryIds,
      loadedCount: entries.length,
      anchorEntryId: entryId,
      savedAt: Date.now(),
    });
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

  const relativeLabels = {
    today: t.entries.todayLabel,
    yesterday: t.entries.yesterdayLabel,
  };

  return (
    <div>
      {/* I controlli restano a portata di pollice per tutta la lista, ma il loro
          contenitore non dipinge una fascia: ricerca e segmentato portano già
          le superfici che servono. L'aggancio è `--nlc-chrome-top`, la misura
          vera dell'header pubblicata dal guscio: il `top-14` di prima era un
          56px scritto a mano che con la safe area di un iPhone finiva *sotto*
          l'header. */}
      <div
        className="sticky z-20 px-[var(--sp-page-x)] pb-2.5 pt-2"
        style={{ top: "var(--nlc-chrome-top, 3.5rem)" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex min-h-11 flex-1 items-center gap-2.5 rounded-[var(--r-control)] bg-surface-muted px-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-offset-2">
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
                "nlc-press relative flex size-11 shrink-0 items-center justify-center rounded-[var(--r-control)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                // Un filtro attivo è uno stato, non un'azione: si dice con il
                // materiale (la cella piena) e non con il colore del brand.
                selectedCategoryIds.length > 0 || showCategoryFilters
                  ? "bg-surface-muted text-foreground"
                  : "text-muted-foreground",
              )}
              aria-label={t.entries.categoryFilterToggle}
              aria-expanded={showCategoryFilters}
              aria-controls="entries-category-filters"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              {selectedCategoryIds.length > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold leading-none tabular-nums text-background">
                  {selectedCategoryIds.length}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>

        {/* Il tipo è una scelta sola fra quattro: un segmentato lo dice, quattro
            chip identiche a quelle delle categorie dicevano il contrario —
            là la selezione è multipla. Due modelli di scelta non possono avere
            la stessa forma. */}
        <div
          role="group"
          aria-label={t.entries.kindFilterLabel}
          className="mt-2 grid grid-cols-4 gap-1 rounded-[var(--r-control)] border border-line-soft p-1"
        >
          {KIND_FILTERS.map((filter) => {
            const active = filter.id === activeFilterId;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilterId(filter.id)}
                aria-pressed={active}
                className={cn(
                  "nlc-press min-h-8 truncate rounded-[var(--r-chip)] px-1 text-[12.5px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  active
                    ? "bg-surface-muted font-semibold text-foreground"
                    : "font-medium text-ink-3 hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {showCategoryFilters && categoryOptions.length > 0 ? (
          <div id="entries-category-filters" className="mt-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <Eyebrow>{t.entries.categoriesLabel}</Eyebrow>
              {selectedCategoryIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryIds([])}
                  className="nlc-press rounded-[var(--r-chip)] px-1 text-[12px] font-medium text-ink-3 transition-colors hover:text-foreground"
                >
                  {t.entries.clearCategories}
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
                      "nlc-press inline-flex min-h-9 items-center gap-1.5 rounded-[var(--r-chip)] border px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      // La selezione multipla si dice con il segno di spunta,
                      // non con una tinta: dieci chip accese sarebbero dieci
                      // campiture colorate sopra la lista.
                      selected
                        ? "border-transparent bg-surface-muted text-foreground"
                        : "border-line-soft bg-transparent text-ink-3 hover:text-foreground",
                    )}
                  >
                    {selected ? (
                      <Check className="-ml-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    ) : null}
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
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
            {/* Intestazione del giorno: un'etichetta di sezione e un totale.
                Il conteggio dei movimenti è sparito — sotto ci sono le righe,
                e si contano guardandole. */}
            <div className="flex items-baseline justify-between gap-4 px-[var(--sp-page-x)] pb-1 pt-6">
              <h2 className="min-w-0 truncate">
                <Eyebrow>
                  {group.relative
                    ? `${relativeLabels[group.relative]} · ${group.shortLabel}`
                    : group.label}
                </Eyebrow>
              </h2>
              <Amount
                value={group.dayTotal}
                className="shrink-0 text-[13px] font-medium text-muted-foreground"
              />
            </div>
            <div className="px-[var(--sp-page-x)]">
              {group.entries.map((entry, index) => (
                <CraftedEntryRow
                  key={entry.id}
                  entry={entry}
                  onOpen={rememberPosition}
                  returnTo={`/entries?month=${monthKey}`}
                  className={cn(
                    highlightedRecentEntryIds.includes(entry.id) &&
                      "nlc-row-in nlc-flash",
                  )}
                  showDivider={index < group.entries.length - 1}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <div className="space-y-3 px-[var(--sp-page-x)] pb-2 pt-8">
        {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}

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
          // Un solo finale, e dice il vero: "fine agosto" quando si sono viste
          // tutte le voci del mese, "hai visto tutto" quando la lista è filtrata
          // e quindi non è il mese ad essere finito. Prima compariva comunque,
          // anche con altre pagine da caricare.
          <div className="pt-2 text-center">
            <Rule soft />
            {hasActiveFilters || activeFilterId !== "all" ? (
              <Serif className="mt-5 block text-[13px] text-ink-3">
                {t.entries.allLoaded}
              </Serif>
            ) : (
              <Eyebrow className="mt-5 block">
                {t.entries.endOfMonth(monthLabel.toLowerCase())}
              </Eyebrow>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
