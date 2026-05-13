import { Skeleton } from "@/components/ui/skeleton";

function HeaderSkeleton() {
  return (
    <section className="rounded-3xl border border-border/70 bg-surface/70 p-3.5 shadow-sm sm:p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-6 w-44 rounded-lg" />
            <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
          </div>
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>
    </section>
  );
}

function MetricCardSkeleton({ highlight = false }: { highlight?: boolean }) {
  return (
    <div
      className={
        highlight
          ? "rounded-3xl border border-success/20 bg-success/10 p-4 shadow-sm"
          : "rounded-3xl border border-border bg-surface p-4 shadow-sm"
      }
    >
      <Skeleton className="h-3 w-28 rounded-full" />
      <Skeleton className="mt-3 h-8 w-24 rounded-lg" />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="space-y-3 sm:space-y-4">
      <HeaderSkeleton />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCardSkeleton highlight />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <Skeleton className="h-4 w-40 rounded-full" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-24 w-full rounded-3xl" />
            <Skeleton className="h-24 w-full rounded-3xl" />
            <Skeleton className="h-24 w-full rounded-3xl" />
          </div>
        </section>

        <div className="grid gap-3">
          <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-5">
            <Skeleton className="h-4 w-28 rounded-full" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-5">
            <Skeleton className="h-4 w-24 rounded-full" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
