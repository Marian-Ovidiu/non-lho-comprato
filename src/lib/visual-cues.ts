type CategoryLike = {
  name?: string | null;
  slug?: string | null;
};

const CATEGORY_EMOJIS: Record<string, string> = {
  cibo: "🍽️",
  caffe: "☕",
  delivery: "🛵",
  spesa: "🛒",
  trasporti: "🚗",
  auto: "🚙",
  shopping: "🛍️",
  casa: "🏠",
  svago: "🎉",
  viaggi: "✈️",
  abbonamenti: "🔁",
  salute: "🩺",
  regali: "🎁",
  tech: "💻",
  beauty: "💄",
  altro: "🧾",
};

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function getCategoryEmoji(category?: CategoryLike): string {
  const slugKey = category?.slug ? normalizeKey(category.slug) : "";
  const nameKey = category?.name ? normalizeKey(category.name) : "";

  return CATEGORY_EMOJIS[slugKey] ?? CATEGORY_EMOJIS[nameKey] ?? "🧾";
}

export function getGoalEmoji(emoji?: string | null): string {
  const value = emoji?.trim();

  return value ? value : "🎯";
}

export function getMomentumEmoji(currentStreak: number): string {
  if (currentStreak <= 0) {
    return "🧭";
  }

  if (currentStreak <= 3) {
    return "🔥";
  }

  if (currentStreak <= 7) {
    return "⚡";
  }

  return "💰";
}
