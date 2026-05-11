import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4 py-12">
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-zinc-200/80 bg-white px-6 py-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <Loader2
          className="size-6 animate-spin text-zinc-950 dark:text-zinc-50"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Caricamento...
        </p>
      </div>
    </div>
  );
}
