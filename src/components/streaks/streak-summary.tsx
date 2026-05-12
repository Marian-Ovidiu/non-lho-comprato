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
        <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-text dark:text-muted-text">
          Un riepilogo rapido delle serie di risparmio.
        </p>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {items.map((item) => (
            <StreakCard
              key={`${item.title}-${item.person ?? "all"}`}
              {...item}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border bg-surface-muted px-4 py-5 text-sm text-muted-text dark:border-border dark:bg-accent/40">
          Nessuna serie da mostrare.
        </p>
      )}
    </section>
  );
}

