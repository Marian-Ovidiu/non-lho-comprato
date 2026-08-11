import type { CraftedIconName } from "@/components/crafted";

type CategoryLike = {
  name?: string | null;
  slug?: string | null;
};

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Un'icona per categoria, e mai la stessa due volte fra quelle di default.
 *
 * La versione precedente ne aveva nove per diciassette categorie: Cibo,
 * Delivery e Spesa condividevano la posata, Shopping, Regali, Tech e Beauty
 * la borsa, e tutto quello che non era in elenco — comprese tutte le categorie
 * create dagli utenti — finiva sulla ricevuta, cioè sulla stessa icona di
 * "Altro". In un elenco di movimenti l'icona è la prima cosa che si legge:
 * se è la stessa per quattro categorie, non sta dicendo niente.
 */
const SLUG_ICON_MAP: Record<string, CraftedIconName> = {
  // Le categorie di default: una ciascuna.
  cibo: "fork",
  ristorante: "restaurant",
  colazione: "croissant",
  caffe: "coffee",
  delivery: "bag",
  spesa: "cart",
  trasporti: "bus",
  auto: "car",
  pedaggio: "toll",
  shopping: "tags",
  casa: "home",
  bollette: "bolt",
  svago: "party",
  viaggi: "plane",
  abbonamenti: "receipt",
  salute: "shield",
  farmacia: "pill",
  regali: "gift",
  tech: "laptop",
  beauty: "sparkles",
  vestiti: "shirt",
  sigaretteaccessori: "cig",
  sigarette: "cig",
  altro: "dots",
};

/**
 * Sinonimi delle categorie create dagli utenti: prima ricadevano tutte
 * sull'icona di "Altro". Non cambiano cosa la categoria è — restano loro —
 * ma le danno un volto invece di lasciarle indistinguibili.
 */
const ALIAS_ICON_MAP: Record<string, CraftedIconName> = {
  luce: "bolt",
  gas: "bolt",
  utenze: "bolt",
  comunicazione: "bolt",
  medicina: "pill",
  medicine: "pill",
  igiene: "sparkles",
  cake: "croissant",
  dolci: "croissant",
  pranzo: "restaurant",
  cena: "restaurant",
  acquistionline: "tags",
  mobili: "home",
  spesecondominiali: "home",
  affitto: "home",
  imu: "receipt",
  tari: "receipt",
  tasse: "receipt",
  notaio: "receipt",
  agenzia: "receipt",
  costibanca: "wallet",
  banca: "wallet",
  investimento: "piggy",
  risparmi: "piggy",
  benzina: "car",
  carburante: "car",
  parcheggio: "car",
  taxi: "car",
  treno: "bus",
  metro: "bus",
  sport: "target",
  palestra: "target",
  libri: "graduation",
  scuola: "graduation",
  corsi: "graduation",
  animali: "shield",
  bambini: "users",
  famiglia: "users",
};

export function getCategoryCraftedIcon(category?: CategoryLike): CraftedIconName {
  const slugKey = category?.slug ? normalizeKey(category.slug) : "";
  const nameKey = category?.name ? normalizeKey(category.name) : "";

  return (
    SLUG_ICON_MAP[slugKey] ??
    SLUG_ICON_MAP[nameKey] ??
    ALIAS_ICON_MAP[slugKey] ??
    ALIAS_ICON_MAP[nameKey] ??
    // Una categoria senza corrispondenza non è "Altro": ha un'etichetta sua,
    // e un cartellino la distingue senza fingere di sapere cos'è.
    "bookmark"
  );
}

/** Le icone che si possono scegliere creando una categoria nuova. */
export const SELECTABLE_CATEGORY_ICONS: CraftedIconName[] = [
  "fork",
  "restaurant",
  "croissant",
  "coffee",
  "bag",
  "cart",
  "bus",
  "car",
  "toll",
  "tags",
  "home",
  "bolt",
  "party",
  "plane",
  "receipt",
  "shield",
  "pill",
  "gift",
  "laptop",
  "sparkles",
  "shirt",
  "cig",
  "piggy",
  "wallet",
  "target",
  "graduation",
  "users",
  "camera",
  "bookmark",
  "dots",
];
