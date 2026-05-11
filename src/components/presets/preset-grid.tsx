import { PresetCard } from "@/src/components/presets/preset-card";

type PresetGridProps = {
  presets: Array<{
    id: string;
    title: string;
    category: {
      name: string;
    };
    realCost: unknown;
    alternativeCost: unknown;
    note: string | null;
    person: "MARIAN" | "MARTINA" | null;
    createdAt: Date;
  }>;
};

export function PresetGrid({ presets }: PresetGridProps) {
  if (presets.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-5 text-sm leading-6 text-zinc-600">
        Ancora nessun preset. Salva una spesa ricorrente per riusarla in un tocco.
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {presets.map((preset) => (
        <PresetCard key={preset.id} preset={preset} />
      ))}
    </div>
  );
}
