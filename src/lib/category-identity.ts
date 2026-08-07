type CategoryLike = {
  name?: string | null;
  slug?: string | null;
};

type CategoryIdentity = {
  chipClassName: string;
  markerClassName: string;
  subtleSurfaceClassName: string;
};

/**
 * L'identità di colore di una categoria.
 *
 * Le tinte non sono più i colori grezzi di Tailwind (amber, orange, rose…):
 * nella palette a ruoli quelli sono colori occupati dal giudizio, e una
 * categoria non deve poter dire "sei in tensione" o "hai sforato" solo perché
 * si chiama Delivery. La scala vive in globals.css (`.nlc-cat-*`) ed è già
 * tarata per i due temi.
 *
 * Sei famiglie invece di quindici tinte scorrelate: le categorie imparentate
 * condividono la tinta, e questo è informazione in più, non in meno.
 */
const FAMIGLIA = {
  nutrimento: "nlc-cat-nutrimento",
  servizi: "nlc-cat-servizi",
  spostarsi: "nlc-cat-spostarsi",
  abitare: "nlc-cat-abitare",
  desiderio: "nlc-cat-desiderio",
  neutro: "nlc-cat-neutro",
} as const;

function identity(famiglia: (typeof FAMIGLIA)[keyof typeof FAMIGLIA]): CategoryIdentity {
  return {
    chipClassName: `${famiglia} nlc-cat-chip ring-1 ring-transparent`,
    markerClassName: `${famiglia} nlc-cat-marker`,
    subtleSurfaceClassName: `${famiglia} nlc-cat-surface`,
  };
}

const DEFAULT_IDENTITY: CategoryIdentity = identity(FAMIGLIA.neutro);

const CATEGORY_IDENTITIES: Record<string, CategoryIdentity> = {
  cibo: identity(FAMIGLIA.nutrimento),
  caffe: identity(FAMIGLIA.nutrimento),
  spesa: identity(FAMIGLIA.nutrimento),
  salute: identity(FAMIGLIA.nutrimento),
  delivery: identity(FAMIGLIA.servizi),
  svago: identity(FAMIGLIA.servizi),
  trasporti: identity(FAMIGLIA.spostarsi),
  auto: identity(FAMIGLIA.spostarsi),
  viaggi: identity(FAMIGLIA.spostarsi),
  casa: identity(FAMIGLIA.abitare),
  abbonamenti: identity(FAMIGLIA.abitare),
  tech: identity(FAMIGLIA.abitare),
  shopping: identity(FAMIGLIA.desiderio),
  regali: identity(FAMIGLIA.desiderio),
  beauty: identity(FAMIGLIA.desiderio),
  altro: DEFAULT_IDENTITY,
};

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function getCategoryIdentity(category?: CategoryLike): CategoryIdentity {
  const slugKey = category?.slug ? normalizeKey(category.slug) : "";
  const nameKey = category?.name ? normalizeKey(category.name) : "";

  return CATEGORY_IDENTITIES[slugKey] ?? CATEGORY_IDENTITIES[nameKey] ?? DEFAULT_IDENTITY;
}
