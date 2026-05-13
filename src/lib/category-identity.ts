type CategoryLike = {
  name?: string | null;
  slug?: string | null;
};

type CategoryIdentity = {
  chipClassName: string;
  markerClassName: string;
  subtleSurfaceClassName: string;
};

const DEFAULT_IDENTITY: CategoryIdentity = {
  chipClassName:
    "border-border/60 bg-surface-muted/75 text-muted-text ring-1 ring-white/5 dark:border-border/60",
  markerClassName: "bg-surface text-muted-text",
  subtleSurfaceClassName: "border-border/60 bg-surface-muted/70",
};

const CATEGORY_IDENTITIES: Record<string, CategoryIdentity> = {
  cibo: {
    chipClassName:
      "border-amber-500/12 bg-amber-500/8 text-amber-100/90 ring-1 ring-amber-500/10",
    markerClassName: "bg-amber-500/15 text-amber-50",
    subtleSurfaceClassName: "border-amber-500/12 bg-amber-500/8",
  },
  caffe: {
    chipClassName:
      "border-amber-500/12 bg-amber-500/8 text-amber-100/90 ring-1 ring-amber-500/10",
    markerClassName: "bg-amber-500/15 text-amber-50",
    subtleSurfaceClassName: "border-amber-500/12 bg-amber-500/8",
  },
  delivery: {
    chipClassName:
      "border-orange-500/12 bg-orange-500/8 text-orange-100/90 ring-1 ring-orange-500/10",
    markerClassName: "bg-orange-500/15 text-orange-50",
    subtleSurfaceClassName: "border-orange-500/12 bg-orange-500/8",
  },
  spesa: {
    chipClassName:
      "border-emerald-500/12 bg-emerald-500/8 text-emerald-100/90 ring-1 ring-emerald-500/10",
    markerClassName: "bg-emerald-500/15 text-emerald-50",
    subtleSurfaceClassName: "border-emerald-500/12 bg-emerald-500/8",
  },
  trasporti: {
    chipClassName:
      "border-sky-500/12 bg-sky-500/8 text-sky-100/90 ring-1 ring-sky-500/10",
    markerClassName: "bg-sky-500/15 text-sky-50",
    subtleSurfaceClassName: "border-sky-500/12 bg-sky-500/8",
  },
  auto: {
    chipClassName:
      "border-cyan-500/12 bg-cyan-500/8 text-cyan-100/90 ring-1 ring-cyan-500/10",
    markerClassName: "bg-cyan-500/15 text-cyan-50",
    subtleSurfaceClassName: "border-cyan-500/12 bg-cyan-500/8",
  },
  shopping: {
    chipClassName:
      "border-pink-500/12 bg-pink-500/8 text-pink-100/90 ring-1 ring-pink-500/10",
    markerClassName: "bg-pink-500/15 text-pink-50",
    subtleSurfaceClassName: "border-pink-500/12 bg-pink-500/8",
  },
  casa: {
    chipClassName:
      "border-violet-500/12 bg-violet-500/8 text-violet-100/90 ring-1 ring-violet-500/10",
    markerClassName: "bg-violet-500/15 text-violet-50",
    subtleSurfaceClassName: "border-violet-500/12 bg-violet-500/8",
  },
  svago: {
    chipClassName:
      "border-indigo-500/12 bg-indigo-500/8 text-indigo-100/90 ring-1 ring-indigo-500/10",
    markerClassName: "bg-indigo-500/15 text-indigo-50",
    subtleSurfaceClassName: "border-indigo-500/12 bg-indigo-500/8",
  },
  viaggi: {
    chipClassName:
      "border-blue-500/12 bg-blue-500/8 text-blue-100/90 ring-1 ring-blue-500/10",
    markerClassName: "bg-blue-500/15 text-blue-50",
    subtleSurfaceClassName: "border-blue-500/12 bg-blue-500/8",
  },
  abbonamenti: {
    chipClassName:
      "border-slate-500/12 bg-slate-500/8 text-slate-100/90 ring-1 ring-slate-500/10",
    markerClassName: "bg-slate-500/15 text-slate-50",
    subtleSurfaceClassName: "border-slate-500/12 bg-slate-500/8",
  },
  salute: {
    chipClassName:
      "border-rose-500/12 bg-rose-500/8 text-rose-100/90 ring-1 ring-rose-500/10",
    markerClassName: "bg-rose-500/15 text-rose-50",
    subtleSurfaceClassName: "border-rose-500/12 bg-rose-500/8",
  },
  regali: {
    chipClassName:
      "border-fuchsia-500/12 bg-fuchsia-500/8 text-fuchsia-100/90 ring-1 ring-fuchsia-500/10",
    markerClassName: "bg-fuchsia-500/15 text-fuchsia-50",
    subtleSurfaceClassName: "border-fuchsia-500/12 bg-fuchsia-500/8",
  },
  tech: {
    chipClassName:
      "border-teal-500/12 bg-teal-500/8 text-teal-100/90 ring-1 ring-teal-500/10",
    markerClassName: "bg-teal-500/15 text-teal-50",
    subtleSurfaceClassName: "border-teal-500/12 bg-teal-500/8",
  },
  beauty: {
    chipClassName:
      "border-purple-500/12 bg-purple-500/8 text-purple-100/90 ring-1 ring-purple-500/10",
    markerClassName: "bg-purple-500/15 text-purple-50",
    subtleSurfaceClassName: "border-purple-500/12 bg-purple-500/8",
  },
  altro: DEFAULT_IDENTITY,
};

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function getCategoryIdentity(category?: CategoryLike): CategoryIdentity {
  const slugKey = category?.slug ? normalizeKey(category.slug) : "";
  const nameKey = category?.name ? normalizeKey(category.name) : "";

  return CATEGORY_IDENTITIES[slugKey] ?? CATEGORY_IDENTITIES[nameKey] ?? DEFAULT_IDENTITY;
}
