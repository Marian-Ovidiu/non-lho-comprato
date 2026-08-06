"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import {
  BarChart3,
  ChevronRight,
  CalendarDays,
  Loader2,
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
  type CraftedIconName,
} from "@/components/crafted";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCategoryCraftedIcon } from "@/src/lib/category-crafted-icon";
import { useBoundLocale } from "@/src/components/language/use-locale-formatters";
import { getLocalizedCategoryName } from "@/src/lib/category-locale";
import { languageToLocale } from "@/src/lib/i18n";
import { useCurrencySymbol } from "@/src/components/currency/currency-context";
import {
  useTranslations,
  useWorkspaceLanguage,
} from "@/src/components/language/language-context";
import {
  createWorkspaceSettlementAction,
  type SettlementActionResult,
} from "@/src/actions/dashboard";
import { CraftedDashboardEmptyState } from "@/src/components/dashboard/crafted-dashboard-empty-state";
import type { BudgetDashboardSelection } from "@/src/lib/budget-summary";
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

export type CraftedDashboardProps = {
  monthLabel: string;
  monthRealSpent: number;
  monthFixedSpent: number;
  monthCurrentSpent: number;
  monthFixedItems: Array<{ label: string; amount: number }>;
  shortcuts: Array<{
    title: string;
    categoryId: string;
    categoryName: string;
    categorySlug: string;
    amount: number;
    count: number;
  }>;
  monthDelta: number | null;
  spentToday: number;
  entriesTodayCount: number;
  categories: CraftedCategoryRow[];
  currentStreak: number;
  habitsTotal: number;
  habitsAvoided: number;
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
  reflection: { label: string; text: string } | null;
  emptyState: {
    title: string;
    description: string;
    actionLabel: string;
  } | null;
  coupleBalance: {
    supported: boolean;
    status: WorkspaceBalanceStatus;
    amount: number;
    counterpartLabel: string | null;
  };
  budgetDashboardState: BudgetDashboardSelection;
};

/**
 * Scala categorica dei grafici: la distribuzione per categoria è un dato, non
 * un giudizio, quindi non tocca né il lime (azione) né i colori sotto/sforato.
 */
const CATEGORY_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
] as const;

const INITIAL_SETTLEMENT_STATE: SettlementActionResult = {
  success: false,
  message: "",
};

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

/**
 * Etichetta di sezione della dashboard: stessa Label dell'app, ma con la
 * variante `.nlc-eyebrow` — corpo 11px, tracking più stretto e colore un
 * gradino sopra, perché il maiuscoletto originale su vetro non reggeva.
 */
function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <Label className={cn("nlc-eyebrow", className)}>{children}</Label>;
}

/**
 * Importo con gerarchia interna: simbolo di valuta e centesimi arretrano,
 * gli euro comandano. I centesimi sono contesto, non decisione — ma restano,
 * perché su un'app di soldi "circa" non è una risposta.
 */
function Amount({
  value,
  currencySymbol,
  decimals = true,
  className,
}: {
  value: number;
  currencySymbol: string;
  decimals?: boolean;
  className?: string;
}) {
  const language = useWorkspaceLanguage();
  const locale = languageToLocale(language);
  const parts = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).formatToParts(Math.abs(value));
  const integer = parts
    .filter((part) => part.type !== "decimal" && part.type !== "fraction")
    .map((part) => part.value)
    .join("");
  const decimalSeparator = parts.find((part) => part.type === "decimal")?.value;
  const fraction = parts.find((part) => part.type === "fraction")?.value;

  return (
    <span className={cn("nlc-amount font-num", className)}>
      <span className="nlc-currency">{currencySymbol}</span>
      {integer}
      {fraction ? (
        <span className="nlc-cents">
          {decimalSeparator}
          {fraction}
        </span>
      ) : null}
    </span>
  );
}

function CardHeader({
  title,
  action,
  href,
}: {
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <Eyebrow>{title}</Eyebrow>
      {action && href ? (
        <Link
          href={href}
          className="shrink-0 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {action}
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Scroll-linked parallax: orb, wave and card transforms are a pure function of
 * scroll position — motion stops when the scroll stops and reverses when the
 * user scrolls back up. No time-based autoplay, no one-time reveals. Bails out
 * entirely under prefers-reduced-motion.
 */
function useScrollLinkedParallax(
  rootRef: React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const orbs = Array.from(root.querySelectorAll<HTMLElement>(".nlc-orb"));
    const waves = Array.from(root.querySelectorAll<SVGGElement>(".nlc-wave-layer"));
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".nlc-parallax"));
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollY = window.scrollY;
      const viewport = window.innerHeight || 1;

      for (const orb of orbs) {
        const speed = Number(orb.dataset.sp) || 0;
        const spin = Number(orb.dataset.rot) || 0;
        orb.style.transform = `translate3d(0, ${(scrollY * speed).toFixed(1)}px, 0) rotate(${(scrollY * spin).toFixed(2)}deg)`;
      }
      for (const wave of waves) {
        const speed = Number(wave.dataset.sp) || 0;
        wave.style.transform = `translateX(${(scrollY * speed).toFixed(1)}px)`;
      }
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        let progress = (viewport / 2 - center) / viewport;
        progress = Math.max(-1, Math.min(1, progress));
        const amount = Number(card.dataset.amt) || 16;
        // Tilt contenuto: oltre ~2° il testo sfoca durante lo scroll su mobile.
        card.style.transform = `perspective(1000px) translateY(${(progress * amount).toFixed(1)}px) rotateX(${(progress * -2.1).toFixed(2)}deg)`;
      }
    };

    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [rootRef]);
}

function IconBubble({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-control)] border border-line-soft bg-foreground/[0.045] text-muted-foreground">
      {Icon ? <Icon className="size-4" aria-hidden="true" /> : children}
    </span>
  );
}

/**
 * Scorciatoia su un movimento che l'utente registra spesso: apre il form già
 * compilato con titolo, categoria e importo tipico, così restano solo da
 * confermare.
 */
function ShortcutRow({
  shortcut,
  currencySymbol,
}: {
  shortcut: CraftedDashboardProps["shortcuts"][number];
  currencySymbol: string;
}) {
  const formatEUR = useBoundLocale(formatEURBase);
  const language = useWorkspaceLanguage();
  const href = `/entries/new?${new URLSearchParams({
    title: shortcut.title,
    categoryId: shortcut.categoryId,
    amountSpent: shortcut.amount.toFixed(2),
  }).toString()}`;

  return (
    <Link
      href={href}
      className="nlc-press flex min-h-14 items-center gap-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <IconBubble>
        <CraftedIcon
          name={getCategoryCraftedIcon({
            slug: shortcut.categorySlug,
            name: shortcut.categoryName,
          })}
          size={17}
        />
      </IconBubble>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{shortcut.title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-ink-3">
          {getLocalizedCategoryName(shortcut.categorySlug, language) ??
            shortcut.categoryName}
        </span>
      </span>
      <Mono className="shrink-0 text-[13px] text-muted-foreground">
        {formatEUR(shortcut.amount, currencySymbol)}
      </Mono>
      <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
    </Link>
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
    return "even" as const;
  }

  return diff < 0 ? ("under" as const) : ("over" as const);
}

function ComparisonIcon({ tone }: { tone: ReturnType<typeof compareSpending> }) {
  if (tone === "muted" || tone === "even") {
    return <Minus className="size-3.5" aria-hidden="true" />;
  }

  return tone === "under" ? (
    <TrendingDown className="size-3.5" aria-hidden="true" />
  ) : (
    <TrendingUp className="size-3.5" aria-hidden="true" />
  );
}

/**
 * Il materiale resta neutro e il colore va solo sul verdetto (icona +
 * etichetta): prima l'intera card si tingeva, e due lastre affiancate una
 * verde e una arancione urlavano più dell'hero.
 */
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
  const tone = compareSpending(todaySpent, reference);

  return (
    <div className="nlc-glass-card min-h-[118px] rounded-[var(--r-card)] p-4">
      <div
        className={cn(
          "mb-3 flex items-center justify-between gap-2",
          tone === "under" && "text-success [--eyebrow-ink:var(--nlc-under)]",
          tone === "over" && "text-destructive [--eyebrow-ink:var(--nlc-over)]",
          (tone === "muted" || tone === "even") && "text-ink-3",
        )}
      >
        <Eyebrow>{label}</Eyebrow>
        <ComparisonIcon tone={tone} />
      </div>
      {reference === null ? (
        <Serif className="block text-[13px] leading-4 text-ink-3">{emptyLabel}</Serif>
      ) : (
        <>
          <Amount
            value={todaySpent}
            currencySymbol={currencySymbol}
            decimals={false}
            className="block text-[length:var(--num-mid)] font-semibold"
          />
          <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
            su{" "}
            <Amount
              value={reference}
              currencySymbol={currencySymbol}
              decimals={false}
              className="text-foreground/90"
            />{" "}
            {referenceLabel}
          </p>
        </>
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
      className="nlc-press nlc-glass-card flex min-h-[88px] items-center gap-3 rounded-[var(--r-card)] p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--r-control)] border border-line-soft bg-foreground/[0.045] text-muted-foreground">
        <CraftedIcon name={habit.icon} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Eyebrow>{habit.relativeLabel}</Eyebrow>
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
  budget: NonNullable<BudgetDashboardSelection["mainBudget"]>;
  currencySymbol: string;
}) {
  const formatEUR = useBoundLocale(formatEURBase);
  const used = budget.spentAmount;
  const total = budget.budgetAmount;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  const remaining = budget.remainingAmount;
  // Giorni e quota giornaliera arrivano dal server. Prima erano stimati su 30
  // giorni fissi, quindi sbagliati in ogni mese che non ne ha 30.
  const daysLeft = budget.remainingDays;
  const perDay = budget.dailyRemainingAmount;
  const overspent = remaining < 0;
  // Scala di giudizio dedicata: sotto / in tensione / sforato. Il lime non
  // compare mai qui — "va bene" e "premi qui" non possono dirsi uguali.
  const tone =
    pct >= 90
      ? "bg-[var(--nlc-over)]"
      : pct >= 70
        ? "bg-[var(--nlc-warn)]"
        : "bg-[var(--nlc-under)]";

  return (
    <section className="nlc-glass-card rounded-[var(--r-card)] p-4">
      <CardHeader title={budget.title} action="Gestisci" href="/budget#gestione-budget" />
      {/* La domanda con cui si apre l'app è "posso spendere?": la risposta è
          quanto resta e per quanti giorni, non quanto si è già speso. */}
      <p className="text-[13px] text-muted-foreground">
        {overspent ? "Sforato di" : "Ti restano"}
      </p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <Amount
          value={Math.abs(remaining)}
          currencySymbol={currencySymbol}
          decimals={false}
          className={cn(
            "text-[length:var(--num-lead)] font-semibold",
            overspent && "text-destructive",
          )}
        />
        {!overspent && daysLeft > 0 ? (
          <span className="text-[13px] text-ink-3">
            per {daysLeft} {daysLeft === 1 ? "giorno" : "giorni"}
          </span>
        ) : null}
      </div>
      {!overspent && daysLeft > 0 ? (
        <Serif className="mt-2 block text-[13px] text-ink-3">
          {formatEUR(perDay, currencySymbol, { decimals: false })} al giorno
        </Serif>
      ) : null}
      <ProgressLine value={pct} className="mt-4 nlc-track" indicatorClassName={tone} />
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <Serif className="text-ink-3">
          {formatEUR(used, currencySymbol, { decimals: false })} di{" "}
          {formatEUR(total, currencySymbol, { decimals: false })}
        </Serif>
        <Mono className="text-muted-foreground">{pct}%</Mono>
      </div>
    </section>
  );
}

/**
 * I budget di categoria esistevano ma non arrivavano mai in home: si vedevano
 * solo aprendo /budget, ed è il motivo per cui restavano impostati e mai
 * ritoccati anche quando venivano sforati ogni mese.
 */
function CategoryBudgetsBlock({
  budgets,
  currencySymbol,
}: {
  budgets: BudgetDashboardSelection["categoryBudgets"];
  currencySymbol: string;
}) {
  const formatEUR = useBoundLocale(formatEURBase);

  return (
    <section className="nlc-glass-card rounded-[var(--r-card)] p-4">
      <CardHeader title="Budget per categoria" action="Gestisci" href="/budget#gestione-budget" />
      {budgets.slice(0, 3).map((budget, index) => {
        const pct =
          budget.budgetAmount > 0
            ? Math.round((budget.spentAmount / budget.budgetAmount) * 100)
            : 0;
        const tone =
          pct >= 100
            ? "bg-[var(--nlc-over)]"
            : pct >= 80
              ? "bg-[var(--nlc-warn)]"
              : "bg-[var(--nlc-under)]";

        return (
          <div key={budget.id}>
            <div className="flex items-baseline justify-between gap-3 py-2">
              <p className="min-w-0 truncate text-[14px] font-medium">
                {budget.scopeLabel}
              </p>
              <Mono
                className={cn(
                  "shrink-0 text-[12px]",
                  pct >= 100 ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {formatEUR(budget.spentAmount, currencySymbol, { decimals: false })} /{" "}
                {formatEUR(budget.budgetAmount, currencySymbol, { decimals: false })}
              </Mono>
            </div>
            <ProgressLine value={Math.min(pct, 100)} className="nlc-track" indicatorClassName={tone} />
            {index < Math.min(budgets.length, 3) - 1 ? <Rule soft /> : null}
          </div>
        );
      })}
    </section>
  );
}

function SettlementAction({
  canSettle,
  label,
}: {
  canSettle: boolean;
  label: string;
}) {
  const router = useRouter();
  const didRefreshRef = useRef(false);
  const [state, formAction, pending] = useActionState(
    async (previousState: SettlementActionResult, formData: FormData) => {
      void previousState;
      void formData;
      return createWorkspaceSettlementAction();
    },
    INITIAL_SETTLEMENT_STATE,
  );

  useEffect(() => {
    if (!state.success) {
      didRefreshRef.current = false;
      return;
    }

    if (didRefreshRef.current) {
      return;
    }

    didRefreshRef.current = true;
    router.refresh();
  }, [router, state.success]);

  if (!canSettle) {
    return null;
  }

  return (
    <form action={formAction} className="mt-3">
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "nlc-press flex h-11 w-full items-center justify-center gap-2 rounded-[var(--r-cta)]",
          "border border-accent/35 bg-accent/10 px-4 text-[14px] font-semibold text-[var(--accent-ink)]",
          "transition-colors hover:bg-accent/15 disabled:pointer-events-none disabled:opacity-60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : null}
        {pending ? "Registro..." : label}
      </button>
      {state.message ? (
        <p
          className={cn(
            "mt-2 text-xs leading-4",
            state.success ? "text-success" : "text-destructive",
          )}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function CraftedDashboard({
  monthLabel,
  monthRealSpent,
  monthFixedSpent,
  monthCurrentSpent,
  monthFixedItems,
  shortcuts,
  monthDelta,
  spentToday,
  entriesTodayCount,
  categories,
  currentStreak,
  habitsTotal,
  habitsAvoided,
  nextHabitPayment,
  dailyPaceComparison,
  reflection,
  emptyState,
  coupleBalance,
  budgetDashboardState,
}: CraftedDashboardProps) {
  const formatEUR = useBoundLocale(formatEURBase);
  const currencySymbol = useCurrencySymbol();
  const language = useWorkspaceLanguage();
  const locale = languageToLocale(language);
  const t = useTranslations();
  const rootRef = useRef<HTMLDivElement>(null);
  useScrollLinkedParallax(rootRef);

  // A trend needs a previous month to compare against. With no baseline there is
  // no delta to show: an invented percentage next to real money reads as real.
  const displayDeltaPct =
    monthDelta !== null && monthCurrentSpent > 0
      ? Math.round((monthDelta / Math.max(monthCurrentSpent - monthDelta, 1)) * 1000) / 10
      : null;
  const trendDown = displayDeltaPct !== null && displayDeltaPct <= 0;
  const displayCategories = categories.map((category) => ({
    key: category.slug,
    label: getLocalizedCategoryName(category.slug, language) ?? category.name,
    amount: category.spent,
    count: category.count,
    pct: category.pct,
    icon: getCategoryCraftedIcon({ slug: category.slug, name: category.name }),
  }));
  // Always set alongside `supported: true` in getHomeDashboardMetrics; the card
  // below only renders when the balance is supported, so "" is never displayed.
  const partner = coupleBalance.counterpartLabel ?? "";
  const coupleAmount = coupleBalance.amount;
  const coupleIsTheyOwe = coupleBalance.status !== "you-owe";
  const coupleYou = Math.max(coupleAmount, 0);
  const canSettleCoupleBalance =
    coupleBalance.supported &&
    coupleBalance.status !== "balanced" &&
    coupleAmount > 0;

  return (
    <div ref={rootRef} className="nlc-glass-home nlc-palette-sage relative isolate -mx-4 sm:-mx-6 lg:-mx-8">
      <div
        aria-hidden="true"
        className="nlc-dash-aura pointer-events-none absolute inset-x-0 bottom-0 -z-10"
        style={{ top: "calc(-1 * (var(--nlc-chrome-top, 4rem) + 1.5rem))" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none sticky top-0 -z-10 -mb-[100svh] h-[100svh] overflow-hidden"
      >
        <span className="nlc-orb nlc-orb-1" data-sp="0.20" data-rot="0.018" />
        <span className="nlc-orb nlc-orb-2" data-sp="0.40" data-rot="-0.026" />
        <span className="nlc-orb nlc-orb-3" data-sp="0.13" data-rot="0.034" />
        <span className="nlc-orb nlc-orb-4" data-sp="0.46" data-rot="0.03" />
        <span className="nlc-orb nlc-orb-5" data-sp="0.08" data-rot="-0.014" />
        <div className="nlc-waves">
          <svg viewBox="0 0 1440 220" preserveAspectRatio="none">
            <defs>
              <path
                id="nlc-waveband"
                d="M0,110 C120,48 240,48 360,110 C480,172 600,172 720,110 C840,48 960,48 1080,110 C1200,172 1320,172 1440,110 C1560,48 1680,48 1800,110 C1920,172 2040,172 2160,110 C2280,48 2400,48 2520,110 C2640,172 2760,172 2880,110 L2880,220 L0,220 Z"
              />
            </defs>
            <g className="nlc-wave-layer" data-sp="0.13">
              <use href="#nlc-waveband" transform="translate(0,-30)" fill="rgba(209,249,117,0.09)" />
            </g>
            <g className="nlc-wave-layer" data-sp="-0.24">
              <use href="#nlc-waveband" transform="translate(0,4)" fill="rgba(202,146,246,0.12)" />
            </g>
            <g className="nlc-wave-layer" data-sp="0.36">
              <use href="#nlc-waveband" transform="translate(0,30)" fill="rgba(154,162,94,0.16)" />
            </g>
          </svg>
        </div>
      </div>

      <div className="relative mx-4 sm:mx-6 lg:mx-8">
        {/* Hero — lastra stabile e leggibile, ferma mentre lo sfondo si muove */}
        <section className="nlc-glass-hero mb-3 rounded-[var(--r-sheet)] px-5 pb-5 pt-5">
          <div className="flex items-start justify-between gap-4">
            <Eyebrow className="pt-1">Spesa corrente</Eyebrow>
            {displayDeltaPct !== null ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--r-chip)] border border-line px-2.5 py-1.5 text-[11px] text-muted-foreground">
                {trendDown ? (
                  <TrendingDown className="size-3.5 text-success" aria-hidden="true" />
                ) : (
                  <TrendingUp className="size-3.5 text-destructive" aria-hidden="true" />
                )}
                <Mono>{displayDeltaPct > 0 ? "+" : "−"}{Math.abs(displayDeltaPct).toLocaleString(locale)}%</Mono>
              </span>
            ) : null}
          </div>
          <Amount
            value={monthCurrentSpent}
            currencySymbol={currencySymbol}
            className="mt-4 block whitespace-nowrap text-[length:var(--num-hero)] font-semibold"
          />
          <Serif className="mt-3 block text-[15px] text-muted-foreground">
            {monthLabel.toLowerCase()}
          </Serif>
          {/* Le fisse restano visibili ma fuori dal numero grande: sommarle alla
              spesa di tutti i giorni rende il totale incomparabile tra mesi,
              perché un affitto segnato il 5 invece che l'11 lo sposta di
              centinaia di euro senza che sia cambiato nulla nei consumi. */}
          {monthFixedSpent > 0 ? (
            <div className="mt-4 flex items-baseline justify-between gap-3 rounded-[var(--r-control)] border border-line-soft bg-foreground/[0.03] px-3 py-2">
              <div className="min-w-0">
                <p className="text-[13px] text-muted-foreground">Spese fisse</p>
                {monthFixedItems.length > 0 ? (
                  <p className="mt-0.5 truncate text-[11px] text-ink-3">
                    {monthFixedItems.map((item) => item.label).join(" · ")}
                  </p>
                ) : null}
              </div>
              <Mono className="nlc-amount shrink-0 text-[15px] font-medium text-muted-foreground">
                {formatEUR(monthFixedSpent, currencySymbol)}
              </Mono>
            </div>
          ) : null}
          <div className="mt-2 flex items-baseline justify-between gap-3 px-3">
            <span className="text-[12px] text-ink-3">Totale del mese</span>
            <Mono className="shrink-0 text-[12px] text-ink-3">
              {formatEUR(monthRealSpent, currencySymbol)}
            </Mono>
          </div>
          {reflection?.text ? (
            <Serif className="mt-3 block text-[13px] text-ink-3">{reflection.text}</Serif>
          ) : displayDeltaPct !== null ? (
            <Serif className="mt-3 block text-[13px] text-ink-3">
              {trendDown
                ? "Il ritmo del mese sta scendendo, senza confondere spese e impatto."
                : "Questo mese sta accelerando: tieni d'occhio budget e categorie."}
            </Serif>
          ) : null}
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-4">
            <div>
              <Eyebrow className="mb-2 block">{t.dashboard.spentToday}</Eyebrow>
              <Amount
                value={spentToday}
                currencySymbol={currencySymbol}
                className="block text-[length:var(--num-mid)] font-semibold"
              />
            </div>
            <div className="border-l border-line pl-3">
              <Eyebrow className="mb-2 block">Movimenti oggi</Eyebrow>
              <Mono className="nlc-amount block text-[length:var(--num-mid)] font-semibold leading-none">
                {entriesTodayCount}
              </Mono>
            </div>
          </div>
        </section>

        {/* Bento — card compatte a metà, liste a piena larghezza; parallax legato allo scroll */}
        <div className="grid grid-cols-2 items-start gap-3">
          {/* Il budget globale apre la griglia: è l'unico blocco che risponde a
              "posso spendere?", che è la domanda con cui si apre l'app. */}
          {budgetDashboardState.mainBudget ? (
          <div className="nlc-parallax col-span-2" data-amt="22">
            <BudgetBlock
              budget={budgetDashboardState.mainBudget}
              currencySymbol={currencySymbol}
            />
          </div>
          ) : null}

          <div className="nlc-parallax" data-amt="24">
            <DailyComparisonCard
              label={`Giorno ${dailyPaceComparison.dayOfMonth || "—"}`}
              todaySpent={dailyPaceComparison.todaySpent}
              reference={dailyPaceComparison.averageSameDay}
              referenceLabel="medi"
              emptyLabel="Serve almeno un mese precedente con questo giorno."
              currencySymbol={currencySymbol}
            />
          </div>

          <div className="nlc-parallax" data-amt="28">
            <DailyComparisonCard
              label="Mese scorso"
              todaySpent={dailyPaceComparison.todaySpent}
              reference={dailyPaceComparison.previousMonthSpent}
              referenceLabel="il mese scorso"
              emptyLabel="Nessun movimento nello stesso giorno del mese scorso."
              currencySymbol={currencySymbol}
            />
          </div>

          <div className="nlc-parallax col-span-2" data-amt="16">
            {nextHabitPayment ? (
              <NextHabitPaymentCard
                habit={nextHabitPayment}
                currencySymbol={currencySymbol}
              />
            ) : (
              <div className="nlc-glass-card rounded-[var(--r-card)] p-4">
                <Eyebrow className="mb-2 block">Prossimo pagamento</Eyebrow>
                <Serif className="block text-sm text-ink-3">
                  Nessuna ricorrente attiva con un pagamento previsto.
                </Serif>
              </div>
            )}
          </div>

          {coupleBalance.supported ? (
          <div className="nlc-parallax col-span-2" data-amt="26">
            <section className="nlc-glass-card rounded-[var(--r-card)] p-4">
              <Eyebrow className="mb-3 block">Con {partner}</Eyebrow>
              {/* Il saldo è un solo numero con una direzione. La vecchia coppia
                  di colonne "Tu / partner" mostrava sempre 0 per il partner. */}
              <p className="text-[13px] text-muted-foreground">
                {coupleBalance.status === "balanced"
                  ? "Siete pari."
                  : coupleIsTheyOwe
                    ? `${partner} ti deve`
                    : `Devi a ${partner}`}
              </p>
              <Amount
                value={coupleYou}
                currencySymbol={currencySymbol}
                className={cn(
                  "mt-1.5 block text-[length:var(--num-lead)] font-semibold",
                  coupleBalance.status === "balanced"
                    ? "text-muted-foreground"
                    : coupleIsTheyOwe
                      ? "text-[var(--lilac-ink)]"
                      : "text-destructive",
                )}
              />
              <SettlementAction
                canSettle={canSettleCoupleBalance}
                label="Segna come regolato"
              />
            </section>
          </div>
          ) : null}

          {displayCategories.length > 0 ? (
          <div className="nlc-parallax col-span-2" data-amt="30">
            <section className="nlc-glass-card rounded-[var(--r-card)] p-4">
              <Eyebrow className="mb-3 block">Dove stai spendendo</Eyebrow>
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
          </div>
          ) : null}

          {budgetDashboardState.categoryBudgets.length > 0 ? (
          <div className="nlc-parallax col-span-2" data-amt="22">
            <CategoryBudgetsBlock
              budgets={budgetDashboardState.categoryBudgets}
              currencySymbol={currencySymbol}
            />
          </div>
          ) : null}

          {/* Scorciatoie ricavate da ciò che registrate davvero. Se non c'è
              ancora storico abbastanza, restano le voci di navigazione. */}
          <div className="nlc-parallax col-span-2" data-amt="20">
            <section className="nlc-glass-card rounded-[var(--r-card)] px-4 py-3">
              <Eyebrow className="mb-1 block">Azioni rapide</Eyebrow>
              {shortcuts.length > 0 ? (
                <>
                  {shortcuts.map((shortcut) => (
                    <div key={`${shortcut.title}-${shortcut.categoryId}`}>
                      <ShortcutRow shortcut={shortcut} currencySymbol={currencySymbol} />
                      <Rule soft />
                    </div>
                  ))}
                  <QuickActionRow href="/entries/new" icon={PlusCircle} label="Altra spesa" />
                </>
              ) : (
                <>
                  <QuickActionRow href="/entries/new" icon={PlusCircle} label="Registra spesa" />
                  <Rule soft />
                  <QuickActionRow href="/stats" icon={BarChart3} label="Statistiche" />
                </>
              )}
            </section>
          </div>

          {currentStreak > 0 ? (
          <div className="nlc-parallax" data-amt="18">
            <section className="nlc-glass-card rounded-[var(--r-card)] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <Eyebrow>Streak</Eyebrow>
                <CraftedIcon name="flame" size={17} className="text-[var(--accent-ink)]" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <Mono className="nlc-amount text-[length:var(--num-lead)] font-semibold leading-none">
                  {currentStreak}
                </Mono>
                <span className="text-xs text-muted-foreground">giorni</span>
              </div>
            </section>
          </div>
          ) : null}

          {habitsTotal > 0 ? (
          <div className="nlc-parallax" data-amt="34">
            <Link
              href="/habits"
              className="nlc-press nlc-glass-card block rounded-[var(--r-card)] p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <Eyebrow>Ricorrenti oggi</Eyebrow>
                <Mono className="text-[12px] text-muted-foreground">
                  {habitsAvoided}/{habitsTotal}
                </Mono>
              </div>
              <Mono className="nlc-amount block text-[length:var(--num-lead)] font-semibold leading-none">
                {Math.max(habitsTotal - habitsAvoided, 0)}
              </Mono>
              <ProgressLine
                value={(habitsAvoided / habitsTotal) * 100}
                className="mt-4 nlc-track"
                indicatorClassName="bg-[var(--nlc-under)]"
              />
            </Link>
          </div>
          ) : null}

          {/* The empty state renders its own fixed call to action, which would
              sit on top of this one. */}
          {emptyState ? null : (
            <div className="nlc-parallax col-span-2" data-amt="12">
              <Button
                asChild
                className="nlc-press h-[54px] w-full rounded-[var(--r-cta)] bg-accent text-accent-foreground shadow-[0_12px_28px_-10px_rgba(209,249,117,0.38)] hover:bg-accent-hover"
              >
                <Link href="/entries/new">
                  <Plus className="size-4" aria-hidden="true" />
                  {t.dashboard.addEntry}
                </Link>
              </Button>
            </div>
          )}
        </div>

        <footer className="py-5 text-center">
          <p className="text-[10.5px] uppercase tracking-[0.14em] text-ink-3">
            Non l&apos;ho comprato · v1
          </p>
        </footer>
      </div>

      {emptyState ? (
        <CraftedDashboardEmptyState
          title={emptyState.title}
          description={emptyState.description}
          actionLabel={emptyState.actionLabel}
        />
      ) : null}
    </div>
  );
}
