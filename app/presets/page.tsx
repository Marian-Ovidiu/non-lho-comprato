export const dynamic = "force-dynamic";

import { getCategories } from "@/src/actions/entries";
import { getPresets } from "@/src/actions/presets";
import { PageHeader } from "@/src/components/layout/page-header";
import { PresetForm } from "@/src/components/presets/preset-form";
import { PresetGrid } from "@/src/components/presets/preset-grid";

export default async function PresetsPage() {
  const [categories, presets] = await Promise.all([getCategories(), getPresets()]);

  return (
    <main className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Strumenti"
        title="Azioni rapide"
        description="Salva modelli ricorrenti per creare movimenti in un tocco."
      />

      <PresetForm categories={categories} />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-950">Preset salvati</h2>
          <p className="text-sm text-zinc-500">
            I modelli più recenti, pronti da usare o eliminare.
          </p>
        </div>

        <PresetGrid presets={presets} />
      </section>
    </main>
  );
}
