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
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-7 w-28 rounded-full" />
          <Skeleton className="h-7 w-32 rounded-full" />
        </div>
      </div>
    </section>
  );
}

function StatTileSkeleton({ highlight = false }: { highlight?: boolean }) {
  return (
    <div
      className={
        highlight
          ? "rounded-3xl border border-success/20 bg-success/10 p-4 shadow-sm"
          : "rounded-3xl border border-border bg-surface p-4 shadow-sm"
      }
    >
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="mt-3 h-8 w-20 rounded-lg" />
    </div>
  );
}

function PanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <Skeleton className="h-4 w-36 rounded-full" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </section>
  );
}

export default function Loading() {
  return (
    <main className="space-y-5 sm:space-y-6">
      <HeaderSkeleton />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatTileSkeleton highlight />
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
        <StatTileSkeleton />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <PanelSkeleton lines={4} />
        <PanelSkeleton lines={4} />
      </section>

      <PanelSkeleton lines={5} />
      <PanelSkeleton lines={3} />
      <PanelSkeleton lines={4} />
    </main>
  );
}
