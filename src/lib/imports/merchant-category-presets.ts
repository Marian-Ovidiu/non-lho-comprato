export type MerchantPresetKey =
  | "cigarettes"
  | "groceries"
  | "subscriptions"
  | "delivery";

export type MerchantPresetLocale = "it" | "en";

export type MerchantCategoryPreset = {
  key: MerchantPresetKey;
  locales: readonly MerchantPresetLocale[];
  merchantTokens: readonly string[];
  avoidTokens?: readonly string[];
  priority: number;
};

const MERCHANT_CATEGORY_PRESET_CATALOG: Record<
  MerchantPresetLocale,
  readonly MerchantCategoryPreset[]
> = {
  it: [
    {
      key: "cigarettes",
      locales: ["it"],
      merchantTokens: ["tabac", "tabaccheria", "iqos", "tobacco"],
      priority: 400,
    },
    {
      key: "groceries",
      locales: ["it"],
      merchantTokens: [
        "lidl",
        "conad",
        "carrefour",
        "esselunga",
        "coop",
        "eurospin",
        "aldi",
      ],
      priority: 300,
    },
    {
      key: "subscriptions",
      locales: ["it"],
      merchantTokens: [
        "netflix",
        "spotify",
        "disney",
        "prime video",
        "apple.com/bill",
        "google",
      ],
      priority: 200,
    },
    {
      key: "delivery",
      locales: ["it"],
      merchantTokens: ["glovo", "deliveroo", "just eat", "ubereats", "uber eats"],
      priority: 100,
    },
  ],
  en: [
    {
      key: "cigarettes",
      locales: ["en"],
      merchantTokens: ["tobacco", "smoke", "vape", "iqos"],
      priority: 400,
    },
    {
      key: "groceries",
      locales: ["en"],
      merchantTokens: [
        "grocery",
        "supermarket",
        "market",
        "lidl",
        "aldi",
        "tesco",
        "walmart",
      ],
      priority: 300,
    },
    {
      key: "subscriptions",
      locales: ["en"],
      merchantTokens: [
        "netflix",
        "spotify",
        "disney",
        "prime video",
        "apple.com/bill",
        "google",
      ],
      priority: 200,
    },
    {
      key: "delivery",
      locales: ["en"],
      merchantTokens: [
        "deliveroo",
        "just eat",
        "ubereats",
        "uber eats",
        "doordash",
      ],
      priority: 100,
    },
  ],
};

function normalizePresetLocale(locale?: string | null): MerchantPresetLocale {
  const normalized = (locale ?? "").trim().toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }
  if (normalized === "it" || normalized.startsWith("it-")) {
    return "it";
  }
  return "it";
}

function buildLocalePreference(locale?: string | null): MerchantPresetLocale[] {
  const primary = normalizePresetLocale(locale);
  const fallback = primary === "it" ? "en" : "it";
  return [primary, fallback];
}

function mergeUnique<T>(left: readonly T[], right: readonly T[]): T[] {
  return Array.from(new Set([...left, ...right]));
}

export function getMerchantCategoryPresets(
  locale?: string | null,
): MerchantCategoryPreset[] {
  const preference = buildLocalePreference(locale);
  const merged = new Map<MerchantPresetKey, MerchantCategoryPreset>();

  for (const currentLocale of preference) {
    for (const preset of MERCHANT_CATEGORY_PRESET_CATALOG[currentLocale]) {
      const existing = merged.get(preset.key);

      if (!existing) {
        merged.set(preset.key, {
          key: preset.key,
          locales: [...preset.locales],
          merchantTokens: [...preset.merchantTokens],
          avoidTokens: preset.avoidTokens ? [...preset.avoidTokens] : undefined,
          priority: preset.priority,
        });
        continue;
      }

      merged.set(preset.key, {
        key: existing.key,
        locales: mergeUnique(existing.locales, preset.locales),
        merchantTokens: mergeUnique(existing.merchantTokens, preset.merchantTokens),
        avoidTokens: mergeUnique(existing.avoidTokens ?? [], preset.avoidTokens ?? []),
        priority: Math.max(existing.priority, preset.priority),
      });
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    if (right.priority !== left.priority) {
      return right.priority - left.priority;
    }

    return left.key.localeCompare(right.key);
  });
}

