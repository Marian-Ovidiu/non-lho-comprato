export const dynamic = "force-dynamic";

import { getCategories } from "@/src/actions/entries";
import { getPresets } from "@/src/actions/presets";
import { Label, Rule } from "@/components/crafted";
import { CraftedPresetForm } from "@/src/components/presets/crafted-preset-form";
import { CraftedPresetList } from "@/src/components/presets/crafted-preset-list";

export default async function PresetsPage() {
  const [categories, presets] = await Promise.all([getCategories(), getPresets()]);

  return (
    <main className="pb-6">
      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        <Label className="mb-2 block">Preset rapidi</Label>
        <p className="mb-6 text-sm text-ink-3">
          Salva modelli ricorrenti per creare movimenti in un tocco.
        </p>
        <CraftedPresetForm categories={categories} />
      </section>

      <Rule />

      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <Label>Preset salvati</Label>
          <span className="font-num text-[11px] text-ink-3">{presets.length}</span>
        </div>
        <CraftedPresetList presets={presets} />
      </section>
    </main>
  );
}
