export type DefaultQuickAddPreset = {
  id: string;
  emoji: string;
  title: string;
  categorySlug: string;
  amount: number;
  rangeLabel: string;
  shared?: boolean;
};

export const HIDDEN_DEFAULT_PRESETS_STORAGE_KEY =
  "nlc:hidden-default-quick-add-presets";

export const DEFAULT_QUICK_ADD_PRESETS: DefaultQuickAddPreset[] = [
  {
    id: "coffee",
    emoji: "☕",
    title: "Caffè",
    categorySlug: "caffe",
    amount: 4,
    rangeLabel: "2 - 5 €",
  },
  {
    id: "delivery",
    emoji: "🍔",
    title: "Delivery",
    categorySlug: "delivery",
    amount: 24,
    rangeLabel: "15 - 30 €",
    shared: true,
  },
  {
    id: "grocery",
    emoji: "🛒",
    title: "Spesa",
    categorySlug: "spesa",
    amount: 28,
    rangeLabel: "20 - 45 €",
    shared: true,
  },
  {
    id: "smoke",
    emoji: "🚬",
    title: "Sigarette",
    categorySlug: "salute",
    amount: 12,
    rangeLabel: "8 - 15 €",
  },
  {
    id: "shopping",
    emoji: "🛍️",
    title: "Shopping",
    categorySlug: "shopping",
    amount: 36,
    rangeLabel: "20 - 60 €",
  },
];

export function readHiddenDefaultPresetIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(HIDDEN_DEFAULT_PRESETS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeHiddenDefaultPresetIds(ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      HIDDEN_DEFAULT_PRESETS_STORAGE_KEY,
      JSON.stringify(ids),
    );
  } catch {
    // Local persistence is best-effort; default presets remain recoverable.
  }
}
