type StatsHeroCardProps = {
  totalSaved: number;
  summary: string;
  insights: Array<{
    label: string;
    value: string;
    detail?: string;
    tone?: "default" | "success" | "premium";
  }>;
};

export function StatsHeroCard({ totalSaved, summary }: StatsHeroCardProps) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-surface p-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Totale tenuto
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span
          className="font-num font-bold leading-none text-accent"
          style={{ fontSize: 72, letterSpacing: "-0.06em" }}
        >
          {new Intl.NumberFormat("it-IT", {
            maximumFractionDigits: 0,
          }).format(totalSaved)}
        </span>
        <span className="font-num text-2xl font-medium text-muted-foreground">€</span>
      </div>
      {summary ? (
        <p className="mt-3 max-w-xl text-[13px] leading-5 text-muted-foreground">
          {summary}
        </p>
      ) : null}
    </div>
  );
}
