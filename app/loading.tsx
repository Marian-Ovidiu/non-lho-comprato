import { Skeleton } from "@/components/ui/skeleton";

function StartupMark() {
  return (
    <div className="relative flex size-14 items-center justify-center rounded-[1.6rem] border border-primary/20 bg-primary text-primary-foreground shadow-[0_14px_30px_rgba(27,58,47,0.22)]">
      <div className="absolute inset-[14%] rounded-[1.1rem] border border-white/15" />
      <div className="absolute inset-[26%] rounded-[0.95rem] bg-background/10" />
      <div className="relative flex size-[52%] items-center justify-center rounded-[0.9rem] bg-background text-primary">
        <span className="h-[1px] w-4 rounded-full bg-current" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-5 py-8 sm:px-6 lg:px-8">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <StartupMark />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-text">
              Non l&apos;ho comprato
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[2rem] sm:leading-tight">
              Sto riprendendo il tuo spazio.
            </h1>
            <p className="mx-auto max-w-xs text-sm leading-6 text-muted-text">
              Sessione, workspace e contenuti stanno tornando in ordine.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-[1.75rem] border border-border/70 bg-surface/85 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          <div className="grid gap-3">
            <Skeleton className="h-20 w-full rounded-[1.4rem]" />
            <Skeleton className="h-20 w-full rounded-[1.4rem]" />
          </div>
        </div>
      </section>
    </main>
  );
}
