import { Rule } from "@/components/crafted";
import { cn } from "@/lib/utils";

function CraftedSkeletonLine({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn("animate-pulse rounded-[1px] bg-line", className)}
      aria-hidden="true"
    />
  );
}

function CraftedSkeletonHero() {
  return (
    <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
      <CraftedSkeletonLine className="mb-4 h-3 w-24" />
      <CraftedSkeletonLine className="h-14 w-40" />
      <CraftedSkeletonLine className="mt-4 h-4 w-56 max-w-full" />
    </section>
  );
}

function CraftedSkeletonTrio() {
  return (
    <div className="-mx-4 flex border-y border-line sm:-mx-6 lg:-mx-8">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            "min-w-0 flex-1 px-5 py-4",
            index < 2 && "border-r border-line",
          )}
        >
          <CraftedSkeletonLine className="mb-2 h-2.5 w-16" />
          <CraftedSkeletonLine className="h-5 w-12" />
        </div>
      ))}
    </div>
  );
}

function CraftedSkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="-mx-4 px-5 sm:-mx-6 lg:-mx-8">
      <CraftedSkeletonLine className="mb-4 mt-5 h-3 w-28" />
      <div className="border-y border-line">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-3 py-4",
              index < rows - 1 && "border-b border-line-soft",
            )}
          >
            <CraftedSkeletonLine className="size-[18px] shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <CraftedSkeletonLine className="h-4 w-40 max-w-full" />
              <CraftedSkeletonLine className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
      <Rule className="mt-0" />
    </div>
  );
}

export function CraftedDashboardLoadingSkeleton() {
  return (
    <main className="pb-6">
      <CraftedSkeletonHero />
      <CraftedSkeletonTrio />
      <CraftedSkeletonRows rows={5} />
    </main>
  );
}

export function CraftedEntriesLoadingSkeleton() {
  return (
    <main className="pb-6">
      <CraftedSkeletonHero />
      <CraftedSkeletonRows rows={6} />
    </main>
  );
}

export function CraftedStatsLoadingSkeleton() {
  return (
    <main className="pb-6">
      <section className="-mx-4 px-5 pt-6 sm:-mx-6 lg:-mx-8">
        <div className="mb-6 flex gap-5">
          {[0, 1, 2].map((index) => (
            <CraftedSkeletonLine key={index} className="h-4 w-12" />
          ))}
        </div>
        <Rule />
      </section>
      <CraftedSkeletonHero />
      <CraftedSkeletonRows rows={4} />
    </main>
  );
}

export function CraftedGoalsLoadingSkeleton() {
  return (
    <main className="pb-6">
      <CraftedSkeletonHero />
      <CraftedSkeletonTrio />
      <CraftedSkeletonRows rows={3} />
    </main>
  );
}

export function CraftedHabitsLoadingSkeleton() {
  return (
    <main className="pb-6">
      <CraftedSkeletonHero />
      <CraftedSkeletonRows rows={4} />
      <CraftedSkeletonRows rows={3} />
    </main>
  );
}

export function CraftedMoreLoadingSkeleton() {
  return (
    <main className="pb-6">
      <CraftedSkeletonHero />
      <CraftedSkeletonTrio />
      <CraftedSkeletonRows rows={6} />
    </main>
  );
}

export function CraftedWorkspaceLoadingSkeleton() {
  return (
    <main className="pb-6">
      <CraftedSkeletonHero />
      <CraftedSkeletonRows rows={4} />
    </main>
  );
}
