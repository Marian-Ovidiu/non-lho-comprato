"use client";

import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";

import {
  CraftedIcon,
  Label,
  Mono,
  ProgressLine,
  Rule,
  Serif,
  StatTrio,
  type CraftedIconName,
} from "@/components/crafted";
import { CraftedDashboardEmptyState } from "@/src/components/dashboard/crafted-dashboard-empty-state";
import { DashboardQuickActions } from "@/src/components/dashboard/dashboard-quick-actions";
import { Button } from "@/components/ui/button";
import {
  formatCraftedCompact,
  formatCraftedEntryAmount,
} from "@/src/lib/crafted-money";
import { CraftedBudgetSummary } from "@/src/components/budget/crafted-budget-summary";
import {
  CraftedAmount,
  CraftedOdometer,
  Stagger,
} from "@/components/crafted/motion";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { formatDate } from "@/src/lib/formatters";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useTranslations, useWorkspaceLanguage } from "@/src/components/language/language-context";
import { languageToLocale } from "@/src/lib/i18n";
import { getLocalizedCategoryName } from "@/src/lib/category-locale";
import { cn } from "@/lib/utils";
import { CraftedBudgetAlertList } from "@/src/components/budget/crafted-budget-alert-list";
import type { BudgetDashboardSelection } from "@/src/lib/budget-summary";
import type { BudgetAlertSelection } from "@/src/lib/budget-alerts";
import type { WorkspaceBalanceStatus } from "@/src/lib/workspace-balance";

type CraftedCategoryRow = {
  name: string;
  slug: string;
  count: number;
  spent: number;
  saved: number;
  pct: number;
  tone: "accent" | "foreground" | "green" | "muted";
};

type CraftedGoalRow = {
  id: string;
  title: string;
  progressAmount: number;
  targetAmount: number;
  progressPercent: number;
  note: string;
  icon: CraftedIconName;
};

type CraftedRecentEntry = {
  id: string;
  title: string;
  category: { name: string; slug?: string | null };
  date: Date;
  realCost: unknown;
  alternativeCost: unknown;
  savedAmount: unknown;
};

export type CraftedDashboardProps = {
  monthLabel: string;
  monthRealSpent: number;
  monthSaved: number;
  monthLargeComparisonImpact: number;
  monthDelta: number | null;
  monthTrend: number[];
  spentToday: number;
  entriesTodayCount: number;
  entriesCountMonth: number;
  categories: CraftedCategoryRow[];
  currentStreak: number;
  streakWeek: boolean[];
  habitsTotal: number;
  habitsAvoided: number;
  habitsNote: string | null;
  goals: CraftedGoalRow[];
  recentEntries: CraftedRecentEntry[];
  reflection: { label: string; text: string } | null;
  emptyState: {
    title: string;
    description: string;
    note: string;
    actionLabel: string;
  } | null;
  coupleBalance: {
    supported: boolean;
    status: WorkspaceBalanceStatus;
    amount: number;
    counterpartLabel: string | null;
  };
  budgetDashboardState: BudgetDashboardSelection;
  budgetAlertSelection: BudgetAlertSelection;
};

const CATEGORY_TONE_CLASS: Record<CraftedCategoryRow["tone"], string> = {
  accent: "bg-accent",
  foreground: "bg-foreground",
  green: "bg-green",
  muted: "bg-ink-3",
};

function CraftedSparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) {
    return null;
  }

  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 24 - (value / max) * 22;
      return `${x},${y}`;
    })
    .join(" ");
  const lastY = 24 - (values[values.length - 1]! / max) * 22;

  return (
    <div className="w-[78px] text-right">
      <svg
        width="78"
        height="26"
        viewBox="0 0 100 26"
        preserveAspectRatio="none"
        className="overflow-visible"
        aria-hidden="true"
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--ink-3)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="100" cy={lastY} r="2.4" fill="var(--accent)" />
      </svg>
      <Label className="mt-1.5 block tracking-[0.14em]">{label}</Label>
    </div>
  );
}

function formatEntryMeta(date: Date, categoryName: string, locale: string, yesterdayLabel: string) {
  const daysAgo = differenceInCalendarDays(new Date(), date);

  if (daysAgo === 0) {
    const time = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
    return `${categoryName} · ${time}`;
  }

  if (daysAgo === 1) {
    return `${categoryName} · ${yesterdayLabel}`;
  }

  return `${categoryName} · ${formatDate(date)}`;
}

function toFiniteNumber(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function getRecentEntryMeta(
  entry: CraftedRecentEntry,
  currencySymbol: string,
  t: ReturnType<typeof useTranslations>,
) {
  const realCost = toFiniteNumber(entry.realCost);
  const alternativeCost = toFiniteNumber(entry.alternativeCost);
  const savedAmount = toFiniteNumber(entry.savedAmount);

  if (realCost === 0 && alternativeCost > 0 && savedAmount > 0) {
    return {
      label: t.entries.avoidedBadge,
      detail: t.entries.avoidedDesc,
      tone: "accent" as const,
    };
  }

  if (savedAmount > 0) {
    return {
      label: t.entries.comparisonBadge,
      detail: t.entries.comparisonSaved,
      tone: "accent" as const,
    };
  }

  if (savedAmount < 0) {
    return {
      label: t.entries.comparisonBadge,
      detail: t.entries.comparisonSpentMore,
      tone: "default" as const,
    };
  }

  return null;
}

export function CraftedDashboard({
  monthLabel,
  monthRealSpent,
  monthSaved,
  monthLargeComparisonImpact,
  monthDelta,
  monthTrend,
  spentToday,
  entriesTodayCount,
  entriesCountMonth,
  categories,
  currentStreak,
  streakWeek,
  habitsTotal,
  habitsAvoided,
  habitsNote,
  goals,
  recentEntries,
  reflection,
  emptyState,
  coupleBalance,
  budgetDashboardState,
  budgetAlertSelection,
}: CraftedDashboardProps) {
  const currencySymbol = useCurrencySymbol();
  const language = useWorkspaceLanguage();
  const locale = languageToLocale(language);
  const t = useTranslations();
  return (
    <Stagger className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="mb-3 block">{t.dashboard.spentMonth}</Label>
            <CraftedOdometer
              value={monthRealSpent}
              integerClassName="text-[clamp(3.5rem,18vw,5.25rem)] font-semibold leading-[0.84] tracking-[-0.055em]"
              fractionWrapperClassName="mt-1 flex flex-col"
              fractionClassName="text-[27px] font-medium leading-none text-muted-foreground"
              suffixClassName="mt-1 text-lg text-accent"
            />
          </div>
          <CraftedSparkline values={monthTrend} label={t.dashboard.sixMonthsLabel} />
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Label className="mb-1.5 block">{monthLabel} — {t.dashboard.netImpact}</Label>
            <Mono className="text-xl font-medium">
              <CraftedAmount value={monthSaved} />
              <span className="text-xs text-accent">{currencySymbol}</span>
            </Mono>
            {monthLargeComparisonImpact > 0 ? (
            <Mono className="mt-1 block text-[11px] text-ink-3">
                {t.dashboard.largeComparisons}: {formatCraftedCompact(monthLargeComparisonImpact)}{currencySymbol}
              </Mono>
            ) : null}
          </div>

          {monthDelta !== null && monthDelta !== 0 ? (
            <span className="shrink-0 rounded-full border border-line px-[9px] py-[3px] text-right text-[11.5px] text-muted-foreground">
              <Mono>
                <CraftedAmount value={Math.abs(monthDelta)} />
              </Mono>
              {currencySymbol} {monthDelta > 0 ? t.dashboard.moreThanLast : t.dashboard.lessThanLast} {t.dashboard.thanLastMonth}
            </span>
          ) : null}
        </div>

        <p className="mt-[var(--sp-stack)] text-[22px] leading-[1.15]">
          <Serif className="text-muted-foreground">{t.dashboard.realSpendingFirst} </Serif>
          <Serif>{t.dashboard.comesFirst}</Serif>
        </p>

        {reflection ? (
          <div className="mt-5">
            <Label className="mb-2 block">{reflection.label}</Label>
            <Serif className="text-sm text-muted-foreground">{reflection.text}</Serif>
          </div>
        ) : null}
      </section>

      <StatTrio
        items={[
          {
            label: t.dashboard.spentToday,
            value: <CraftedAmount value={spentToday} />,
            suffix: currencySymbol,
          },
          {
            label: t.dashboard.entriesToday,
            value: (
              <CraftedAmount
                value={entriesTodayCount}
                maximumFractionDigits={0}
              />
            ),
          },
        ]}
      />

      <div className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <DashboardQuickActions />
      </div>
      <Rule />

      {coupleBalance.supported && coupleBalance.amount !== 0 ? (
        <>
          <div className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
            <Label className="mb-2 block">{t.dashboard.coupleBalance}</Label>
            <Mono className="text-xl font-medium">
              {formatCraftedCompact(Math.abs(coupleBalance.amount))}
              <span className="text-xs text-accent">{currencySymbol}</span>
            </Mono>
            {coupleBalance.counterpartLabel ? (
              <Serif className="mt-2 block text-sm text-ink-3">
                {coupleBalance.status === "they-owe"
                  ? t.coupleBalance.theyOwe(coupleBalance.counterpartLabel)
                  : t.coupleBalance.youOwe(coupleBalance.counterpartLabel)}
              </Serif>
            ) : null}
          </div>
          <Rule />
        </>
      ) : null}

      {categories.length > 0 ? (
        <>
          <div className="flex items-baseline justify-between px-5 pb-1.5 pt-6">
            <Label>{t.dashboard.whereSpending}</Label>
            <Mono className="text-[11px] text-ink-3">{categories.length} {t.dashboard.categoriesCount}</Mono>
          </div>
          <div className="px-5 pb-1">
            <div className="nlc-grow-x mb-4 flex h-[9px] gap-0.5 overflow-hidden">
              {categories.map((category) => (
                <div
                  key={category.slug}
                  className={cn("rounded-[1px]", CATEGORY_TONE_CLASS[category.tone])}
                  style={{ width: `${category.pct}%` }}
                />
              ))}
            </div>
            {categories.map((category, index) => (
              <div key={category.slug}>
                <div className="flex items-center gap-3 py-2.5">
                  <span
                    className={cn(
                      "size-[7px] shrink-0 rounded-[2px]",
                      CATEGORY_TONE_CLASS[category.tone],
                    )}
                  />
                  <CraftedIcon
                    name={getCategoryCraftedIcon(category)}
                    size={18}
                    className="text-muted-foreground"
                  />
                  <div className="flex-1">
                    <span className="block text-sm font-[450]">{getLocalizedCategoryName(category.slug, language) ?? category.name}</span>
                  </div>
                  <Mono className="mr-3 whitespace-nowrap text-[11px] text-ink-3">
                    {category.count} {t.dashboard.movAbbr}
                  </Mono>
                  <Mono className="whitespace-nowrap text-sm font-medium">
                    {formatCraftedCompact(category.spent)}
                    <span className="text-[11px] text-accent">{currencySymbol}</span>
                  </Mono>
                </div>
                {index < categories.length - 1 ? <Rule soft /> : null}
              </div>
            ))}
          </div>
          <Rule />
        </>
      ) : null}

      <div className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <Label className="mb-3 block">{t.dashboard.budgetSectionLabel}</Label>
        <CraftedBudgetAlertList
          alerts={budgetAlertSelection.primaryAlerts}
          title={t.dashboard.budgetAlertTitle}
          description={t.dashboard.budgetAlertDesc}
          className="mb-4"
        />
        {budgetDashboardState.hasAnyBudget ? (
          <div className="space-y-4">
            {budgetDashboardState.mainBudget ? (
              <CraftedBudgetSummary
                budget={budgetDashboardState.mainBudget}
                manageHref="/workspace/budgets"
                manageLabel={t.dashboard.manageBudget}
              />
            ) : (
              <div className="border border-line bg-surface-muted/35 rounded-[var(--r-card)] px-4 py-4">
                <Serif className="text-sm text-muted-foreground">
                  {t.dashboard.onlyCategoryBudgets}
                </Serif>
                <div className="mt-4">
                  <Button asChild variant="outline" className="h-10 rounded-[var(--r-cta)] border-line px-4">
                    <Link href="/workspace/budgets">{t.dashboard.manageBudget}</Link>
                  </Button>
                </div>
              </div>
            )}

            {budgetDashboardState.categoryBudgets.length > 0 ? (
              <div className="space-y-3">
                <Label className="mb-1 block">{t.dashboard.categoryBudgetsLabel}</Label>
                {budgetDashboardState.categoryBudgets.map((budget) => (
                  <CraftedBudgetSummary
                    key={budget.id}
                    budget={budget}
                    compact
                    manageHref="/workspace/budgets"
                    manageLabel={t.dashboard.manageBudget}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <CraftedBudgetSummary
            empty
            title={t.dashboard.firstBudgetTitle}
            description={t.dashboard.firstBudgetDesc}
            actionLabel={t.dashboard.firstBudgetTitle}
            actionHref="/workspace/budgets"
          />
        )}
      </div>
      <Rule />

      <div className="flex">
        <div className="flex-1 border-r border-line px-5 py-5">
          <Label className="mb-3 block">{t.dashboard.streakLabel}</Label>
          <div className="flex items-center gap-2.5">
            <CraftedIcon name="flame" size={26} strokeWidth={1.5} className="text-accent" />
            <div className="flex items-baseline gap-1.5">
              <Mono className="text-[32px] font-semibold leading-none">{currentStreak}</Mono>
              <span className="text-xs text-muted-foreground">{t.dashboard.daysLabel}</span>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            {streakWeek.map((active, index) => (
              <div
                key={index}
                className={cn(
                  "h-[3px] flex-1 rounded-sm",
                  active ? "bg-accent" : "bg-ink-3",
                )}
                style={active ? { opacity: 0.45 + index * 0.09 } : undefined}
              />
            ))}
          </div>
        </div>
        <div className="flex-1 px-5 py-5">
          <Label className="mb-3 block">{t.dashboard.habitsToday}</Label>
          {habitsTotal > 0 ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <Mono className="text-[32px] font-semibold leading-none">
                  {habitsAvoided}
                  <span className="text-ink-3">/{habitsTotal}</span>
                </Mono>
                <span className="text-xs text-muted-foreground">{t.dashboard.avoidedLabel}</span>
              </div>
              {habitsNote ? (
                <Serif className="mt-2.5 block text-sm text-ink-3">{habitsNote}</Serif>
              ) : null}
            </>
          ) : (
            <Serif className="text-sm text-ink-3">{t.dashboard.noHabitsToday}</Serif>
          )}
        </div>
      </div>
      <Rule />

      {goals.length > 0 ? (
        <>
          <div className="px-5 pb-1.5 pt-5">
            <Label>{t.dashboard.goalsLabel}</Label>
          </div>
          <div className="px-5 pb-1.5">
            {goals.map((goal, index) => (
              <div
                key={goal.id}
                className={cn(
                  "py-3",
                  index < goals.length - 1 && "border-b border-line-soft",
                )}
              >
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <CraftedIcon
                      name={goal.icon}
                      size={17}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="truncate text-[15px] font-[450]">{goal.title}</span>
                  </div>
                  <Mono className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {formatCraftedCompact(goal.progressAmount)}{" "}
                    <span className="text-ink-3">/ {formatCraftedCompact(goal.targetAmount)}</span>
                  </Mono>
                </div>
                <ProgressLine value={goal.progressPercent} />
                <Serif className="mt-2 block text-[13px] text-ink-3">{goal.note}</Serif>
              </div>
            ))}
          </div>
          <Rule />
        </>
      ) : null}

      <div className="flex items-baseline justify-between px-5 pb-1 pt-5">
        <Label>{t.dashboard.recentEntries}</Label>
        {entriesCountMonth > 0 ? (
          <Mono className="text-[11px] text-ink-3">
            {entriesCountMonth} {t.dashboard.inMonth} {monthLabel.toLowerCase()}
          </Mono>
        ) : null}
      </div>

      {recentEntries.length > 0 ? (
        <div className="px-[var(--sp-page-x)] pb-6">
          {recentEntries.map((entry, index) => {
            const meta = getRecentEntryMeta(entry, currencySymbol, t);

            return (
              <div key={entry.id}>
                <Link
                  href={`/entries/${entry.id}/edit`}
                  className="flex min-h-12 items-center gap-4 py-[var(--sp-row-y)] transition-opacity hover:opacity-80"
                >
                  <CraftedIcon
                    name={getCategoryCraftedIcon(entry.category)}
                    size={20}
                    className="shrink-0 text-muted-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-[450]">{entry.title}</p>
                    <Mono className="mt-0.5 block text-[11px] leading-4 tracking-[0.02em] text-ink-3">
                      {formatEntryMeta(entry.date, getLocalizedCategoryName(entry.category.slug, language) ?? entry.category.name, locale, t.common.yesterday)}
                    </Mono>
                    {meta ? (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={cn(
                            "rounded-full border px-[9px] py-[3px] text-[10px] font-medium uppercase leading-none tracking-[0.12em]",
                            meta.tone === "accent"
                              ? "border-accent/30 text-accent"
                              : "border-border text-foreground",
                          )}
                        >
                          {meta.label}
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
                  <Mono className="shrink-0 text-[15px] font-medium">
                    {formatCraftedEntryAmount(entry.realCost)}
                    <span className="align-baseline text-[11px] text-accent">{currencySymbol}</span>
                  </Mono>
                </Link>
                {index < recentEntries.length - 1 ? <Rule soft /> : null}
              </div>
            );
          })}
          <div className="pt-4">
            <Button asChild variant="outline" className="h-10 rounded-[var(--r-cta)] border-line px-4">
              <Link href="/entries">{t.dashboard.viewAllEntries}</Link>
            </Button>
          </div>
        </div>
      ) : emptyState ? (
        <CraftedDashboardEmptyState
          title={emptyState.title}
          description={emptyState.description}
          actionLabel={emptyState.actionLabel}
        />
      ) : null}

      {recentEntries.length > 0 ? (
        <div className="border-t border-line px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
          <Button asChild className="h-11 w-full rounded-[var(--r-cta)]">
            <Link href="/entries/new">{t.dashboard.addEntry}</Link>
          </Button>
        </div>
      ) : null}
    </Stagger>
  );
}
