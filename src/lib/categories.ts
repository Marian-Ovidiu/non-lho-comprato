export type DefaultCategory = {
  name: string;
  slug: string;
  icon: string;
  color: string;
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Cibo", slug: "cibo", icon: "utensils", color: "#f97316" },
  { name: "Caffè", slug: "caffe", icon: "coffee", color: "#a16207" },
  { name: "Trasporti", slug: "trasporti", icon: "bus", color: "#2563eb" },
  { name: "Shopping", slug: "shopping", icon: "shopping-bag", color: "#db2777" },
  { name: "Svago", slug: "svago", icon: "party-popper", color: "#7c3aed" },
  { name: "Altro", slug: "altro", icon: "more-horizontal", color: "#6b7280" },
];
