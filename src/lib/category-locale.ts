const CATEGORY_NAMES: Record<string, Record<string, string>> = {
  cibo:                 { it: "Cibo",                    en: "Food" },
  caffe:                { it: "Caffè",                   en: "Coffee" },
  delivery:             { it: "Delivery",                en: "Delivery" },
  spesa:                { it: "Spesa",                   en: "Groceries" },
  trasporti:            { it: "Trasporti",               en: "Transport" },
  auto:                 { it: "Auto",                    en: "Car" },
  shopping:             { it: "Shopping",                en: "Shopping" },
  casa:                 { it: "Casa",                    en: "Home" },
  svago:                { it: "Svago",                   en: "Entertainment" },
  viaggi:               { it: "Viaggi",                  en: "Travel" },
  abbonamenti:          { it: "Abbonamenti",             en: "Subscriptions" },
  salute:               { it: "Salute",                  en: "Health" },
  regali:               { it: "Regali",                  en: "Gifts" },
  tech:                 { it: "Tech",                    en: "Tech" },
  beauty:               { it: "Beauty",                  en: "Beauty" },
  "sigarette-accessori":{ it: "Sigarette / Accessori",  en: "Cigarettes / Accessories" },
  altro:                { it: "Altro",                   en: "Other" },
};

export function getLocalizedCategoryName(
  slug: string | null | undefined,
  language: string,
): string | undefined {
  if (!slug) return undefined;
  return CATEGORY_NAMES[slug]?.[language];
}
