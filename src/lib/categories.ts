export type DefaultCategory = {
  name: string;
  slug: string;
  icon: string;
  color: string;
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Cibo", slug: "cibo", icon: "utensils", color: "#f97316" },
  { name: "Caffè", slug: "caffe", icon: "coffee", color: "#a16207" },
  { name: "Delivery", slug: "delivery", icon: "truck", color: "#ea580c" },
  { name: "Spesa", slug: "spesa", icon: "shopping-cart", color: "#16a34a" },
  { name: "Trasporti", slug: "trasporti", icon: "bus", color: "#2563eb" },
  { name: "Auto", slug: "auto", icon: "car-front", color: "#0f766e" },
  { name: "Shopping", slug: "shopping", icon: "shopping-bag", color: "#db2777" },
  { name: "Casa", slug: "casa", icon: "home", color: "#7c3aed" },
  { name: "Svago", slug: "svago", icon: "party-popper", color: "#8b5cf6" },
  { name: "Viaggi", slug: "viaggi", icon: "plane", color: "#0284c7" },
  { name: "Abbonamenti", slug: "abbonamenti", icon: "receipt-text", color: "#475569" },
  { name: "Salute", slug: "salute", icon: "heart-pulse", color: "#dc2626" },
  { name: "Regali", slug: "regali", icon: "gift", color: "#ec4899" },
  { name: "Tech", slug: "tech", icon: "laptop", color: "#14b8a6" },
  { name: "Beauty", slug: "beauty", icon: "sparkles", color: "#d946ef" },
  {
    name: "Sigarette / Accessori",
    slug: "sigarette-accessori",
    icon: "cigarette",
    color: "#78716c",
  },
  { name: "Altro", slug: "altro", icon: "more-horizontal", color: "#6b7280" },
];
