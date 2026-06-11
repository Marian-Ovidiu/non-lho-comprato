export const dynamic = "force-dynamic";

import { getCategories } from "@/src/actions/entries";
import { getPresets } from "@/src/actions/presets";
import { Label, Rule } from "@/components/crafted";
import {
  CraftedPresetForm,
  type CraftedPresetFormInitialValue,
} from "@/src/components/presets/crafted-preset-form";
import { CraftedDefaultPresetList } from "@/src/components/presets/crafted-default-preset-list";
import { CraftedPresetList } from "@/src/components/presets/crafted-preset-list";
import { DataLoadErrorBanner } from "@/src/components/shared/data-load-error-banner";
import { DEFAULT_CATEGORIES } from "@/src/lib/categories";
import { formatEntryLoadError } from "@/src/lib/entry-load-debug";
import { DEFAULT_QUICK_ADD_PRESETS } from "@/src/lib/quick-add-presets";

type PresetsPageProps = {
  searchParams: Promise<{
    edit?: string | string[];
    defaultPreset?: string | string[];
  }>;
};

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PresetsPage({ searchParams }: PresetsPageProps) {
  const resolvedSearchParams = await searchParams;
  const editPresetId = getFirstParam(resolvedSearchParams.edit);
  const defaultPresetId = getFirstParam(resolvedSearchParams.defaultPreset);
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
  const editablePreset = presets.find((preset) => preset.id === editPresetId);
  const defaultPreset = DEFAULT_QUICK_ADD_PRESETS.find(
    (preset) => preset.id === defaultPresetId,
  );
  const defaultPresetCategory = defaultPreset
    ? resolvedCategories.find(
        (category) =>
          category.slug === defaultPreset.categorySlug ||
          category.id === defaultPreset.categorySlug,
      )
    : null;
  const initialPreset: CraftedPresetFormInitialValue | undefined = editablePreset
    ? {
        id: editablePreset.id,
        title: editablePreset.title,
        categoryId: editablePreset.category.id,
        mode: editablePreset.mode,
        savingContext: editablePreset.savingContext,
        amountSpent: editablePreset.amountSpent,
        comparisonAmount: editablePreset.comparisonAmount,
        note: editablePreset.note ?? "",
      }
    : defaultPreset
      ? {
          title: defaultPreset.title,
          categoryId: defaultPresetCategory?.id ?? defaultPreset.categorySlug,
          mode: "spent",
          savingContext: "none",
          amountSpent: defaultPreset.amount.toFixed(2),
          comparisonAmount: "",
          note: "",
        }
      : undefined;

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
        <Label className="mb-2 block">
          {editablePreset ? "Modifica preset" : "Preset rapidi"}
        </Label>
        <p className="mb-6 text-sm text-ink-3">
          {editablePreset
            ? "Aggiorna un modello ricorrente gia salvato."
            : defaultPreset
              ? "Personalizza un preset di default e salvalo tra i tuoi preset."
              : "Salva modelli ricorrenti per creare movimenti in un tocco."}
        </p>
        <CraftedPresetForm
          key={editablePreset?.id ?? defaultPreset?.id ?? "new"}
          categories={resolvedCategories}
          initialPreset={initialPreset}
        />
      </section>

      <Rule />

      <section className="-mx-4 px-5 py-6 sm:-mx-6 lg:-mx-8">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <Label>Preset di default</Label>
          <span className="font-num text-[11px] text-ink-3">
            {DEFAULT_QUICK_ADD_PRESETS.length}
          </span>
        </div>
        <CraftedDefaultPresetList />
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
