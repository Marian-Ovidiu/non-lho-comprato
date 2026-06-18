import {
  type MerchantCategoryPreset,
  type MerchantPresetKey,
  type MerchantPresetLocale,
} from "@/src/lib/imports/merchant-category-presets";

export type MerchantCategorizerCategory = {
  id: string;
  name: string;
  slug: string;
  isDefault?: boolean;
  archivedAt?: Date | string | null;
};

export type MerchantPresetDetection = {
  presetKey: MerchantPresetKey;
  matchedToken: string;
  confidence: "low" | "medium" | "high";
};

export type MerchantCategorySuggestion = {
  categoryIdSuggested: string | null;
  matchedPresetKey?: MerchantPresetKey;
  matchedToken?: string;
  confidence?: "low" | "medium" | "high";
};

const CATEGORY_ALIAS_CATALOG: Record<
  MerchantPresetLocale,
  Record<MerchantPresetKey, readonly string[]>
> = {
  it: {
    cigarettes: ["sigarette", "sigarette accessori", "tabacco", "fumo", "iqos"],
    groceries: ["spesa", "alimentari", "supermercato", "cibo casa"],
    subscriptions: [
      "abbonamenti",
      "abbonamento",
      "servizi digitali",
      "streaming",
    ],
    delivery: ["delivery", "cibo a domicilio", "takeaway", "asporto"],
  },
  en: {
    cigarettes: ["cigarettes", "tobacco", "smoking", "vape"],
    groceries: ["groceries", "grocery", "supermarket", "food"],
    subscriptions: [
      "subscriptions",
      "subscription",
      "streaming",
      "digital services",
    ],
    delivery: ["delivery", "takeaway", "takeout", "food delivery"],
  },
};

function normalizeLocale(locale?: string | null): MerchantPresetLocale {
  const normalized = (locale ?? "").trim().toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en";
  }
  if (normalized === "it" || normalized.startsWith("it-")) {
    return "it";
  }
  return "it";
}

function getLocalePreference(locale?: string | null): MerchantPresetLocale[] {
  const primary = normalizeLocale(locale);
  const fallback = primary === "it" ? "en" : "it";
  return [primary, fallback];
}

function mergeUnique<T>(left: readonly T[], right: readonly T[]): T[] {
  return Array.from(new Set([...left, ...right]));
}

export function normalizeMerchantText(value?: string | null): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/&/gu, " and ")
    .replace(/['’]/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ");
}

function normalizePresetTokens(tokens: readonly string[]): string[] {
  return tokens
    .map((token) => normalizeMerchantText(token))
    .filter(Boolean);
}

function detectPresetInText(
  text: string,
  presets: readonly MerchantCategoryPreset[],
): MerchantPresetDetection | null {
  const normalizedText = normalizeMerchantText(text);

  if (!normalizedText) {
    return null;
  }

  for (const preset of presets) {
    const avoidTokens = normalizePresetTokens(preset.avoidTokens ?? []);
    if (avoidTokens.some((token) => normalizedText.includes(token))) {
      continue;
    }

    const matches = preset.merchantTokens
      .map((token) => ({
        token,
        normalizedToken: normalizeMerchantText(token),
      }))
      .filter(({ normalizedToken }) => normalizedToken && normalizedText.includes(normalizedToken))
      .sort((left, right) => {
        if (right.normalizedToken.length !== left.normalizedToken.length) {
          return right.normalizedToken.length - left.normalizedToken.length;
        }

        return left.token.localeCompare(right.token);
      });

    if (matches.length > 0) {
      return {
        presetKey: preset.key,
        matchedToken: matches[0]!.token,
        confidence: "high",
      };
    }
  }

  return null;
}

export function getMerchantCategoryPresets(
  locale?: string | null,
): MerchantCategoryPreset[] {
  const preference = getLocalePreference(locale);
  const merged = new Map<MerchantPresetKey, MerchantCategoryPreset>();

  for (const currentLocale of preference) {
    for (const preset of getMerchantCategoryPresetsForLocale(currentLocale)) {
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

function getMerchantCategoryPresetsForLocale(
  locale: MerchantPresetLocale,
): readonly MerchantCategoryPreset[] {
  return [
    {
      key: "cigarettes",
      locales: [locale],
      merchantTokens:
        locale === "it"
          ? ["tabac", "tabaccheria", "iqos", "tobacco"]
          : ["tobacco", "smoke", "vape", "iqos"],
      priority: 400,
    },
    {
      key: "groceries",
      locales: [locale],
      merchantTokens:
        locale === "it"
          ? [
              "lidl",
              "conad",
              "carrefour",
              "esselunga",
              "coop",
              "eurospin",
              "aldi",
            ]
          : [
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
      locales: [locale],
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
      locales: [locale],
      merchantTokens:
        locale === "it"
          ? ["glovo", "deliveroo", "just eat", "ubereats", "uber eats"]
          : ["deliveroo", "just eat", "ubereats", "uber eats", "doordash"],
      priority: 100,
    },
  ];
}

function getCategoryAliases(
  presetKey: MerchantPresetKey,
  locale?: string | null,
): string[] {
  const preference = getLocalePreference(locale);
  const aliases = new Map<string, string>();

  for (const currentLocale of preference) {
    for (const alias of CATEGORY_ALIAS_CATALOG[currentLocale][presetKey]) {
      const normalized = normalizeMerchantText(alias);
      if (!normalized) continue;
      if (!aliases.has(normalized)) {
        aliases.set(normalized, alias);
      }
    }
  }

  return Array.from(aliases.keys()).sort((left, right) => {
    if (right.length !== left.length) {
      return right.length - left.length;
    }

    return left.localeCompare(right);
  });
}

function scoreCategoryForPreset(
  category: MerchantCategorizerCategory,
  presetKey: MerchantPresetKey,
  locale?: string | null,
): { score: number; alias: string } | null {
  if (category.archivedAt != null) {
    return null;
  }

  const normalizedSlug = normalizeMerchantText(category.slug);
  const normalizedName = normalizeMerchantText(category.name);
  if (!normalizedSlug && !normalizedName) {
    return null;
  }

  const aliases = getCategoryAliases(presetKey, locale);
  let best: { score: number; alias: string } | null = null;

  for (const alias of aliases) {
    const exactMatch =
      normalizedSlug === alias || normalizedName === alias;
    const containsMatch =
      (normalizedSlug ? normalizedSlug.includes(alias) : false) ||
      (normalizedName ? normalizedName.includes(alias) : false) ||
      (normalizedSlug ? alias.includes(normalizedSlug) : false) ||
      (normalizedName ? alias.includes(normalizedName) : false);

    if (!exactMatch && !containsMatch) {
      continue;
    }

    const score = exactMatch ? 3 : 2;
    if (!best || score > best.score || (score === best.score && alias < best.alias)) {
      best = { score, alias };
    }
  }

  return best;
}

export function detectMerchantPreset(input: {
  merchantName?: string | null;
  description?: string | null;
  locale?: string | null;
}): MerchantPresetDetection | null {
  const presets = getMerchantCategoryPresets(input.locale);
  const merchantName = normalizeMerchantText(input.merchantName);
  const description = normalizeMerchantText(input.description);

  if (merchantName) {
    const match = detectPresetInText(merchantName, presets);
    if (match) {
      return match;
    }
  }

  if (description) {
    return detectPresetInText(description, presets);
  }

  return null;
}

export function resolvePresetToWorkspaceCategory(
  presetKey: MerchantPresetKey,
  categories: MerchantCategorizerCategory[],
  locale?: string | null,
): MerchantCategorizerCategory | null {
  const activeCategories = categories.filter((category) => category.archivedAt == null);
  const ranked = activeCategories
    .map((category) => ({
      category,
      score: scoreCategoryForPreset(category, presetKey, locale),
    }))
    .filter((item): item is { category: MerchantCategorizerCategory; score: { score: number; alias: string } } =>
      item.score !== null,
    )
    .sort((left, right) => {
      if (right.score.score !== left.score.score) {
        return right.score.score - left.score.score;
      }

      const slugDiff = left.category.slug.localeCompare(right.category.slug);
      if (slugDiff !== 0) {
        return slugDiff;
      }

      return left.category.name.localeCompare(right.category.name);
    });

  return ranked[0]?.category ?? null;
}

export function suggestMerchantCategory(input: {
  merchantName?: string | null;
  description?: string | null;
  locale?: string | null;
  categories: MerchantCategorizerCategory[];
}): MerchantCategorySuggestion {
  const preset = detectMerchantPreset({
    merchantName: input.merchantName,
    description: input.description,
    locale: input.locale,
  });

  if (!preset) {
    return {
      categoryIdSuggested: null,
    };
  }

  const category = resolvePresetToWorkspaceCategory(
    preset.presetKey,
    input.categories,
    input.locale,
  );

  if (!category) {
    return {
      categoryIdSuggested: null,
      matchedPresetKey: preset.presetKey,
      matchedToken: preset.matchedToken,
      confidence: preset.confidence,
    };
  }

  const categoryScore = scoreCategoryForPreset(category, preset.presetKey, input.locale);

  return {
    categoryIdSuggested: category.id,
    matchedPresetKey: preset.presetKey,
    matchedToken: preset.matchedToken,
    confidence:
      categoryScore?.score === 3 ? "high" : categoryScore?.score === 2 ? "medium" : preset.confidence,
  };
}
