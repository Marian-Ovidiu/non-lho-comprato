import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function PageHeaderSkeleton({
  chips = 2,
  action = true,
}: {
  chips?: number;
  action?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-border/70 bg-surface/70 p-3.5 shadow-sm sm:p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-6 w-40 rounded-lg sm:h-7 sm:w-56" />
            <Skeleton className="h-4 w-full max-w-[34rem] rounded-lg" />
            <Skeleton className="h-4 w-4/5 rounded-lg" />
          </div>

          {action ? <Skeleton className="h-10 w-36 rounded-2xl" /> : null}
        </div>

        {chips > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: chips }).map((_, index) => (
              <Skeleton
                key={index}
                className={cn(
                  "h-7 rounded-full",
                  index === 0 ? "w-28" : index === 1 ? "w-32" : "w-24",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HudCardSkeleton({
  tone = "default",
}: {
  tone?: "default" | "success";
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border shadow-sm",
        tone === "success"
          ? "border-success/20 bg-success/10"
          : "border-border bg-surface",
      )}
    >
      <CardContent className="flex min-h-[4.75rem] flex-col justify-between gap-1.5 p-2.5 sm:p-3.5">
        <Skeleton
          className={cn(
            "h-3 w-24 rounded-full",
            tone === "success" && "bg-success/15",
          )}
        />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </CardContent>
    </Card>
  );
}

function StreakHeroSkeleton() {
  return (
    <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-premium-accent/12 via-surface to-surface-muted/70 shadow-sm">
      <CardContent className="flex min-h-[13rem] flex-col items-center justify-center gap-3 px-5 py-8 text-center sm:min-h-[15rem] sm:px-6">
        <Skeleton className="size-12 rounded-full bg-premium-accent/20" />
        <Skeleton className="h-12 w-44 rounded-xl sm:h-14 sm:w-56" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-44 rounded-full" />
          <Skeleton className="h-4 w-36 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function BalanceCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-6 w-72 max-w-full rounded-lg" />
        <Skeleton className="h-4 w-full max-w-[28rem] rounded-lg" />
      </CardContent>
    </Card>
  );
}

function MomentumCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border bg-surface shadow-sm">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-5 w-44 max-w-full rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-5/6 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-20 shrink-0 rounded-full" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </CardContent>
    </Card>
  );
}

function RecentEntrySkeleton() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-surface-muted/60 px-3 py-2.5">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40 max-w-full rounded-lg" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 shrink-0 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-4/5 rounded-lg px-1" />
    </div>
  );
}

function RecentEntriesSkeleton() {
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-2 p-4 pb-0 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-4 w-56 max-w-full rounded-lg" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2.5">
            <RecentEntrySkeleton />
            {index < 2 ? <Separator /> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Skeleton className="h-11 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-3 w-40 rounded-full" />
    </div>
  );
}

function EntryCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardContent className="space-y-3 p-4 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-44 max-w-full rounded-lg" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-28 rounded-lg" />
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-1.5">
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-4 w-28 rounded-lg" />
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-24 rounded-lg" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-full max-w-[16rem] rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function DayGroupSkeleton({ entries = 3 }: { entries?: number }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 rounded-lg" />
          <Skeleton className="h-4 w-40 rounded-lg" />
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: entries }).map((_, index) => (
          <EntryCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}

function OverviewCardSkeleton({ primary = false }: { primary?: boolean }) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/60 bg-surface/85 shadow-none ring-1 ring-white/5",
        primary && "col-span-2 xl:col-span-2",
      )}
    >
      <CardHeader className="space-y-2 p-3 pb-2 sm:p-4 sm:pb-3">
        <Skeleton className="h-3 w-24 rounded-full" />
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        <Skeleton className="h-8 w-24 rounded-lg" />
      </CardContent>
    </Card>
  );
}

function HeroStatsSkeleton() {
  return (
    <Card className="overflow-hidden border-border/60 bg-surface/90 shadow-none ring-1 ring-white/5">
      <CardHeader className="space-y-3 p-4 pb-0 sm:p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton className="h-3 w-32 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full max-w-[42rem] rounded-2xl sm:h-16" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full max-w-[40rem] rounded-lg" />
          <Skeleton className="h-4 w-4/5 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-4 sm:p-5 sm:pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.15rem] border border-success/20 bg-success/10 px-4 py-4 sm:col-span-2 sm:min-h-[148px]">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="mt-2 h-6 w-40 rounded-lg" />
            <Skeleton className="mt-2 h-4 w-full rounded-lg" />
            <Skeleton className="mt-2 h-4 w-4/5 rounded-lg" />
          </div>
          <div className="rounded-[1.15rem] border border-border/70 bg-surface-muted/80 px-4 py-4">
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="mt-2 h-6 w-24 rounded-lg" />
            <Skeleton className="mt-2 h-4 w-full rounded-lg" />
          </div>
          <div className="rounded-[1.15rem] border border-premium-accent/25 bg-premium-accent/10 px-4 py-4">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="mt-2 h-6 w-28 rounded-lg" />
            <Skeleton className="mt-2 h-4 w-4/5 rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ type }: { type: "bar" | "line" }) {
  return (
    <Card className="overflow-hidden border-border/60 bg-surface/85 shadow-none ring-1 ring-white/5">
      <CardHeader className="space-y-1.5 p-4 pb-0 sm:p-5">
        <Skeleton className="h-5 w-40 rounded-lg" />
        <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
      </CardHeader>
      <CardContent className="p-4 pt-3 sm:p-5 sm:pt-3">
        <div className="rounded-3xl border border-border/60 bg-surface-muted/55 p-2.5 sm:p-3">
          <div
            className={cn(
              "rounded-[1.3rem] border border-border/50 bg-background/65 p-3",
              type === "bar" ? "h-[280px] sm:h-[320px]" : "h-[260px] sm:h-[300px]",
            )}
          >
            <div className="flex h-full items-end gap-2">
              {type === "bar" ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="flex-1 space-y-2">
                    <Skeleton
                      className="mx-auto w-full rounded-t-2xl"
                      style={{ height: `${30 + ((index % 5) + 1) * 15}%` }}
                    />
                    <Skeleton className="h-3 w-full rounded-full" />
                  </div>
                ))
              ) : (
                <div className="relative h-full w-full">
                  <Skeleton className="absolute left-0 right-0 top-1/2 h-[1px] w-full" />
                  <Skeleton className="absolute left-[8%] top-[26%] h-[2px] w-[84%] rounded-full" />
                  <Skeleton className="absolute left-[12%] top-[38%] h-[2px] w-[76%] rounded-full" />
                  <Skeleton className="absolute left-[18%] top-[30%] h-[2px] w-[68%] rounded-full" />
                  <Skeleton className="absolute left-[20%] top-[56%] h-[2px] w-[58%] rounded-full" />
                  <Skeleton className="absolute left-[24%] top-[46%] h-[2px] w-[48%] rounded-full" />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ListPanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden border-border/60 bg-surface/85 shadow-none ring-1 ring-white/5">
      <CardHeader className="space-y-1.5 p-4 pb-0 sm:p-5">
        <Skeleton className="h-5 w-36 rounded-lg" />
        <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="rounded-3xl border border-border/60 bg-surface-muted/70 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-44 rounded-lg" />
                  <Skeleton className="h-4 w-28 rounded-full" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                <Skeleton className="h-7 rounded-full" />
                <Skeleton className="h-7 rounded-full" />
                <Skeleton className="h-7 rounded-full" />
                <Skeleton className="h-7 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatsFilterSkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      <Skeleton className="h-9 w-20 rounded-full" />
      <Skeleton className="h-9 w-24 rounded-full" />
      <Skeleton className="h-9 w-28 rounded-full" />
    </div>
  );
}

function EntrySearchSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-11 w-full rounded-2xl" />
      <Skeleton className="h-3 w-44 rounded-full" />
    </div>
  );
}

function HabitFormSkeleton() {
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-1.5 p-4 pb-0 sm:p-5">
        <Skeleton className="h-6 w-36 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-[34rem] rounded-lg" />
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-16 rounded-full" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={index} className="h-11 rounded-2xl" />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-14 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-12 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HabitCardSkeleton() {
  return (
    <div className="relative space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-5 w-44 rounded-lg" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex items-start gap-2 sm:text-right">
          <div className="space-y-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          <Skeleton className="size-8 rounded-full" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
}

function HabitListSkeleton() {
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <Skeleton className="h-6 w-36 rounded-lg" />
        <Skeleton className="h-4 w-64 max-w-full rounded-lg" />
      </CardHeader>
      <CardContent className="space-y-4 p-5 sm:p-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-4">
            <HabitCardSkeleton />
            {index < 2 ? <Separator /> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TodayHabitsSkeleton() {
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardHeader className="space-y-2 p-5 pb-0 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 sm:p-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-border bg-surface-muted p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40 rounded-lg" />
                  <Skeleton className="h-4 w-32 rounded-full" />
                </div>
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
              </div>

              <Skeleton className="h-10 w-full rounded-2xl" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeaderSkeleton chips={3} action />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HudCardSkeleton tone="success" />
        <HudCardSkeleton />
        <HudCardSkeleton />
        <HudCardSkeleton />
      </div>

      <StreakHeroSkeleton />
      <BalanceCardSkeleton />
      <MomentumCardSkeleton />
      <RecentEntriesSkeleton />
    </main>
  );
}

export function EntriesLoadingSkeleton() {
  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeaderSkeleton chips={2} action />

      <div className="space-y-4">
        <EntrySearchSkeleton />

        <div className="space-y-4">
          <DayGroupSkeleton entries={3} />
          <DayGroupSkeleton entries={2} />
          <DayGroupSkeleton entries={3} />
        </div>

        <Skeleton className="h-11 w-full rounded-2xl" />
      </div>
    </main>
  );
}

export function StatsLoadingSkeleton() {
  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeaderSkeleton chips={3} action />

      <StatsFilterSkeleton />

      <HeroStatsSkeleton />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <OverviewCardSkeleton primary />
        <OverviewCardSkeleton />
        <OverviewCardSkeleton />
        <OverviewCardSkeleton />
        <OverviewCardSkeleton />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <ChartSkeleton type="bar" />
        <ChartSkeleton type="line" />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <ListPanelSkeleton rows={4} />
        <ListPanelSkeleton rows={4} />
      </section>
    </main>
  );
}

export function HabitsLoadingSkeleton() {
  return (
    <main className="space-y-5 sm:space-y-6">
      <PageHeaderSkeleton chips={2} action />

      <section id="oggi" className="space-y-4">
        <TodayHabitsSkeleton />
      </section>

      <section id="nuova-abitudine" className="space-y-4">
        <HabitFormSkeleton />
      </section>

      <section id="le-tue-abitudini" className="space-y-4">
        <HabitListSkeleton />
      </section>
    </main>
  );
}
