import { PresetCard } from "@/src/components/presets/preset-card";

type DashboardQuickActionsProps = {
  presets: Array<{
    id: string;
    title: string;
    category: {
      name: string;
    };
    realCost: unknown;
    alternativeCost: unknown;
    note: string | null;
    person: "MARIAN" | "MARTINA" | "TUTTI" | null;
    createdAt: Date;
  }>;
};

export function DashboardQuickActions({
  presets,
}: DashboardQuickActionsProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-950">Azioni rapide</h2>
        <p className="text-sm text-zinc-500">
          Un tocco per trasformare una spesa evitata in un movimento.
        </p>
      </div>

      {presets.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-5 text-sm leading-6 text-zinc-600">
          Nessun preset ancora. Crea un preset per usare azioni rapide dal dashboard.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              compact
              showDelete={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}
