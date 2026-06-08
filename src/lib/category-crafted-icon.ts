import type { CraftedIconName } from "@/components/crafted";

type CategoryLike = {
  name?: string | null;
  slug?: string | null;
};

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const SLUG_ICON_MAP: Record<string, CraftedIconName> = {
  caffe: "coffee",
  coffee: "coffee",
  cibo: "fork",
  delivery: "fork",
  spesa: "fork",
  shopping: "bag",
  trasporti: "bike",
  auto: "bike",
  svago: "glass",
  viaggi: "plane",
  abbonamenti: "receipt",
  salute: "shield",
  regali: "bag",
  tech: "bag",
  beauty: "bag",
  altro: "receipt",
  sigarette: "cig",
};

export function getCategoryCraftedIcon(category?: CategoryLike): CraftedIconName {
  const slugKey = category?.slug ? normalizeKey(category.slug) : "";
  const nameKey = category?.name ? normalizeKey(category.name) : "";

  return (
    SLUG_ICON_MAP[slugKey] ??
    SLUG_ICON_MAP[nameKey] ??
    "receipt"
  );
}
