import { getLocalizedCategoryName } from "./category-locale";

export type DefaultCategory = {
  name: string;
  slug: string;
  icon: string;
  color: string;
};

/**
 * L'insieme di partenza. Sei voci sono arrivate qui dopo, guardando cosa le
 * persone creavano a mano: "Ristorante" era la terza categoria più usata
 * dell'intera app senza essere un default, e chi non ce l'aveva finiva per
 * mettere le cene dentro "Cibo" insieme alla spesa.
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Cibo", slug: "cibo", icon: "utensils", color: "#f97316" },
  { name: "Ristorante", slug: "ristorante", icon: "utensils-crossed", color: "#e11d48" },
  { name: "Colazione", slug: "colazione", icon: "croissant", color: "#d97706" },
  { name: "Caffè", slug: "caffe", icon: "coffee", color: "#a16207" },
  { name: "Delivery", slug: "delivery", icon: "truck", color: "#ea580c" },
  { name: "Spesa", slug: "spesa", icon: "shopping-cart", color: "#16a34a" },
  { name: "Trasporti", slug: "trasporti", icon: "bus", color: "#2563eb" },
  { name: "Auto", slug: "auto", icon: "car-front", color: "#0f766e" },
  { name: "Pedaggio", slug: "pedaggio", icon: "ticket-slash", color: "#0369a1" },
  { name: "Shopping", slug: "shopping", icon: "shopping-bag", color: "#db2777" },
  { name: "Casa", slug: "casa", icon: "home", color: "#7c3aed" },
  { name: "Bollette", slug: "bollette", icon: "zap", color: "#ca8a04" },
  { name: "Svago", slug: "svago", icon: "party-popper", color: "#8b5cf6" },
  { name: "Viaggi", slug: "viaggi", icon: "plane", color: "#0284c7" },
  { name: "Abbonamenti", slug: "abbonamenti", icon: "receipt-text", color: "#475569" },
  { name: "Salute", slug: "salute", icon: "heart-pulse", color: "#dc2626" },
  { name: "Farmacia", slug: "farmacia", icon: "pill", color: "#be123c" },
  { name: "Regali", slug: "regali", icon: "gift", color: "#ec4899" },
  { name: "Tech", slug: "tech", icon: "laptop", color: "#14b8a6" },
  { name: "Beauty", slug: "beauty", icon: "sparkles", color: "#d946ef" },
  { name: "Vestiti", slug: "vestiti", icon: "shirt", color: "#9333ea" },
  {
    name: "Sigarette / Accessori",
    slug: "sigarette-accessori",
    icon: "cigarette",
    color: "#78716c",
  },
  { name: "Altro", slug: "altro", icon: "more-horizontal", color: "#6b7280" },
];

export type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
};

export function sortCategoryOptionsByUsage(
  categories: readonly CategoryOption[],
  usageCountBySlug: ReadonlyMap<string, number>,
  language = "it",
): CategoryOption[] {
  return [...categories].sort((left, right) => {
    const usageDifference =
      (usageCountBySlug.get(right.slug) ?? 0) -
      (usageCountBySlug.get(left.slug) ?? 0);

    return usageDifference || left.name.localeCompare(right.name, language);
  });
}

export function toCategoryOption(
  category: CategoryOption & {
    workspaceId?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  },
): CategoryOption {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    color: category.color,
    icon: category.icon,
  };
}

export function mergeCategoryOptions(
  dbCategories: Array<
    CategoryOption & {
      workspaceId?: string | null;
      createdAt?: Date | string;
      updatedAt?: Date | string;
      archivedAt?: Date | null;
    }
  >,
  archivedDefaultSlugs: ReadonlySet<string> = new Set(),
  language = "it",
): CategoryOption[] {
  const bySlug = new Map<string, CategoryOption>();

  for (const category of DEFAULT_CATEGORIES) {
    if (!archivedDefaultSlugs.has(category.slug)) {
      bySlug.set(category.slug, {
        id: category.slug,
        name: getLocalizedCategoryName(category.slug, language) ?? category.name,
        slug: category.slug,
        color: category.color,
        icon: category.icon,
      });
    }
  }

  for (const category of dbCategories) {
    const dbOption = toCategoryOption(category);
    bySlug.set(category.slug, {
      ...dbOption,
      name: getLocalizedCategoryName(category.slug, language) ?? dbOption.name,
    });
  }

  return Array.from(bySlug.values()).sort((left, right) =>
    left.name.localeCompare(right.name, language),
  );
}
