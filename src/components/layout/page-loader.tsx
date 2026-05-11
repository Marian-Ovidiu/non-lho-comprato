import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface px-6 py-5 text-center shadow-sm">
        <Loader2 className="size-6 animate-spin text-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-muted-text">Caricamento...</p>
      </div>
    </div>
  );
}
