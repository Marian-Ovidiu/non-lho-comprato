import { formatMoney } from "@/src/lib/formatters";
import { getCategoryEmoji } from "@/src/lib/visual-cues";

type Category = {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  totalRealSpent: number;
  totalAlternativeCost: number;
  totalSaved: number;
  entriesCount: number;
  averageSaved: number;
};

type CategoryStatsListProps = {
  categories: Category[];
};

export function CategoryStatsList({ categories }: CategoryStatsListProps) {
  if (categories.length === 0) {
    return (
      <div className="flex h-[80px] items-center justify-center rounded-[14px] border border-dashed border-border/70 bg-surface-muted/60 text-sm text-muted-foreground">
        Nessun dato per categoria ancora disponibile.
      </div>
    );
  }

  const sorted = [...categories].sort((a, b) => b.totalSaved - a.totalSaved);
  const top = sorted[0];
  const totalAllSaved = sorted.reduce((s, c) => s + c.totalSaved, 0);
  const topPct = totalAllSaved > 0 ? Math.round((top.totalSaved / totalAllSaved) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Vincitrice del mese */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-surface p-[18px]">
        <p className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Vincitrice del mese
        </p>
        <div className="flex items-center gap-3.5">
          <div
            className="flex shrink-0 items-center justify-center rounded-[20px] bg-accent text-accent-foreground"
            style={{ width: 64, height: 64, fontSize: 32 }}
          >
            {getCategoryEmoji({ slug: top.categorySlug, name: top.categoryName })}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif italic text-sm text-muted-foreground">hai tenuto</p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="font-num text-[28px] font-semibold leading-none">
                {formatMoney(top.totalSaved)}
              </span>
              <span className="text-sm text-muted-foreground">in {top.categoryName}</span>
            </div>
            <p className="mt-1 text-[12px]" style={{ color: "var(--text-3)" }}>
              {top.entriesCount} movimenti · {topPct}% del totale mese
            </p>
          </div>
        </div>
      </div>

      {/* Per-category list */}
      <div className="overflow-hidden rounded-[14px] border border-border bg-surface">
        <div className="flex items-baseline justify-between px-4 pb-2 pt-[18px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Per categoria
          </p>
          <span className="font-num text-[11px]" style={{ color: "var(--text-3)" }}>
            {sorted.length}
          </span>
        </div>
        <div className="px-4 pb-2">
          {sorted.map((cat, i) => {
            const isTop = cat.categoryId === top.categoryId;
            const pct = top.totalSaved > 0 ? cat.totalSaved / top.totalSaved : 0;
            const emoji = getCategoryEmoji({ slug: cat.categorySlug, name: cat.categoryName });
            return (
              <div
                key={cat.categoryId}
                style={{
                  padding: "12px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span style={{ fontSize: 22 }}>{emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{cat.categoryName}</span>
                    <span className="font-num" style={{ fontSize: 13, fontWeight: 600 }}>
                      {formatMoney(cat.totalSaved)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: "var(--surface-muted)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct * 100}%`,
                        height: "100%",
                        background: isTop ? "var(--accent)" : "var(--muted-foreground)",
                        borderRadius: 2,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
