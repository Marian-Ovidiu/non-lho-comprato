export const dynamic = "force-dynamic";

import { getCategories } from "@/src/actions/entries";
import { getPresets } from "@/src/actions/presets";
import { Label, Rule } from "@/components/crafted";
import { CraftedPresetForm } from "@/src/components/presets/crafted-preset-form";
import { CraftedPresetList } from "@/src/components/presets/crafted-preset-list";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";

export default async function PresetsPage() {
  let loadError: string | null = null;
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let presets: Awaited<ReturnType<typeof getPresets>> = [];

  try {
    [categories, presets] = await Promise.all([getCategories(), getPresets()]);
  } catch (error) {
    loadError = formatEntryLoadError(error);
    console.error("Failed to load presets page:", error);
  }

  const resolvedCategories =
    categories.length > 0
      ? categories
      : DEFAULT_CATEGORIES.map((category) => ({
          id: category.slug,
          name: category.name,
          slug: category.slug,
          color: category.color,
          icon: category.icon,
        }));

  return (
    <main className="pb-6">
      {loadError ? (
        <div className="px-5 pt-5 pb-4">
          <DataLoadErrorBanner
            title="Impossibile caricare i preset"
            message={loadError}
          />
        </div>
      ) : null}

      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        <Label className="mb-2 block">Preset rapidi</Label>
        <p className="mb-6 text-sm text-ink-3">
          Salva modelli ricorrenti per creare movimenti in un tocco.
        </p>
        <CraftedPresetForm categories={resolvedCategories} />
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
