"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Flame,
  PiggyBank,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { CraftedIcon, Label, Mono, Rule, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { languageToLocale } from "@/src/lib/i18n";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import { useWorkspaceLanguage } from "@/src/components/language/language-context";
import type { CraftedIconName } from "@/components/crafted";
import type { MonthlyReportData, MonthlyReportEntry } from "@/src/actions/reports";

type MonthOption = {
  value: string;
  label: string;
};

type CategoryReportRow = {
  id: string;
  name: string;
  icon: CraftedIconName;
  spent: number;
  prev: number;
};

type MonthData = {
  key: string;
  label: string;
  income: number;
  spent: number;
  avoided: number;
  savedToGoals: number;
  daysTracked: number;
  streak: number;
  categories: CategoryReportRow[];
  highlights: {
    biggest: { name: string; amount: number; date: string };
    win: { name: string; amount: number; note: string };
    streak: { days: number; note: string };
  };
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatEUR(
  value: number,
  currencySymbol: string,
  options: { decimals?: 0 | 2; sign?: boolean } = {},
) {
  const sign = options.sign ? (value > 0 ? "+" : value < 0 ? "−" : "") : "";
  const decimals = options.decimals ?? 0;
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  return `${sign}${currencySymbol}${formatted}`;
}

function shortDate(iso: string, language = "it") {
  return new Intl.DateTimeFormat(languageToLocale(language), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(new Date(iso.length === 10 ? `${iso}T00:00:00.000Z` : iso))
    .replace(".", "");
}

function monthParts(monthKey: string) {
  const [yearPart, monthPart] = monthKey.split("-");
  return {
    year: Number(yearPart),
    month: Number(monthPart),
  };
}

function countDaysTracked(entries: MonthlyReportEntry[]) {
  return new Set(entries.map((entry) => entry.date.slice(0, 10))).size;
}

function categoryKey(entry: MonthlyReportEntry) {
  return entry.category.slug ?? entry.category.id ?? entry.category.name;
}

function buildCategoryRows(
  entries: MonthlyReportEntry[],
  previousEntries: MonthlyReportEntry[],
): CategoryReportRow[] {
  const rows = new Map<string, CategoryReportRow>();

  for (const entry of entries) {
    const key = categoryKey(entry);
    const current = rows.get(key) ?? {
      id: key,
      name: entry.category.name,
      icon: getCategoryCraftedIcon(entry.category),
      spent: 0,
      prev: 0,
    };
    current.spent = round2(current.spent + entry.realCost);
    rows.set(key, current);
  }

  for (const entry of previousEntries) {
    const key = categoryKey(entry);
    const current = rows.get(key) ?? {
      id: key,
      name: entry.category.name,
      icon: getCategoryCraftedIcon(entry.category),
      spent: 0,
      prev: 0,
    };
    current.prev = round2(current.prev + entry.realCost);
    rows.set(key, current);
  }

  return Array.from(rows.values())
    .filter((row) => row.spent > 0 || row.prev > 0)
    .sort((left, right) => right.spent - left.spent)
    .slice(0, 6);
}

function getBiggestEntry(entries: MonthlyReportEntry[]) {
  const biggest = [...entries].sort((left, right) => right.realCost - left.realCost)[0];

  return {
    name: biggest?.title ?? "Nessuna uscita",
    amount: biggest?.realCost ?? 0,
    date: biggest?.date ?? new Date().toISOString(),
  };
}

function buildMonthData(report: MonthlyReportData): MonthData {
  const spent = report.overview.totalRealSpent;
  const net = report.overview.netImpact;
  const income = Math.max(0, round2(spent + net));
  const biggestSaving = report.biggestSaving;
  const winAmount = biggestSaving?.savedAmount ?? report.overview.avoidedAmount;

  return {
    key: report.monthKey,
    label: report.monthLabel,
    income,
    spent,
    avoided: report.overview.avoidedAmount,
    savedToGoals: report.overview.avoidedAmount,
    daysTracked: countDaysTracked(report.entries),
    streak: report.streakSummary.bestStreak,
    categories: buildCategoryRows(report.entries, report.previousMonthEntries),
    highlights: {
      biggest: getBiggestEntry(report.entries),
      win: {
        name: biggestSaving?.title ?? "Acquisti evitati",
        amount: winAmount,
        note: biggestSaving?.note ?? "denaro rimasto nel percorso del mese",
      },
      streak: {
        days: report.streakSummary.bestStreak,
        note:
          report.streakSummary.bestStreak > 0
            ? "giorni consecutivi tracciati nel mese"
            : "la serie riparte dal prossimo movimento",
      },
    },
  };
}

function buildPreviousMonthData(report: MonthlyReportData): MonthData {
  const previousEntries = report.previousMonthEntries;
  const spent = round2(previousEntries.reduce((sum, entry) => sum + entry.realCost, 0));
  const avoided = round2(
    previousEntries.reduce(
      (sum, entry) => sum + (entry.mode === "avoided" ? entry.alternativeCost : 0),
      0,
    ),
  );
  const comparisonSaved = round2(
    previousEntries.reduce((sum, entry) => {
      if (entry.mode !== "spent" || entry.savingContext !== "comparison") return sum;
      return sum + Math.max(entry.alternativeCost - entry.realCost, 0);
    }, 0),
  );
  const comparisonOverspent = round2(
    previousEntries.reduce((sum, entry) => {
      if (entry.mode !== "spent" || entry.savingContext !== "comparison") return sum;
      return sum + Math.max(entry.realCost - entry.alternativeCost, 0);
    }, 0),
  );
  const net = round2(avoided + comparisonSaved - comparisonOverspent);

  return {
    key: "",
    label: "mese scorso",
    income: Math.max(0, round2(spent + net)),
    spent,
    avoided,
    savedToGoals: avoided,
    daysTracked: countDaysTracked(previousEntries),
    streak: 0,
    categories: [],
    highlights: {
      biggest: getBiggestEntry(previousEntries),
      win: { name: "Acquisti evitati", amount: avoided, note: "" },
      streak: { days: 0, note: "" },
    },
  };
}

function MonthPicker({
  months,
  selectedMonth,
}: {
  months: MonthOption[];
  selectedMonth: string;
}) {
  const index = months.findIndex((month) => month.value === selectedMonth);
  const currentIndex = index >= 0 ? index : 0;
  const previous = months[currentIndex + 1];
  const next = months[currentIndex - 1];
  const current = months[currentIndex] ?? { value: selectedMonth, label: selectedMonth };

  return (
    <div className="mt-5 grid grid-cols-[36px_minmax(0,1fr)_36px] items-center gap-3">
      {previous ? (
        <Link
          href={`/reports/monthly?month=${previous.value}`}
          className="nlc-press flex size-9 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Mese precedente"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className="flex size-9 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-ink-3 opacity-45">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </span>
      )}
      <h1 className="truncate text-center text-[22px] font-semibold leading-tight">
        {current.label}
      </h1>
      {next ? (
        <Link
          href={`/reports/monthly?month=${next.value}`}
          className="nlc-press flex size-9 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Mese successivo"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className="flex size-9 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-ink-3 opacity-45">
          <ChevronRight className="size-4" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

function DeltaChip({
  value,
  betterWhenPositive,
  currencySymbol,
}: {
  value: number;
  betterWhenPositive: boolean;
  currencySymbol: string;
}) {
  const improved = betterWhenPositive ? value >= 0 : value <= 0;
  const Icon = betterWhenPositive
    ? value >= 0 ? TrendingUp : TrendingDown
    : value <= 0 ? TrendingDown : TrendingUp;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--r-chip)] px-2.5 py-1.5 text-[12px] font-medium",
        improved ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <Mono>{formatEUR(value, currencySymbol, { sign: true })}</Mono>
      <span>vs mese scorso</span>
    </span>
  );
}

function BalanceRow({
  icon: Icon,
  label,
  sublabel,
  value,
  delta,
  tone = "default",
  currencySymbol,
}: {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  value: number;
  delta?: number;
  tone?: "default" | "success" | "accent";
  currencySymbol: string;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 py-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-background text-muted-foreground",
          tone === "success" && "text-success",
          tone === "accent" && "text-accent",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{label}</p>
        <Serif className="mt-0.5 block truncate text-[12px] text-ink-3">
          {sublabel}
        </Serif>
      </div>
      <div className="shrink-0 text-right">
        <Mono
          className={cn(
            "block text-[15px] font-semibold",
            tone === "success" && "text-success",
            tone === "accent" && "text-accent",
          )}
        >
          {formatEUR(value, currencySymbol, { sign: true })}
        </Mono>
        {delta && delta !== 0 ? (
          <Mono
            className={cn(
              "mt-0.5 block text-[10.5px]",
              delta > 0 ? "text-success" : "text-destructive",
            )}
          >
            {formatEUR(delta, currencySymbol, { sign: true })}
          </Mono>
        ) : null}
      </div>
    </div>
  );
}

function CategoryBar({
  category,
  max,
  currencySymbol,
}: {
  category: CategoryReportRow;
  max: number;
  currencySymbol: string;
}) {
  const delta = round2(category.spent - category.prev);
  const increased = delta > 0;
  const width = max > 0 ? Math.max(4, (category.spent / max) * 100) : 0;

  return (
    <div className="py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground">
            <CraftedIcon name={category.icon} size={16} />
          </span>
          <span className="truncate text-[14px] font-medium">{category.name}</span>
        </div>
        <Mono className="shrink-0 text-[13px] font-semibold">
          {formatEUR(category.spent, currencySymbol)}
        </Mono>
      </div>
      <div className="flex items-center gap-3 pl-11">
        <span className="h-2 flex-1 rounded-full bg-line-soft">
          <span
            className={cn(
              "block h-full rounded-full",
              increased ? "bg-destructive" : "bg-muted-foreground",
            )}
            style={{ width: `${width}%` }}
          />
        </span>
        {delta !== 0 ? (
          <Mono
            className={cn(
              "w-16 shrink-0 text-right text-[11px]",
              increased ? "text-destructive" : "text-success",
            )}
          >
            {formatEUR(delta, currencySymbol, { sign: true })}
          </Mono>
        ) : null}
      </div>
    </div>
  );
}

function StoryCard({
  eyebrow,
  icon: Icon,
  title,
  amount,
  amountLabel,
  note,
  tone = "default",
  currencySymbol,
}: {
  eyebrow: string;
  icon: LucideIcon;
  title: string;
  amount: number;
  amountLabel?: string;
  note: string;
  tone?: "default" | "accent" | "success";
  currencySymbol: string;
}) {
  return (
    <article className="w-[220px] shrink-0 rounded-[var(--r-card)] border border-line bg-surface p-4">
      <div
        className={cn(
          "mb-4 flex size-9 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground",
          tone === "accent" && "text-accent",
          tone === "success" && "text-success",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <Label className="mb-2 block">{eyebrow}</Label>
      <h3 className="line-clamp-2 min-h-10 text-[15px] font-semibold leading-tight">
        {title}
      </h3>
      <Mono
        className={cn(
          "mt-3 block text-[20px] font-semibold",
          tone === "accent" && "text-accent",
          tone === "success" && "text-success",
        )}
      >
        {amountLabel ?? formatEUR(amount, currencySymbol, { sign: tone !== "default" })}
      </Mono>
      <Serif className="mt-2 block line-clamp-2 text-[13px] text-ink-3">
        {note}
      </Serif>
    </article>
  );
}

function VerdictCard({
  data,
  previous,
  currencySymbol,
}: {
  data: MonthData;
  previous: MonthData;
  currencySymbol: string;
}) {
  const net = round2(data.income - data.spent);
  const deltaSpent = round2(data.spent - previous.spent);
  const spentImproved = deltaSpent < 0;

  return (
    <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
      <div className="rounded-[var(--r-card)] border border-line p-5">
        <Label className="mb-3 block">Nota di fine mese</Label>
        <p className="text-[15px] leading-7 text-muted-foreground">
          Hai messo da parte{" "}
          <Serif className="text-foreground">{formatEUR(net, currencySymbol, { sign: true })}</Serif>{" "}
          e ne hai evitati altri{" "}
          <Serif className="text-success">{formatEUR(data.avoided, currencySymbol)}</Serif>.
          {spentImproved ? " Le uscite sono scese di " : " Le uscite sono salite di "}
          <Mono className={spentImproved ? "text-success" : "text-destructive"}>
            {formatEUR(Math.abs(deltaSpent), currencySymbol)}
          </Mono>{" "}
          rispetto al mese scorso:{" "}
          {spentImproved
            ? "il mese si chiude con più margine e meno rumore."
            : "il segnale utile è capire dove si è concentrato l'aumento."}
        </p>
      </div>
    </section>
  );
}

export function CraftedMonthlyReport({
  report,
  months,
  selectedMonth,
}: {
  report: MonthlyReportData;
  months: MonthOption[];
  selectedMonth: string;
}) {
  const currencySymbol = useCurrencySymbol();
  const language = useWorkspaceLanguage();
  const data = buildMonthData(report);
  const previous = buildPreviousMonthData(report);
  const net = round2(data.income - data.spent);
  const previousNet = round2(previous.income - previous.spent);
  const savingsRate = data.income > 0 ? Math.round((net / data.income) * 100) : 0;
  const deltaNet = round2(net - previousNet);
  const deltaSpent = round2(data.spent - previous.spent);
  const maxCategory = Math.max(...data.categories.map((category) => category.spent), 0);
  const month = monthParts(data.key);
  const daysInMonth =
    Number.isFinite(month.year) && Number.isFinite(month.month)
      ? new Date(Date.UTC(month.year, month.month, 0)).getUTCDate()
      : 30;

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <section className="px-[var(--sp-page-x)] pb-6 pt-6">
        <div className="flex items-center justify-between gap-4">
          <Label>Report mensile</Label>
          <button
            type="button"
            className="nlc-press flex size-9 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-muted-foreground"
            aria-label="Condividi report"
          >
            <Share2 className="size-4" aria-hidden="true" />
          </button>
        </div>
        <MonthPicker months={months} selectedMonth={selectedMonth} />

        <div className="mt-10 text-center">
          <Label className="mb-3 block">Risparmio netto</Label>
          <Mono
            className={cn(
              "block text-[clamp(3.25rem,17vw,5rem)] font-semibold leading-[0.82] tracking-[-0.04em]",
              net < 0 && "text-destructive",
            )}
          >
            {formatEUR(net, currencySymbol, { sign: true })}
          </Mono>
          <Serif className="mt-3 block text-[15px] text-ink-2">
            {savingsRate}% di quanto è entrato
          </Serif>
          <div className="mt-4">
            <DeltaChip
              value={deltaNet}
              betterWhenPositive
              currencySymbol={currencySymbol}
            />
          </div>
        </div>
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="rounded-[var(--r-card)] bg-surface-muted px-4">
          <BalanceRow
            icon={ArrowDownRight}
            label="Entrate"
            sublabel="derivate dal netto del mese"
            value={data.income}
            delta={round2(data.income - previous.income)}
            tone="success"
            currencySymbol={currencySymbol}
          />
          <Rule soft />
          <BalanceRow
            icon={ArrowUpRight}
            label="Uscite"
            sublabel="spesa reale registrata"
            value={-data.spent}
            delta={-deltaSpent}
            currencySymbol={currencySymbol}
          />
          <Rule soft />
          <BalanceRow
            icon={Sparkles}
            label="Evitate"
            sublabel="bonus narrativo, non sconto"
            value={data.avoided}
            delta={round2(data.avoided - previous.avoided)}
            tone="accent"
            currencySymbol={currencySymbol}
          />
          <Rule soft />
          <BalanceRow
            icon={PiggyBank}
            label="Verso obiettivi"
            sublabel="alimentati dalle evitate"
            value={data.savedToGoals}
            delta={round2(data.savedToGoals - previous.savedToGoals)}
            tone="success"
            currencySymbol={currencySymbol}
          />
        </div>
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <Label className="mb-1.5 block">Dove sono andati</Label>
            <h2 className="text-[16px] font-semibold leading-tight">Categorie</h2>
          </div>
          <Mono className="text-[15px] font-semibold">
            {formatEUR(data.spent, currencySymbol)}
          </Mono>
        </div>
        {data.categories.length > 0 ? (
          data.categories.map((category, index) => (
            <div key={category.id}>
              <CategoryBar
                category={category}
                max={maxCategory}
                currencySymbol={currencySymbol}
              />
              {index < data.categories.length - 1 ? <Rule soft /> : null}
            </div>
          ))
        ) : (
          <Serif className="block text-sm text-ink-3">
            Nessuna uscita categorizzata in questo mese.
          </Serif>
        )}
      </section>
      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <Label className="mb-2 block">Il mese in tre storie</Label>
        <Serif className="mb-4 block text-[15px] text-muted-foreground">
          Tre appunti bastano per capire il mese.
        </Serif>
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
          <StoryCard
            eyebrow="Spesa più grande"
            icon={ArrowUpRight}
            title={data.highlights.biggest.name}
            amount={data.highlights.biggest.amount}
            note={shortDate(data.highlights.biggest.date, language)}
            currencySymbol={currencySymbol}
          />
          <StoryCard
            eyebrow="Vittoria"
            icon={Trophy}
            title={data.highlights.win.name}
            amount={data.highlights.win.amount}
            note={data.highlights.win.note}
            tone="accent"
            currencySymbol={currencySymbol}
          />
          <StoryCard
            eyebrow="Costanza"
            icon={Flame}
            title={`${data.highlights.streak.days} giorni`}
            amount={data.daysTracked}
            amountLabel={`${data.highlights.streak.days} giorni`}
            note={`${data.highlights.streak.note} · ${data.daysTracked}/${daysInMonth} giorni tracciati`}
            tone="success"
            currencySymbol=""
          />
        </div>
      </section>
      <Rule soft />

      <VerdictCard data={data} previous={previous} currencySymbol={currencySymbol} />
    </div>
  );
}
