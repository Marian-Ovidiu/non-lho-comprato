import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-4 rounded-[1.75rem] border border-border/70 bg-surface/85 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-5 w-36 rounded-lg" />
          </div>
          <Skeleton className="size-10 rounded-2xl" />
        </div>

        <div className="space-y-2.5">
          <Skeleton className="h-16 w-full rounded-[1.25rem]" />
          <Skeleton className="h-16 w-full rounded-[1.25rem]" />
        </div>
      </div>
    </div>
  );
}
