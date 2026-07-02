"use client";

import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Bike,
  ChevronDown,
  ChevronRight,
  Coffee,
  Home,
  Plus,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  UtensilsCrossed,
} from "lucide-react";

import { Label, Mono, ProgressLine, Rule, Serif } from "@/components/crafted";
import { cn } from "@/lib/utils";
import type {
  CraftedBudgetCategory,
  CraftedBudgetProps,
  CraftedBudgetTone,
} from "@/src/lib/crafted-budget-build";

type MiniStatProps = {
  label: string;
  value: number;
  tone?: "default" | "success" | "accent" | "destructive";
};

type CategoryRowProps = {
  cat: CraftedBudgetCategory;
  totalBudget: number;
  last: boolean;
};

type CraftedBudgetPageProps = CraftedBudgetProps & {
  managementSection?: ReactNode;
};

const MINUS = "\u2212";

type BudgetIconName =
  | "home"
  | "food"
  | "shopping"
  | "sparkles"
  | "bike"
  | "coffee";

const CATEGORY_ICON_MAP: Record<string, BudgetIconName> = {
  casa: "home",
  affitto: "home",
  utenze: "home",
  bollette: "home",
  cibo: "food",
  spesa: "food",
  delivery: "food",
  ristoranti: "food",
  shopping: "shopping",
  vestiti: "shopping",
  svago: "sparkles",
  beauty: "sparkles",
  trasporti: "bike",
  bici: "bike",
  caffe: "coffee",
  coffee: "coffee",
};

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getCategoryIconName(
  cat: Pick<CraftedBudgetCategory, "name" | "slug" | "icon">,
): BudgetIconName {
  const key = normalizeKey(cat.icon ?? cat.slug ?? cat.name);
  const nameKey = normalizeKey(cat.name);

  return CATEGORY_ICON_MAP[key] ?? CATEGORY_ICON_MAP[nameKey] ?? "sparkles";
}

function BudgetCategoryIcon({
  name,
  className,
}: {
  name: BudgetIconName;
  className?: string;
}) {
  switch (name) {
    case "home":
      return <Home className={className} aria-hidden="true" />;
    case "food":
      return <UtensilsCrossed className={className} aria-hidden="true" />;
    case "shopping":
      return <ShoppingBag className={className} aria-hidden="true" />;
    case "bike":
      return <Bike className={className} aria-hidden="true" />;
    case "coffee":
      return <Coffee className={className} aria-hidden="true" />;
    case "sparkles":
      return <Sparkles className={className} aria-hidden="true" />;
  }
}

function formatEUR(
  value: number,
  { sign = false, decimals = 0 }: { sign?: boolean; decimals?: number } = {},
) {
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));
  const prefix = sign ? (value < 0 ? MINUS : "+") : "";

  return `${prefix}€${formatted}`;
}

function formatOverDelta(value: number) {
  return `+${formatEUR(value, { decimals: 0 }).replace(MINUS, "")}`;
}

function getCategoryTone(cat: CraftedBudgetCategory): CraftedBudgetTone {
  if (cat.spent > cat.budget) {
    return "destructive";
  }

  const pct = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;

  return pct > 80 ? "accent" : "success";
}

function MiniStat({ label, value, tone = "default" }: MiniStatProps) {
  return (
    <div className="min-w-0 rounded-[var(--r-card)] bg-surface-muted px-3 py-2.5">
      <Label className="mb-2 block truncate">{label}</Label>
      <Mono
        className={cn(
          "block truncate text-[16px] font-semibold leading-none",
          tone === "success" && "text-success",
          tone === "accent" && "text-accent",
          tone === "destructive" && "text-destructive",
        )}
      >
        {formatEUR(value)}
      </Mono>
    </div>
  );
}

function CategoryRow({ cat, totalBudget, last }: CategoryRowProps) {
  const iconName = getCategoryIconName(cat);
  const tone = getCategoryTone(cat);
  const pct = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 100;
  const remaining = cat.budget - cat.spent;
  const share = totalBudget > 0 ? (cat.budget / totalBudget) * 100 : 0;

  return (
    <button
      type="button"
      className={cn(
        "nlc-press grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        !last && "border-b border-line-soft",
      )}
      aria-label={`Dettaglio budget ${cat.name}`}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-[var(--r-control)] bg-surface-muted text-ink-2",
          tone === "destructive" && "bg-destructive/10 text-destructive",
        )}
      >
        <BudgetCategoryIcon name={iconName} className="size-5" />
      </span>

      <span className="min-w-0">
        <span className="flex min-w-0 items-baseline justify-between gap-3">
          <span className="truncate text-[14.5px] font-medium tracking-tight">
            {cat.name}
          </span>
          <Mono className="shrink-0 text-[12px] text-ink-3">
            {formatEUR(cat.spent)} / {formatEUR(cat.budget)}
          </Mono>
        </span>

        <ProgressLine
          value={pct}
          className="mt-2 bg-line-soft"
          indicatorClassName={cn(
            tone === "success" && "bg-success",
            tone === "accent" && "bg-accent",
            tone === "destructive" && "bg-destructive",
          )}
        />

        <span className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-3">
          <span>
            <Mono>{cat.txCount}</Mono> mov
          </span>
          {cat.avoided > 0 ? (
            <span className="text-success">
              <Mono>{MINUS}{formatEUR(cat.avoided)}</Mono> evitati
            </span>
          ) : null}
          {cat.rollover !== 0 ? (
            <span className={cat.rollover > 0 ? "text-success" : "text-destructive"}>
              rollover <Mono>{formatEUR(cat.rollover, { sign: true })}</Mono>
            </span>
          ) : null}
          {share > 0 ? (
            <span>
              quota <Mono>{Math.round(share)}%</Mono>
            </span>
          ) : null}
        </span>
      </span>

      <span className="flex min-w-[72px] shrink-0 items-center justify-end gap-1.5">
        <span className="text-right">
          <Mono
            className={cn(
              "block text-[14px] font-semibold",
              remaining < 0 && "text-destructive",
            )}
          >
            {remaining < 0 ? formatOverDelta(Math.abs(remaining)) : formatEUR(remaining)}
          </Mono>
          <span className="block text-[10px] lowercase text-ink-3">
            {remaining < 0 ? "sforato" : "rimane"}
          </span>
        </span>
        <ChevronRight className="size-4 text-ink-3" aria-hidden="true" />
      </span>
    </button>
  );
}

export function CraftedBudgetPage(props: CraftedBudgetPageProps) {
  const router = useRouter();
  const remaining = props.totalBudget - props.spent;
  const spentPct = props.totalBudget > 0 ? (props.spent / props.totalBudget) * 100 : 0;
  const trajectory = (props.dayOfMonth / props.daysInMonth) * props.totalBudget;
  const aboveTrajectory = props.spent > trajectory;
  const paceDelta = Math.abs(props.spent - trajectory);
  const netImpact = props.spent - props.avoided;
  const overCategories = useMemo(
    () => props.categories.filter((cat) => cat.spent > cat.budget),
    [props.categories],
  );

  return (
    <main className="pb-6">
      <section className="px-[var(--sp-page-x)] pb-5 pt-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Label className="mb-2 block">Budget</Label>
            <h1 className="truncate text-[28px] font-semibold leading-none tracking-[-0.02em]">
              {props.monthLabel}{" "}
              <Serif className="font-normal text-muted-foreground">
                {props.yearLabel}
              </Serif>
            </h1>
          </div>

          <label className="relative inline-flex h-9 shrink-0 items-center rounded-[var(--r-control)] border border-line text-[12px] text-muted-foreground">
            <span className="sr-only">Seleziona mese</span>
            <Mono className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
              {props.monthCode}
            </Mono>
            <select
              value={props.monthKey}
              onChange={(event) => router.push(`/budget?month=${event.target.value}`)}
              className="h-full appearance-none rounded-[var(--r-control)] bg-transparent pl-3 pr-8 text-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Seleziona mese"
            >
              {props.monthOptions.map((option) => (
                <option key={option.month} value={option.month}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2"
              aria-hidden="true"
            />
          </label>
        </div>

        <div className="rounded-[var(--r-card)] bg-surface-muted p-5">
          <Label className="mb-3 block">Rimanente</Label>
          <Mono
            className={cn(
              "block truncate text-[44px] font-semibold leading-none tracking-[-0.02em]",
              remaining < 0 && "text-destructive",
            )}
          >
            {formatEUR(remaining)}
          </Mono>
          <div className="mt-4">
            <ProgressLine
              value={spentPct}
              thick
              className="bg-background"
              indicatorClassName={remaining < 0 ? "bg-destructive" : "bg-accent"}
            />
          </div>

          <div
            className={cn(
              "mt-4 flex items-start gap-3 rounded-[var(--r-control)] border px-3 py-3",
              aboveTrajectory
                ? "border-destructive/25 bg-destructive/5 text-destructive"
                : "border-success/25 bg-success/10 text-success",
            )}
          >
            {aboveTrajectory ? (
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            ) : (
              <TrendingDown className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold">
                {aboveTrajectory ? "Sopra la traiettoria" : "Sotto la traiettoria"}
              </p>
              <Serif className="mt-0.5 block text-[13px] text-muted-foreground">
                Ritmo di oggi: <Mono>{formatEUR(trajectory)}</Mono> · scarto{" "}
                <Mono>{formatEUR(paceDelta)}</Mono>
              </Serif>
            </div>
          </div>
        </div>
      </section>

      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Budget" value={props.totalBudget} />
          <MiniStat label="Speso" value={props.spent} />
          <MiniStat
            label="Impatto"
            value={netImpact}
            tone={props.avoided > 0 ? "success" : "accent"}
          />
        </div>
        <Serif className="mt-3 block text-[13px] text-muted-foreground">
          Impatto netto = speso reale meno acquisti evitati. Le categorie restano sulla spesa reale.
        </Serif>
      </section>

      {overCategories.length > 0 ? (
        <>
          <Rule soft />
          <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <Label className="mb-1 block text-destructive">Sforati</Label>
                <h2 className="text-[16px] font-semibold">Categorie oltre budget</h2>
              </div>
            </div>
            <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {overCategories.map((cat) => {
                const iconName = getCategoryIconName(cat);
                const delta = cat.spent - cat.budget;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    className="nlc-press w-[190px] shrink-0 rounded-[var(--r-card)] border border-destructive/25 bg-destructive/5 p-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={`Movimenti per ${cat.name}`}
                  >
                    <span className="mb-4 flex items-center justify-between gap-3">
                      <span className="flex size-9 items-center justify-center rounded-[var(--r-control)] bg-destructive/10 text-destructive">
                        <BudgetCategoryIcon name={iconName} className="size-4.5" />
                      </span>
                      <Mono className="text-[15px] font-semibold text-destructive">
                        {formatOverDelta(delta)}
                      </Mono>
                    </span>
                    <span className="block truncate text-[14px] font-semibold">
                      {cat.name}
                    </span>
                    <span className="mt-1 block text-[11px] text-ink-3">
                      <Mono>{formatEUR(cat.spent)}</Mono> su <Mono>{formatEUR(cat.budget)}</Mono>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      <Rule soft />

      <section className="px-[var(--sp-page-x)] py-[var(--sp-section-y)]">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div>
            <Label className="mb-1 block">Per categoria</Label>
            <h2 className="text-[16px] font-semibold">Dove stai sforando</h2>
          </div>
          <Link
            href="#gestione-budget"
            className="nlc-press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--r-chip)] bg-accent px-3 text-[13px] font-bold text-accent-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Nuova
          </Link>
        </div>

        <div>
          {props.categories.length > 0 ? (
            props.categories.map((cat, index) => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                totalBudget={props.totalBudget}
                last={index === props.categories.length - 1}
              />
            ))
          ) : (
            <div className="rounded-[var(--r-card)] border border-dashed border-line px-4 py-8 text-center">
              <Label className="mb-2 block">Nessuna categoria</Label>
              <Serif className="text-sm text-muted-foreground">
                Crea un budget per leggere il ritmo del mese.
              </Serif>
            </div>
          )}
        </div>
      </section>

      {props.managementSection ? (
        <>
          <Rule soft />
          {props.managementSection}
        </>
      ) : null}

      <footer className="px-[var(--sp-page-x)] py-5 text-center">
        <Rule soft className="mb-4" />
        <Label>Fine budget</Label>
      </footer>
    </main>
  );
}
