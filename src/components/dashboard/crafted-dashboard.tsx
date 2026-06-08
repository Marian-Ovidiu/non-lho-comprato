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
import { Button } from "@/components/ui/button";
import { formatCraftedCompact, formatCraftedEntryAmount, splitCraftedAmount } from "@/src/lib/crafted-money";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { formatDate } from "@/src/lib/formatters";
import { cn } from "@/lib/utils";

type CraftedCategoryRow = {
  name: string;
  slug: string;
  count: number;
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
  savedAmount: unknown;
};

export type CraftedDashboardProps = {
  monthLabel: string;
  monthSaved: number;
  monthDelta: number | null;
  monthTrend: number[];
  savedToday: number;
  savedWeek: number;
  savedPerDay: number;
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
    amount: number;
    counterpartLabel: string | null;
  };
};

const CATEGORY_TONE_CLASS: Record<CraftedCategoryRow["tone"], string> = {
  accent: "bg-accent",
  foreground: "bg-foreground",
  green: "bg-green",
  muted: "bg-ink-3",
};

function CraftedSparkline({ values }: { values: number[] }) {
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
      <Label className="mt-1.5 block tracking-[0.14em]">6 mesi</Label>
    </div>
  );
}

function formatEntryMeta(date: Date, categoryName: string) {
  const daysAgo = differenceInCalendarDays(new Date(), date);

  if (daysAgo === 0) {
    const time = new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome",
    }).format(date);
    return `${categoryName} · ${time}`;
  }

  if (daysAgo === 1) {
    return `${categoryName} · ieri`;
  }

  return `${categoryName} · ${formatDate(date)}`;
}

export function CraftedDashboard({
  monthLabel,
  monthSaved,
  monthDelta,
  monthTrend,
  savedToday,
  savedWeek,
  savedPerDay,
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
}: CraftedDashboardProps) {
  const heroAmount = splitCraftedAmount(monthSaved);

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      {/* Hero */}
      <section className="px-5 pb-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="mb-4 block">{monthLabel} — finora</Label>
            <div className="flex items-start gap-1.5">
              <Mono className="text-[clamp(3.5rem,18vw,5.25rem)] font-semibold leading-[0.84] tracking-[-0.055em]">
                {heroAmount.whole}
              </Mono>
              <div className="mt-1 flex flex-col">
                <Mono className="text-[27px] font-medium leading-none text-muted-foreground">
                  ,{heroAmount.decimals}
                </Mono>
                <Mono className="mt-1 text-lg text-accent">€</Mono>
              </div>
            </div>
          </div>
          <CraftedSparkline values={monthTrend} />
        </div>

        <p className="mt-3 text-[22px] leading-[1.15]">
          <Serif className="text-muted-foreground">non li hai </Serif>
          <Serif>spesi.</Serif>
        </p>

        {monthDelta !== null && monthDelta !== 0 ? (
          <div className="mt-3.5 flex items-center gap-1.5">
            <CraftedIcon name="arrowUp" size={13} strokeWidth={2} className="text-accent" />
            <span className="text-[12.5px] text-muted-foreground">
              <Mono>{formatCraftedCompact(Math.abs(monthDelta))}</Mono>
              {monthDelta > 0 ? " in più" : " in meno"} rispetto al mese scorso
            </span>
          </div>
        ) : null}

        {reflection ? (
          <div className="mt-5">
            <Label className="mb-2 block">{reflection.label}</Label>
            <Serif className="text-sm text-muted-foreground">{reflection.text}</Serif>
          </div>
        ) : null}
      </section>

      <StatTrio
        items={[
          { label: "Oggi", value: formatCraftedCompact(savedToday), suffix: "€" },
          { label: "Settimana", value: formatCraftedCompact(savedWeek), suffix: "€" },
          { label: "Al giorno", value: formatCraftedCompact(savedPerDay), suffix: "€" },
        ]}
      />

      {/* Categories */}
      {categories.length > 0 ? (
        <>
          <div className="flex items-baseline justify-between px-5 pb-1.5 pt-6">
            <Label>Dove l&apos;hai tenuto</Label>
            <Mono className="text-[11px] text-ink-3">
              {categories.length} categorie
            </Mono>
          </div>
          <div className="px-5 pb-1">
            <div className="mb-4 flex h-[9px] gap-0.5">
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
                  <span className="flex-1 text-sm font-[450]">{category.name}</span>
                  <Mono className="mr-3 whitespace-nowrap text-[11px] text-ink-3">
                    {category.count} mov.
                  </Mono>
                  <Mono className="whitespace-nowrap text-sm font-medium">
                    {formatCraftedCompact(category.saved)}
                    <span className="text-[11px] text-accent">€</span>
                  </Mono>
                </div>
                {index < categories.length - 1 ? <Rule soft /> : null}
              </div>
            ))}
          </div>
          <Rule />
        </>
      ) : null}

      {/* Rhythm: streak + habits */}
      <div className="flex">
        <div className="flex-1 border-r border-line px-5 py-5">
          <Label className="mb-3 block">Streak</Label>
          <div className="flex items-center gap-2.5">
            <CraftedIcon name="flame" size={26} strokeWidth={1.5} className="text-accent" />
            <div className="flex items-baseline gap-1.5">
              <Mono className="text-[32px] font-semibold leading-none">
                {currentStreak}
              </Mono>
              <span className="text-xs text-muted-foreground">giorni</span>
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
          <Label className="mb-3 block">Abitudini oggi</Label>
          {habitsTotal > 0 ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <Mono className="text-[32px] font-semibold leading-none">
                  {habitsAvoided}
                  <span className="text-ink-3">/{habitsTotal}</span>
                </Mono>
                <span className="text-xs text-muted-foreground">evitate</span>
              </div>
              {habitsNote ? (
                <Serif className="mt-2.5 block text-sm text-ink-3">{habitsNote}</Serif>
              ) : null}
            </>
          ) : (
            <Serif className="text-sm text-ink-3">Nessuna abitudine attiva oggi.</Serif>
          )}
        </div>
      </div>
      <Rule />

      {/* Couple balance */}
      {coupleBalance.supported && coupleBalance.amount !== 0 ? (
        <>
          <div className="px-5 py-5">
            <Label className="mb-2 block">Bilancio coppia</Label>
            <Mono className="text-xl font-medium">
              {formatCraftedCompact(Math.abs(coupleBalance.amount))}
              <span className="text-xs text-accent">€</span>
            </Mono>
            {coupleBalance.counterpartLabel ? (
              <Serif className="mt-2 block text-sm text-ink-3">
                {coupleBalance.amount > 0
                  ? `A favore di ${coupleBalance.counterpartLabel}`
                  : `A tuo favore rispetto a ${coupleBalance.counterpartLabel}`}
              </Serif>
            ) : null}
          </div>
          <Rule />
        </>
      ) : null}

      {/* Goals */}
      {goals.length > 0 ? (
        <>
          <div className="px-5 pb-1.5 pt-5">
            <Label>Mete</Label>
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

      {/* Recent entries or empty */}
      <div className="flex items-baseline justify-between px-5 pb-1 pt-5">
        <Label>Ultimi movimenti</Label>
        {entriesCountMonth > 0 ? (
          <Mono className="text-[11px] text-ink-3">
            {entriesCountMonth} a {monthLabel.toLowerCase()}
          </Mono>
        ) : null}
      </div>

      {recentEntries.length > 0 ? (
        <div className="px-5 pb-6">
          {recentEntries.map((entry, index) => (
            <div key={entry.id}>
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
                <Mono className="shrink-0 text-[15px] font-medium">
                  {formatCraftedEntryAmount(entry.savedAmount)}
                  <span className="text-[11px] text-accent">€</span>
                </Mono>
              </Link>
              {index < recentEntries.length - 1 ? <Rule soft /> : null}
            </div>
          ))}
          <div className="pt-4">
            <Button asChild variant="outline" className="h-10 rounded-2xl border-line px-4">
              <Link href="/entries">Vedi tutti i movimenti</Link>
            </Button>
          </div>
        </div>
      ) : emptyState ? (
        <CraftedDashboardEmptyState
          title={emptyState.title}
          description={emptyState.description}
          note={emptyState.note}
          actionLabel={emptyState.actionLabel}
        />
      ) : null}

      {/* Primary CTA when there is activity */}
      {recentEntries.length > 0 ? (
        <div className="border-t border-line px-5 py-5">
          <Button asChild className="h-11 w-full rounded-2xl">
            <Link href="/entries/new">Nuovo movimento</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
