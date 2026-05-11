import { StreakCard, type StreakCardProps } from "@/src/components/streaks/streak-card";

type StreakSummaryProps = {
  title?: string;
  items: StreakCardProps[];
};

export function StreakSummary({
  title = "Serie",
  items,
}: StreakSummaryProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          {title}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Un riepilogo rapido delle serie di risparmio.
        </p>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {items.map((item) => (
            <StreakCard key={`${item.title}-${item.person ?? "all"}`} {...item} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/40">
          Nessuna serie da mostrare.
        </p>
      )}
    </section>
  );
}
