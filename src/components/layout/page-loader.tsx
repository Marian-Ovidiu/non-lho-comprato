import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-3xl border border-border bg-surface px-5 py-4 text-center shadow-sm">
        <div className="flex items-center gap-2.5">
          <Loader2 className="size-6 animate-spin text-foreground" aria-hidden="true" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}
