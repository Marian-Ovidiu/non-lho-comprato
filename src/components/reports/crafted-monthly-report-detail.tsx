"use client";

import { useMemo, useState } from "react";

import { CraftedIcon, Label, Mono, Rule, Serif } from "@/components/crafted";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { formatCraftedCompact } from "@/src/lib/crafted-money";
import { formatDate, formatMoney } from "@/src/lib/formatters";
import { useCurrencyCode, useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations, useWorkspaceLanguage } from "@/src/components/language/language-context";
import { languageToLocale } from "@/src/lib/i18n";
import { getLocalizedCategoryName } from "@/src/lib/category-locale";
import type { Translations } from "@/src/lib/i18n/types";

type ReportT = Translations["report"];
import { cn } from "@/lib/utils";
import {
  buildMonthlyReportAnalyticsSnapshot,
  type MonthlyReportAnalyticsCategory,
  type MonthlyReportAnalyticsEntry,
  type MonthlyReportAnalyticsSnapshot,
  type MonthlyReportAnalyticsUser,
} from "@/src/lib/monthly-report-analytics";
import type { CategoryOption } from "@/src/lib/categories";
import type { MonthlyReportData } from "@/src/actions/reports";

type CraftedMonthlyReportDetailProps = {
  report: MonthlyReportData;
  categories: CategoryOption[];
};

type CategoryFilterOption = {
  value: string;
  label: string;
};

const ALL_CATEGORY_VALUE = "__all__";

/* ------------------------------------------------------------------ */
/* helpers (parità con monthly-analytics-panel)                        */
/* ------------------------------------------------------------------ */

function getCategoryKey(category: MonthlyReportAnalyticsCategory): string {
  return category.slug ?? category.id ?? category.name;
}

function formatSignedMoney(value: number, currencySymbol: string): string {
  const prefix = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${prefix}${formatCraftedCompact(Math.abs(value))}${currencySymbol}`;
}

function getShortBalanceLabel(balanceRatio: number, t: ReportT): string {
  if (balanceRatio > 1.1) return t.aboveAvg;
  if (balanceRatio < 0.9) return t.belowAvg;
  return t.balanced;
}

function getInitials(label: string): string {
  return (
    label
      .split(/\s+/)
      .map((part) => part.trim().charAt(0))
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·"
  );
}

function getSummaryText({
  isAllCategories,
  categoryLabel,
  snapshot,
  currencySymbol,
  currencyCode,
  t,
}: {
  isAllCategories: boolean;
  categoryLabel: string;
  snapshot: MonthlyReportAnalyticsSnapshot;
  currencySymbol: string;
  currencyCode: string;
  t: ReportT;
}): string {
  if (!snapshot.hasData) {
    return isAllCategories
      ? t.noSpendingAll
      : t.noSpendingCategory(categoryLabel.toLowerCase());
  }

  const topUser = snapshot.users[0];
  const previousWorkspaceTotal = snapshot.users.some(
    (user) => user.previousMonthTotal !== null,
  )
    ? snapshot.users.reduce(
        (total, user) => total + (user.previousMonthTotal ?? 0),
        0,
      )
    : null;
  const workspaceDelta =
    previousWorkspaceTotal === null
      ? null
      : snapshot.totalPaidByWorkspace - previousWorkspaceTotal;
  const categoryPrefix = isAllCategories ? "" : `${categoryLabel}: `;

  const balancedText = topUser
    ? `${topUser.label} è ${topUser.balanceLabel.toLowerCase()}.`
    : t.workspaceBalanced;
  const deltaText =
    workspaceDelta === null
      ? t.noComparison
      : workspaceDelta > 0
        ? t.aboveLastMonth(formatSignedMoney(workspaceDelta, currencySymbol))
        : workspaceDelta < 0
          ? t.belowLastMonth(formatSignedMoney(Math.abs(workspaceDelta), currencySymbol))
          : t.alignedLastMonth;

  const savingText =
    snapshot.overview.totalSaved > 0
      ? t.netImpactSuffix(formatMoney(snapshot.overview.totalSaved, currencyCode))
      : "";

  return `${categoryPrefix}${t.spentInMonthAmount(formatMoney(snapshot.overview.totalRealSpent, currencyCode))}${savingText} ${balancedText} ${deltaText}`;
}

function buildCategoryOptions(
  categories: CategoryOption[],
  reportEntries: MonthlyReportAnalyticsEntry[],
  previousEntries: MonthlyReportAnalyticsEntry[],
  language: string,
  locale: string,
  allCategoriesLabel: string,
  deletedCategoryLabel: string,
): CategoryFilterOption[] {
  const options = new Map<string, CategoryFilterOption>();

  options.set(ALL_CATEGORY_VALUE, {
    value: ALL_CATEGORY_VALUE,
    label: allCategoriesLabel,
  });

  for (const category of categories) {
    const value = category.slug ?? category.id;
    options.set(value, { value, label: category.name });
  }

  for (const entry of [...reportEntries, ...previousEntries]) {
    const value = getCategoryKey(entry.category);
    if (!options.has(value)) {
      options.set(value, {
        value,
        label:
          getLocalizedCategoryName(entry.category.slug, language) ??
          (entry.category.name || deletedCategoryLabel),
      });
    }
  }

  return [
    options.get(ALL_CATEGORY_VALUE)!,
    ...[...options.values()]
      .filter((option) => option.value !== ALL_CATEGORY_VALUE)
      .sort((left, right) => left.label.localeCompare(right.label, locale)),
  ];
}

/* ------------------------------------------------------------------ */
/* sub-components                                                      */
/* ------------------------------------------------------------------ */

const AVATAR_TONE = [
  "bg-accent text-accent-foreground",
  "bg-foreground text-background",
] as const;

function PersonBlock({
  user,
  index,
  showPrevious,
}: {
  user: MonthlyReportAnalyticsUser;
  index: number;
  showPrevious: boolean;
}) {
  const t = useTranslations();
  const currencySymbol = useCurrencySymbol();
  const language = useWorkspaceLanguage();
  const locale = languageToLocale(language);
  const personalPct =
    user.totalPaid > 0 ? (user.personalSpend / user.totalPaid) * 100 : 0;
  const sharedPct = user.totalPaid > 0 ? 100 - personalPct : 0;
  const diff = user.differenceVsPreviousMonth;

  return (
    <div className="px-[var(--sp-page-x)] py-[18px]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className={cn(
              "flex size-[26px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
              AVATAR_TONE[index % AVATAR_TONE.length],
            )}
          >
            {getInitials(user.label)}
          </span>
          <span className="truncate text-[15px] font-medium">{user.label}</span>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full border border-line px-2.5 py-[3px] font-num text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
          {getShortBalanceLabel(user.balanceRatio, t.report)} ·{" "}
          {new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(user.balanceRatio)}
          ×
        </span>
      </div>

      <div className="mt-3.5 flex items-end justify-between gap-3">
        <div>
          <Label className="mb-1.5 block">{t.report.totalPaid}</Label>
          <Mono className="text-[30px] font-semibold leading-none">
            {formatCraftedCompact(user.totalPaid)}
            <span className="text-[13px] text-accent">{currencySymbol}</span>
          </Mono>
        </div>
        {showPrevious && diff !== null && diff !== 0 ? (
          <div
            className={cn(
              "flex items-center gap-1.5 text-[12px]",
              diff > 0 ? "text-destructive" : "text-green",
            )}
          >
            <CraftedIcon
              name="arrowUp"
              size={13}
              strokeWidth={2}
              className={cn(diff < 0 && "rotate-180")}
            />
            <Mono>{formatSignedMoney(diff, currencySymbol)}</Mono>
            <span className="text-ink-3">{t.report.vsPrevMonth}</span>
          </div>
        ) : null}
      </div>

      {user.totalPaid > 0 ? (
        <>
          <div className="mt-3.5 flex h-2 gap-0.5">
            <span
              className="block rounded-[1px] bg-foreground/85"
              style={{ width: `${personalPct}%` }}
            />
            <span
              className="block rounded-[1px] bg-accent"
              style={{ width: `${sharedPct}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-[7px] rounded-[2px] bg-foreground/85" />
              {t.report.personal}{" "}
              <Mono className="text-foreground">
                {formatCraftedCompact(user.personalSpend)}{currencySymbol}
              </Mono>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-[7px] rounded-[2px] bg-accent" />
              {t.report.shared}{" "}
              <Mono className="text-foreground">
                {formatCraftedCompact(user.sharedSpend)}{currencySymbol}
              </Mono>
            </span>
          </div>
        </>
      ) : (
        <Serif className="mt-2 block text-[13px] text-ink-3">
          {t.report.noSpendingPaid}
        </Serif>
      )}
    </div>
  );
}

function PayerCompare({ users }: { users: MonthlyReportAnalyticsUser[] }) {
  const t = useTranslations();
  const currencySymbol = useCurrencySymbol();
  const ranked = [...users]
    .filter((user) => user.totalPaid > 0)
    .sort((left, right) => right.totalPaid - left.totalPaid);

  if (ranked.length < 2) {
    return null;
  }

  const max = ranked[0]!.totalPaid;

  return (
    <>
      <section className="px-5 pb-1 pt-[22px]">
        <Label>{t.report.whoPayedMore}</Label>
      </section>
      <div className="px-5 pb-2">
        {ranked.map((user, index) => (
          <div
            key={user.userId}
            className={cn(
              "flex items-center gap-3 py-2.5",
              index < ranked.length - 1 && "border-b border-line-soft",
            )}
          >
            <span className="w-16 shrink-0 truncate text-[13px] font-[450]">
              {user.label}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-[1px] bg-line">
              <span
                className={cn(
                  "block h-full rounded-[1px]",
                  index === 0 ? "bg-accent" : "bg-foreground/80",
                )}
                style={{ width: `${max > 0 ? (user.totalPaid / max) * 100 : 0}%` }}
              />
            </span>
            <Mono className="w-[62px] shrink-0 text-right text-[13px] font-medium">
              {formatCraftedCompact(user.totalPaid)}
              <span className="text-[10.5px] text-accent">{currencySymbol}</span>
            </Mono>
          </div>
        ))}
      </div>
      <Rule />
    </>
  );
}

function MonthHighlights({
  snapshot,
}: {
  snapshot: MonthlyReportAnalyticsSnapshot;
}) {
  const t = useTranslations();
  const currencySymbol = useCurrencySymbol();
  const { bestCategory, worstCategory, biggestSaving } = snapshot;

  return (
    <>
      <section className="px-5 pb-0.5 pt-[22px]">
        <Label className="mb-1.5 block">{t.report.monthHighlights}</Label>
        <Serif className="block text-[13px] text-ink-3">
          {t.report.monthHighlightsDesc}
        </Serif>
      </section>

      <div className="px-5">
        {worstCategory ? (
          <div className="flex items-start gap-4 border-b border-line-soft py-3.5">
            <span className="flex w-[30px] shrink-0 justify-center pt-0.5 text-muted-foreground">
              <CraftedIcon
                name={getCategoryCraftedIcon({
                  name: worstCategory.categoryName,
                  slug: worstCategory.categorySlug,
                })}
                size={20}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-[450]">{worstCategory.name}</p>
              <Serif className="mt-1 block text-[13px] text-ink-3">
                {t.report.topSpendingCategory}
              </Serif>
            </div>
            <Mono className="shrink-0 whitespace-nowrap text-[15px] font-medium">
              {formatCraftedCompact(worstCategory.totalRealSpent)}
              <span className="text-[11px] text-accent">{currencySymbol}</span>
            </Mono>
          </div>
        ) : null}

        {bestCategory ? (
          <div className="flex items-start gap-4 py-3.5">
            <span className="flex w-[30px] shrink-0 justify-center pt-0.5 text-muted-foreground">
              <CraftedIcon
                name={getCategoryCraftedIcon({
                  name: bestCategory.categoryName,
                  slug: bestCategory.categorySlug,
                })}
                size={20}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-[450]">{bestCategory.name}</p>
              <Serif className="mt-1 block text-[13px] text-ink-3">
                {t.report.bestNetImpact}
              </Serif>
            </div>
            <Mono className="shrink-0 whitespace-nowrap text-[15px] font-medium text-green">
              {formatCraftedCompact(bestCategory.totalSaved)}
              <span className="text-[11px] text-accent">{currencySymbol}</span>
            </Mono>
          </div>
        ) : null}
      </div>

      {biggestSaving && biggestSaving.savedAmount > 0 ? (
        <div className="mt-1 flex items-start gap-3.5 px-5 py-4">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-green" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="block font-num text-[10px] font-normal uppercase tracking-[0.22em] text-green">
                {t.report.bestPositiveImpact}
              </span>
              <span className="shrink-0 rounded-full border border-line px-2.5 py-[3px] font-num text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
                {biggestSaving.ownershipLabel}
              </span>
            </div>
            <p className="mt-2 text-[15px] font-[450]">{biggestSaving.title}</p>
            <Serif className="mt-1 block text-[13px] text-ink-3">
              {biggestSaving.categoryName} · {formatDate(biggestSaving.date)} ·{" "}
              {t.report.insteadOf(
                `${formatCraftedCompact(biggestSaving.realCost)}${currencySymbol}`,
                `${formatCraftedCompact(biggestSaving.alternativeCost)}${currencySymbol}`,
              )}
            </Serif>
          </div>
          <Mono className="shrink-0 whitespace-nowrap text-[17px] font-semibold text-green">
            +{formatCraftedCompact(biggestSaving.savedAmount)}
            <span className="text-[11px] text-accent">{currencySymbol}</span>
          </Mono>
        </div>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

export function CraftedMonthlyReportDetail({
  report,
  categories,
}: CraftedMonthlyReportDetailProps) {
  const t = useTranslations();
  const currencySymbol = useCurrencySymbol();
  const currencyCode = useCurrencyCode();
  const language = useWorkspaceLanguage();
  const locale = languageToLocale(language);
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY_VALUE);

  const categoryOptions = useMemo(
    () =>
      buildCategoryOptions(
        categories,
        report.entries,
        report.previousMonthEntries,
        language,
        locale,
        t.report.allCategories,
        t.report.deletedCategory,
      ),
    [categories, report.entries, report.previousMonthEntries, language, locale, t.report.allCategories, t.report.deletedCategory],
  );

  const isAllCategories = selectedCategory === ALL_CATEGORY_VALUE;

  const selectedCategoryLabel = useMemo(
    () =>
      categoryOptions.find((option) => option.value === selectedCategory)?.label ??
      t.report.allCategories,
    [categoryOptions, selectedCategory, t.report.allCategories],
  );

  const filteredEntries = useMemo(() => {
    if (isAllCategories) return report.entries;
    return report.entries.filter(
      (entry) => getCategoryKey(entry.category) === selectedCategory,
    );
  }, [report.entries, selectedCategory, isAllCategories]);

  const filteredPreviousEntries = useMemo(() => {
    if (isAllCategories) return report.previousMonthEntries;
    return report.previousMonthEntries.filter(
      (entry) => getCategoryKey(entry.category) === selectedCategory,
    );
  }, [report.previousMonthEntries, selectedCategory, isAllCategories]);

  const snapshot = useMemo(
    () =>
      buildMonthlyReportAnalyticsSnapshot(
        filteredEntries,
        filteredPreviousEntries,
        report.members,
      ),
    [filteredEntries, filteredPreviousEntries, report.members],
  );

  const summaryText = useMemo(
    () => getSummaryText({ isAllCategories, categoryLabel: selectedCategoryLabel, snapshot, currencySymbol, currencyCode, t: t.report }),
    [isAllCategories, selectedCategoryLabel, snapshot, currencySymbol, currencyCode, t.report],
  );

  const hasPreviousData = filteredPreviousEntries.length > 0;

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-[var(--sp-page-x)] pb-3.5 pt-[var(--sp-section-y)]">
        <Label className="mb-3.5 block">{t.report.detailLabel}</Label>
        <div className="flex gap-4 overflow-x-auto pb-0.5">
          {categoryOptions.map((option) => {
            const selected = option.value === selectedCategory;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedCategory(option.value)}
                className={cn(
                  "shrink-0 whitespace-nowrap border-b-[1.5px] pb-2 text-[13px] transition-colors",
                  selected
                    ? "border-accent font-semibold text-foreground"
                    : "border-transparent font-[450] text-ink-3",
                )}
              >
                {option.value === ALL_CATEGORY_VALUE ? t.report.allCategoriesShort : option.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-[var(--sp-page-x)] pb-[18px]">
        <Serif className="block max-w-[32em] text-[15px] leading-[1.45] text-muted-foreground [text-wrap:pretty]">
          {summaryText}
        </Serif>
      </section>
      <Rule />

      {snapshot.hasData ? (
        <>
          <section className="px-[var(--sp-page-x)] pb-1 pt-[var(--sp-section-y)]">
            <div className="flex items-baseline justify-between gap-3">
              <Label>{t.report.byPerson}</Label>
              <Mono className="text-[11px] text-ink-3">
                {t.report.memberCount(snapshot.users.length)}
              </Mono>
            </div>
          </section>

          {snapshot.users.map((user, index) => (
            <div key={user.userId}>
              <PersonBlock
                user={user}
                index={index}
                showPrevious={hasPreviousData}
              />
              {index < snapshot.users.length - 1 ? (
                <div className="mx-5">
                  <Rule soft />
                </div>
              ) : null}
            </div>
          ))}
          <Rule />

          <PayerCompare users={snapshot.users} />

          <MonthHighlights snapshot={snapshot} />
        </>
      ) : null}
    </div>
  );
}
