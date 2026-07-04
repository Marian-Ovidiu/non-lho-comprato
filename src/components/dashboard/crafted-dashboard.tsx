"use client";

import Link from "next/link";
import {
  BarChart3,
  ChevronRight,
  CalendarDays,
  Layers3,
  Minus,
  Plus,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import {
  useBoundLocale,
  useLocaleFormatters,
} from "@/src/components/language/use-locale-formatters";
import { getLocalizedCategoryName } from "@/src/lib/category-locale";
import { languageToLocale } from "@/src/lib/i18n";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import {
  useTranslations,
  useWorkspaceLanguage,
} from "@/src/components/language/language-context";
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

type EntryBadgeKind = "evitata" | "confronto";

type DisplayEntry = {
  id: string;
  title: string;
  cat: string;
  amount: number;
  when: string;
  badge: EntryBadgeKind | null;
  saved: number | null;
  avoided: number | null;
  icon: CraftedIconName;
  href: string;
};

export type CraftedDashboardProps = {
  monthLabel: string;
  monthRealSpent: number;
  monthSaved: number;
  monthDelta: number | null;
  monthTrend: number[];
  spentToday: number;
  netImpactToday: number;
  entriesTodayCount: number;
  entriesCountMonth: number;
  categories: CraftedCategoryRow[];
  currentStreak: number;
  streakWeek: boolean[];
  habitsTotal: number;
  habitsAvoided: number;
  habitsNote: string | null;
  nextHabitPayment: {
    id: string;
    name: string;
    amount: number;
    nextDate: string;
    relativeLabel: string;
    shortDate: string;
    frequencyLabel: string;
    icon: CraftedIconName;
  } | null;
  dailyPaceComparison: {
    dayOfMonth: number;
    todaySpent: number;
    averageSameDay: number | null;
    averageSampleSize: number;
    previousMonthSpent: number | null;
    previousMonthDateKey: string | null;
  };
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

const CATEGORY_COLORS = [
  "bg-accent",
  "bg-destructive",
  "bg-success",
  "bg-foreground/60",
  "bg-ink-3",
] as const;

const PREVIEW = {
  month: {
    spent: 842.4,
    impact: 186.2,
    deltaPct: -12.4,
    spark: [520, 610, 480, 720, 905, 842],
  },
  today: { spent: 14.5, impact: 9, count: 3 },
  couple: { partner: "Marta", you: 432.1, them: 410.3, balance: 21.8 },
  categories: [
    { key: "caffe", label: "Caffè", amount: 92.4, count: 18, pct: 11 },
    { key: "delivery", label: "Delivery", amount: 214, count: 9, pct: 25 },
    { key: "shopping", label: "Shopping", amount: 318.5, count: 6, pct: 38 },
    { key: "trasporti", label: "Trasporti", amount: 87.2, count: 11, pct: 10 },
    { key: "svago", label: "Svago", amount: 130.3, count: 4, pct: 16 },
  ],
  budget: { label: "Budget mensile", used: 842.4, total: 1100, daysLeft: 6 },
  streak: { days: 12, subject: "sotto budget caffè" },
  recurring: { doneToday: 2, totalToday: 4 },
  goals: [{ title: "Volo Lisbona", current: 218, target: 380 }],
  entries: [
    { title: "Cappuccino al bar", cat: "Caffè", amount: 1.5, when: "Oggi · 08:14" },
    {
      title: "Sushi delivery",
      cat: "Delivery",
      amount: 28.5,
      when: "Ieri · 20:42",
      badge: "confronto",
      saved: 6.5,
    },
    {
      title: "Felpa vintage",
      cat: "Shopping",
      amount: 0,
      when: "Ieri · 17:03",
      badge: "evitata",
      avoided: 65,
    },
    { title: "Spesa COOP", cat: "Shopping", amount: 42.18, when: "27 giu · 11:08" },
  ],
};

function toFiniteNumber(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatEURBase(
  locale: string,
  value: number,
  currencySymbol: string,
  options: { sign?: "auto" | "never"; decimals?: boolean } = {},
) {
  const sign = options.sign === "auto" ? (value > 0 ? "+" : value < 0 ? "−" : "") : "";
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: options.decimals === false ? 0 : 2,
    maximumFractionDigits: options.decimals === false ? 0 : 2,
  }).format(Math.abs(value));

  return `${sign}${currencySymbol}${formatted}`;
}

function SectionHeader({
  eyebrow,
  title,
  action,
  href,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <Label className="mb-1.5 block">{eyebrow}</Label>
        <h2 className="text-[16px] font-semibold leading-tight">{title}</h2>
      </div>
      {action && href ? (
        <Link
          href={href}
          className="shrink-0 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {action}
        </Link>
      ) : null}
    </div>
  );
}

function IconBubble({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground">
      {Icon ? <Icon className="size-4" aria-hidden="true" /> : children}
    </span>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 36 - ((value - min) / range) * 32;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="mt-5 h-10 w-full overflow-visible"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function QuickActionRow({
  href,
  icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="nlc-press flex min-h-14 items-center gap-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <IconBubble icon={icon} />
      <span className="min-w-0 flex-1 text-[15px] font-medium">{label}</span>
      <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
    </Link>
  );
}

function compareSpending(todaySpent: number, reference: number | null) {
  if (reference === null) {
    return "muted" as const;
  }

  const diff = todaySpent - reference;
  if (Math.abs(diff) < 0.01) {
    return "accent" as const;
  }

  return diff < 0 ? ("success" as const) : ("destructive" as const);
}

function ComparisonIcon({ tone }: { tone: ReturnType<typeof compareSpending> }) {
  if (tone === "muted" || tone === "accent") {
    return <Minus className="size-3.5" aria-hidden="true" />;
  }

  return tone === "success" ? (
    <TrendingDown className="size-3.5" aria-hidden="true" />
  ) : (
    <TrendingUp className="size-3.5" aria-hidden="true" />
  );
}

function DailyComparisonCard({
  label,
  todaySpent,
  reference,
  referenceLabel,
  emptyLabel,
  currencySymbol,
}: {
  label: string;
  todaySpent: number;
  reference: number | null;
  referenceLabel: string;
  emptyLabel: string;
  currencySymbol: string;
}) {
  const formatEUR = useBoundLocale(formatEURBase);
  const tone = compareSpending(todaySpent, reference);

  return (
    <div
      className={cn(
        "min-h-[118px] rounded-[var(--r-card)] border p-3.5",
        tone === "success" && "border-success/30 bg-success/10",
        tone === "accent" && "border-accent/35 bg-accent/10",
        tone === "destructive" && "border-destructive/30 bg-destructive/10",
        tone === "muted" && "border-line bg-surface-muted",
      )}
    >
      <div
        className={cn(
          "mb-3 flex items-center justify-between gap-2",
          tone === "success" && "text-success",
          tone === "accent" && "text-accent",
          tone === "destructive" && "text-destructive",
          tone === "muted" && "text-ink-3",
        )}
      >
        <Label>{label}</Label>
        <ComparisonIcon tone={tone} />
      </div>
      {reference === null ? (
        <Serif className="block text-[13px] leading-4 text-ink-3">{emptyLabel}</Serif>
      ) : (
        <p className="text-[13px] leading-5 text-muted-foreground">
          <Mono className="text-foreground">
            {formatEUR(todaySpent, currencySymbol, { decimals: false })}
          </Mono>{" "}
          spesi su{" "}
          <Mono className="text-foreground">
            {formatEUR(reference, currencySymbol, { decimals: false })}
          </Mono>{" "}
          {referenceLabel}
        </p>
      )}
    </div>
  );
}

function NextHabitPaymentCard({
  habit,
  currencySymbol,
}: {
  habit: NonNullable<CraftedDashboardProps["nextHabitPayment"]>;
  currencySymbol: string;
}) {
  const formatEUR = useBoundLocale(formatEURBase);
  return (
    <Link
      href="/habits"
      className="nlc-press flex min-h-[88px] items-center gap-3 rounded-[var(--r-card)] border border-line bg-surface-muted p-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-background text-muted-foreground">
        <CraftedIcon name={habit.icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Label>{habit.relativeLabel}</Label>
          <span className="text-[11px] text-ink-3">{habit.shortDate}</span>
        </div>
        <p className="truncate text-[15px] font-medium">{habit.name}</p>
        <Serif className="mt-0.5 block truncate text-[12px] text-ink-3">
          {habit.frequencyLabel.toLowerCase()}
        </Serif>
      </div>
      <div className="shrink-0 text-right">
        <Mono className="block text-[16px] font-semibold">
          {formatEUR(habit.amount, currencySymbol)}
        </Mono>
        <CalendarDays className="ml-auto mt-1 size-3.5 text-ink-3" aria-hidden="true" />
      </div>
    </Link>
  );
}

function BudgetBlock({
  budget,
  currencySymbol,
}: {
  budget: BudgetDashboardSelection["mainBudget"];
  currencySymbol: string;
}) {
  const formatEUR = useBoundLocale(formatEURBase);
  const used = budget?.spentAmount ?? PREVIEW.budget.used;
  const total = budget?.budgetAmount ?? PREVIEW.budget.total;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const remaining = budget?.remainingAmount ?? PREVIEW.budget.total - PREVIEW.budget.used;
  const daysLeft = budget
    ? Math.max(0, Math.ceil(((100 - budget.timeProgressPercentage) / 100) * 30))
    : PREVIEW.budget.daysLeft;
  const tone = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-accent" : "bg-success";

  return (
    <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
      <SectionHeader eyebrow="Budget" title={budget?.title ?? PREVIEW.budget.label} action="Gestisci" href="/budget#gestione-budget" />
      <div className="flex items-end gap-2">
        <Mono className="text-[26px] font-semibold leading-none">
          {formatEUR(used, currencySymbol, { decimals: false })}
        </Mono>
        <span className="pb-0.5 text-[13px] text-ink-3">
          di <Mono>{formatEUR(total, currencySymbol, { decimals: false })}</Mono>
        </span>
      </div>
      <ProgressLine value={pct} className="mt-4 bg-line-soft" indicatorClassName={tone} />
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <Serif className={cn("text-ink-3", remaining < 0 && "text-destructive")}>
          Restano {formatEUR(remaining, currencySymbol, { sign: "auto", decimals: false })} · {daysLeft} giorni
        </Serif>
        <Mono className="text-muted-foreground">{pct}%</Mono>
      </div>
    </section>
  );
}

function formatEntryWhen(date: Date, locale: string) {
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (sameDay) {
    return `Oggi · ${time}`;
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return `Ieri · ${time}`;
  }

  const day = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(date);
  return `${day} · ${time}`;
}

function EntryBadge({ kind }: { kind: EntryBadgeKind }) {
  const isAvoided = kind === "evitata";

  return (
    <span
      className={cn(
        "shrink-0 rounded-[var(--r-chip)] border px-2 py-1 text-[9.5px] font-semibold uppercase leading-none tracking-[0.12em]",
        isAvoided ? "border-success/45 text-success" : "border-accent/45 text-accent",
      )}
    >
      {isAvoided ? "Evitata" : "Confronto"}
    </span>
  );
}

export function CraftedDashboard({
  monthLabel,
  monthRealSpent,
  monthSaved,
  monthDelta,
  monthTrend,
  spentToday,
  netImpactToday,
  entriesTodayCount,
  entriesCountMonth,
  categories,
  currentStreak,
  habitsTotal,
  habitsAvoided,
  habitsNote,
  nextHabitPayment,
  dailyPaceComparison,
  goals,
  recentEntries,
  reflection,
  coupleBalance,
  budgetDashboardState,
}: CraftedDashboardProps) {
  const formatEUR = useBoundLocale(formatEURBase);
  const { formatCraftedCompact } = useLocaleFormatters();
  const currencySymbol = useCurrencySymbol();
  const language = useWorkspaceLanguage();
  const locale = languageToLocale(language);
  const t = useTranslations();
  const usePreview = entriesCountMonth === 0 && recentEntries.length === 0;

  const displayMonthSpent = usePreview ? PREVIEW.month.spent : monthRealSpent;
  const displayMonthImpact = usePreview ? PREVIEW.month.impact : monthSaved;
  const displayDeltaPct =
    monthDelta !== null && monthRealSpent > 0
      ? Math.round((monthDelta / Math.max(monthRealSpent - monthDelta, 1)) * 1000) / 10
      : PREVIEW.month.deltaPct;
  const trendDown = displayDeltaPct <= 0;
  const sparkValues = monthTrend.length >= 2 ? monthTrend : PREVIEW.month.spark;
  const displaySpentToday = usePreview ? PREVIEW.today.spent : spentToday;
  const displayImpactToday = usePreview ? PREVIEW.today.impact : netImpactToday;
  const displayEntriesToday = usePreview ? PREVIEW.today.count : entriesTodayCount;
  const displayCategories =
    categories.length > 0
      ? categories.map((category) => ({
          key: category.slug,
          label: getLocalizedCategoryName(category.slug, language) ?? category.name,
          amount: category.spent,
          count: category.count,
          pct: category.pct,
          icon: getCategoryCraftedIcon({ slug: category.slug, name: category.name }),
        }))
      : PREVIEW.categories.map((category) => ({
          ...category,
          icon: getCategoryCraftedIcon({ slug: category.key, name: category.label }),
        }));
  const displayGoals =
    goals.length > 0
      ? goals.map((goal) => ({
          id: goal.id,
          title: goal.title,
          current: goal.progressAmount,
          target: goal.targetAmount,
          pct: goal.progressPercent,
          icon: goal.icon,
          note: goal.note,
        }))
      : PREVIEW.goals.map((goal, index) => ({
          id: `preview-goal-${index}`,
          title: goal.title,
          current: goal.current,
          target: goal.target,
          pct: Math.round((goal.current / goal.target) * 100),
          icon: "plane" as CraftedIconName,
          note: "finanziato dagli evitati",
        }));
  const displayEntries: DisplayEntry[] =
    recentEntries.length > 0
      ? recentEntries.map((entry) => {
          const realCost = toFiniteNumber(entry.realCost);
          const alternativeCost = toFiniteNumber(entry.alternativeCost);
          const savedAmount = toFiniteNumber(entry.savedAmount);
          const isAvoided = realCost === 0 && alternativeCost > 0 && savedAmount > 0;
          const isComparison = !isAvoided && savedAmount !== 0;

          return {
            id: entry.id,
            title: entry.title,
            cat:
              getLocalizedCategoryName(entry.category.slug ?? "", language) ??
              entry.category.name,
            amount: realCost,
            when: formatEntryWhen(entry.date, locale),
            badge: isAvoided
              ? ("evitata" as const)
              : isComparison
                ? ("confronto" as const)
                : null,
            saved: isComparison ? Math.abs(savedAmount) : null,
            avoided: isAvoided ? Math.abs(savedAmount) : null,
            icon: getCategoryCraftedIcon(entry.category),
            href: `/entries/${entry.id}/edit`,
          };
        })
      : PREVIEW.entries.map((entry, index) => ({
          id: `preview-entry-${index}`,
          title: entry.title,
          cat: entry.cat,
          amount: entry.amount,
          when: entry.when,
          badge:
            entry.badge === "evitata" || entry.badge === "confronto"
              ? entry.badge
              : null,
          saved: entry.saved ?? null,
          avoided: entry.avoided ?? null,
          icon: getCategoryCraftedIcon({ slug: entry.cat.toLowerCase(), name: entry.cat }),
          href: "/entries/new",
        }));
  const partner = coupleBalance.counterpartLabel ?? PREVIEW.couple.partner;
  const coupleAmount = coupleBalance.supported ? coupleBalance.amount : PREVIEW.couple.balance;
  const coupleIsTheyOwe = coupleBalance.supported
    ? coupleBalance.status !== "you-owe"
    : true;
  const coupleYou = coupleBalance.supported
    ? Math.max(coupleAmount, 0)
    : PREVIEW.couple.you;
  const coupleThem = coupleBalance.supported ? 0 : PREVIEW.couple.them;
  const recurringTotal = habitsTotal > 0 ? habitsTotal : PREVIEW.recurring.totalToday;
  const recurringDone = habitsTotal > 0 ? habitsAvoided : PREVIEW.recurring.doneToday;

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-[var(--sp-page-x)] pb-[var(--sp-section-y)] pt-4">
        <div className="flex items-start justify-between gap-4">
          <Label className="pt-1">{t.dashboard.spentMonth}</Label>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--r-chip)] border border-line px-2.5 py-1.5 text-[11px] text-muted-foreground">
            {trendDown ? (
              <TrendingDown className="size-3.5 text-success" aria-hidden="true" />
            ) : (
              <TrendingUp className="size-3.5 text-destructive" aria-hidden="true" />
            )}
            <Mono>{displayDeltaPct > 0 ? "+" : "−"}{Math.abs(displayDeltaPct).toLocaleString(locale)}%</Mono>
          </span>
        </div>
        <Mono className="mt-4 block whitespace-nowrap text-[44px] font-semibold leading-none tracking-[-0.02em]">
          {formatEUR(displayMonthSpent, currencySymbol)}
        </Mono>
        <div className="mt-3 flex items-end justify-between gap-3">
          <Serif className="text-[15px] text-muted-foreground">
            {monthLabel.toLowerCase()} · {t.dashboard.netImpact}
          </Serif>
          <Mono
            className={cn(
              "shrink-0 text-[17px] font-medium",
              displayMonthImpact >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {formatEUR(displayMonthImpact, currencySymbol, { sign: "auto" })}
          </Mono>
        </div>
        <Sparkline values={sparkValues} />
        <Serif className="mt-3 block text-[13px] text-ink-3">
          {reflection?.text ??
            (trendDown
              ? "Il ritmo del mese sta scendendo, senza confondere spese e impatto."
              : "Questo mese sta accelerando: tieni d'occhio budget e categorie.")}
        </Serif>
      </section>
      <Rule soft />

      <StatTrio
        className="border-y-0"
        items={[
          { label: t.dashboard.spentToday, value: formatEUR(displaySpentToday, currencySymbol) },
          {
            label: "Impatto oggi",
            value: formatEUR(displayImpactToday, currencySymbol, { sign: "auto" }),
          },
          { label: "Movimenti", value: displayEntriesToday },
        ]}
      />
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <SectionHeader eyebrow="In coda" title="Prossimo pagamento" action="Abitudini →" href="/habits" />
        {nextHabitPayment ? (
          <NextHabitPaymentCard
            habit={nextHabitPayment}
            currencySymbol={currencySymbol}
          />
        ) : (
          <div className="rounded-[var(--r-card)] border border-line bg-surface-muted p-4">
            <Serif className="block text-sm text-ink-3">
              Nessuna ricorrente attiva con un pagamento previsto.
            </Serif>
          </div>
        )}
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <SectionHeader eyebrow="Ritmo oggi" title="Confronto di giornata" />
        <div className="grid grid-cols-2 gap-3">
          <DailyComparisonCard
            label={`Giorno ${dailyPaceComparison.dayOfMonth || "—"}`}
            todaySpent={dailyPaceComparison.todaySpent}
            reference={dailyPaceComparison.averageSameDay}
            referenceLabel="medi"
            emptyLabel="Serve almeno un mese precedente con questo giorno."
            currencySymbol={currencySymbol}
          />
          <DailyComparisonCard
            label="Mese scorso"
            todaySpent={dailyPaceComparison.todaySpent}
            reference={dailyPaceComparison.previousMonthSpent}
            referenceLabel="il mese scorso"
            emptyLabel="Nessun movimento nello stesso giorno del mese scorso."
            currencySymbol={currencySymbol}
          />
        </div>
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <QuickActionRow href="/entries/new" icon={PlusCircle} label="Registra spesa" />
        <Rule soft />
        <QuickActionRow href="/presets" icon={Layers3} label="Preset rapidi" />
        <Rule soft />
        <QuickActionRow href="/stats" icon={BarChart3} label="Statistiche" />
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <SectionHeader eyebrow="Bilancio coppia" title={`Con ${partner}`} />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div>
            <p className="text-xs text-ink-3">Tu</p>
            <Mono className="mt-1 block text-[18px] font-medium">
              {formatEUR(coupleYou, currencySymbol)}
            </Mono>
          </div>
          <div className="h-8 w-px bg-line" aria-hidden="true" />
          <div className="text-right">
            <p className="text-xs text-ink-3">{partner}</p>
            <Mono className="mt-1 block text-[18px] font-medium">
              {formatEUR(coupleThem, currencySymbol)}
            </Mono>
          </div>
        </div>
        <div className="mt-4 flex min-h-10 items-center justify-between gap-3 rounded-[var(--r-control)] bg-surface-muted px-3 py-2">
          <span className="text-[13px] text-muted-foreground">
            {coupleIsTheyOwe ? `${partner} ti deve` : `Devi a ${partner}`}
          </span>
          <Mono className={coupleIsTheyOwe ? "text-accent" : "text-destructive"}>
            {formatEUR(coupleAmount, currencySymbol, { sign: "auto" })}
          </Mono>
        </div>
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <SectionHeader eyebrow="Categorie" title="Dove stai spendendo" />
        <div className="mb-4 flex h-1.5 overflow-hidden rounded-full bg-line-soft">
          {displayCategories.map((category, index) => (
            <span
              key={category.key}
              className={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
              style={{ width: `${category.pct}%` }}
              aria-hidden="true"
            />
          ))}
        </div>
        {displayCategories.map((category, index) => (
          <div key={category.key}>
            <div className="flex min-h-14 items-center gap-3 py-2.5">
              <IconBubble>
                <CraftedIcon name={category.icon} size={17} />
              </IconBubble>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{category.label}</p>
                <p className="mt-0.5 text-xs text-ink-3">
                  {category.count} movimenti · {category.pct}%
                </p>
              </div>
              <Mono className="shrink-0 text-[14px] font-medium">
                {formatEUR(category.amount, currencySymbol)}
              </Mono>
            </div>
            {index < displayCategories.length - 1 ? <Rule soft /> : null}
          </div>
        ))}
      </section>
      <Rule soft />

      <BudgetBlock
        budget={budgetDashboardState.mainBudget}
        currencySymbol={currencySymbol}
      />
      <Rule soft />

      <section className="grid grid-cols-2 gap-3 px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="rounded-[var(--r-card)] border border-line p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Label>Streak</Label>
            <CraftedIcon name="flame" size={17} className="text-accent" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <Mono className="text-[28px] font-semibold leading-none">
              {currentStreak > 0 ? currentStreak : PREVIEW.streak.days}
            </Mono>
            <span className="text-xs text-muted-foreground">giorni</span>
          </div>
          <Serif className="mt-2 block text-xs text-ink-3">
            {habitsNote ?? PREVIEW.streak.subject}
          </Serif>
        </div>
        <Link
          href="/habits"
          className="nlc-press rounded-[var(--r-card)] border border-line p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <Label>Ricorrenti oggi</Label>
            <Mono className="text-[12px] text-muted-foreground">
              {recurringDone}/{recurringTotal}
            </Mono>
          </div>
          <Mono className="block text-[28px] font-semibold leading-none">
            {Math.max(recurringTotal - recurringDone, 0)}
          </Mono>
          <ProgressLine
            value={recurringTotal > 0 ? (recurringDone / recurringTotal) * 100 : 0}
            className="mt-4 bg-line-soft"
          />
        </Link>
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <SectionHeader eyebrow="Obiettivi" title="Mete attive" />
        {displayGoals.map((goal, index) => (
          <div key={goal.id}>
            <div className="flex items-center gap-3 py-2.5">
              <IconBubble>
                <CraftedIcon name={goal.icon} size={17} />
              </IconBubble>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{goal.title}</p>
                <Serif className="mt-0.5 block text-xs text-ink-3">
                  {goal.note}
                </Serif>
              </div>
              <Mono className="shrink-0 text-right text-xs text-muted-foreground">
                {formatCraftedCompact(goal.current)}
                <span className="text-ink-3"> / {formatCraftedCompact(goal.target)}</span>
              </Mono>
            </div>
            <ProgressLine value={goal.pct} className="mb-3 bg-line-soft" />
            {index < displayGoals.length - 1 ? <Rule soft /> : null}
          </div>
        ))}
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <SectionHeader eyebrow="Ultimi movimenti" title="Movimenti" action="Tutti →" href="/entries" />
        {displayEntries.map((entry, index) => (
          <div key={entry.id}>
            <Link
              href={entry.href}
              className="nlc-press flex min-h-16 items-center gap-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <IconBubble>
                <CraftedIcon name={entry.icon} size={17} />
              </IconBubble>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="min-w-0 truncate text-[15px] font-medium">{entry.title}</p>
                  {entry.badge ? <EntryBadge kind={entry.badge} /> : null}
                </div>
                <p className="mt-1 truncate text-xs text-ink-3">
                  {entry.cat} · <Mono>{entry.when}</Mono>
                  {entry.saved ? (
                    <> · risparmiati <Mono>{formatEUR(entry.saved, currencySymbol)}</Mono></>
                  ) : null}
                  {entry.avoided ? (
                    <> · evitati <Mono>{formatEUR(entry.avoided, currencySymbol)}</Mono></>
                  ) : null}
                </p>
              </div>
              <Mono className="shrink-0 text-[15px] font-medium">
                {entry.amount === 0 ? (
                  <span className="text-ink-3">—</span>
                ) : (
                  formatEUR(entry.amount, currencySymbol)
                )}
              </Mono>
            </Link>
            {index < displayEntries.length - 1 ? <Rule soft /> : null}
          </div>
        ))}
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <Button
          asChild
          className="nlc-press h-[54px] w-full rounded-[var(--r-cta)] bg-accent text-accent-foreground hover:bg-accent-hover"
        >
          <Link href="/entries/new">
            <Plus className="size-4" aria-hidden="true" />
            {t.dashboard.addEntry}
          </Link>
        </Button>
      </section>
      <Rule soft />
      <footer className="px-[var(--sp-page-x)] py-5 text-center">
        <p className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
          Non l&apos;ho comprato · v1
        </p>
      </footer>
    </div>
  );
}
