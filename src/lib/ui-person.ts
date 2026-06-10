// Compatibility-only projection for historical Person columns.
// New runtime flows should use workspace member user IDs instead.
export const LEGACY_PERSON_VALUES = ["MARIAN", "MARTINA", "TUTTI"] as const;

export type LegacyPersonValue = (typeof LEGACY_PERSON_VALUES)[number];

export type PersonFilterValue = LegacyPersonValue;

export type PersonBucket = {
  key: LegacyPersonValue;
  label: string;
  isShared: boolean;
};

export type PersonSelectChoice = {
  value: LegacyPersonValue | "";
  label: string;
};

export type PersonSummary<T> = {
  MARIAN: T;
  MARTINA: T;
  TUTTI: T;
};

export type PersonBucketSummary<T> = {
  key: LegacyPersonValue;
  label: string;
  summary: T;
  isShared: boolean;
};

export const DEFAULT_LEGACY_PERSON: LegacyPersonValue = "MARIAN";

export const PERSON_FILTER_LABELS = {
  ALL: "Tutti i movimenti",
  MARIAN: "Marian",
  MARTINA: "Martina",
  TUTTI: "Condivise",
} as const;

export const PERSON_OWNERSHIP_LABELS = {
  MARIAN: "Marian",
  MARTINA: "Martina",
  TUTTI: "Condivisa",
} as const;

export const GOAL_SCOPE_LABELS = {
  GLOBAL: "Globale",
  MARIAN: "Marian",
  MARTINA: "Martina",
  TUTTI: "Condivise",
} as const;

export const PRESET_PERSON_LABELS = {
  DEFAULT: "Automatico",
  MARIAN: "Marian",
  MARTINA: "Martina",
  TUTTI: "Condivisa",
} as const;

export function isLegacyPerson(value?: string | null): value is LegacyPersonValue {
  return LEGACY_PERSON_VALUES.includes(value as LegacyPersonValue);
}

export function normalizeLegacyPerson(
  value?: string | null,
): LegacyPersonValue | null {
  return isLegacyPerson(value) ? value : null;
}

export function isSharedPerson(person?: string | null): boolean {
  return person === "TUTTI";
}

export function getLegacyPersonValues(): LegacyPersonValue[] {
  return [...LEGACY_PERSON_VALUES];
}

export function getPersonFilterLabel(person?: string | null): string {
  if (person === "MARIAN") {
    return PERSON_FILTER_LABELS.MARIAN;
  }

  if (person === "MARTINA") {
    return PERSON_FILTER_LABELS.MARTINA;
  }

  if (isSharedPerson(person)) {
    return PERSON_FILTER_LABELS.TUTTI;
  }

  return PERSON_FILTER_LABELS.ALL;
}

export function getEntryOwnershipLabel(
  person: string | null | undefined,
): string {
  if (person === "MARTINA") {
    return PERSON_OWNERSHIP_LABELS.MARTINA;
  }

  if (isSharedPerson(person)) {
    return PERSON_OWNERSHIP_LABELS.TUTTI;
  }

  return PERSON_OWNERSHIP_LABELS.MARIAN;
}

export function getGoalScopeLabel(person: string | null | undefined): string {
  if (person === "MARIAN") {
    return GOAL_SCOPE_LABELS.MARIAN;
  }

  if (person === "MARTINA") {
    return GOAL_SCOPE_LABELS.MARTINA;
  }

  if (isSharedPerson(person)) {
    return GOAL_SCOPE_LABELS.TUTTI;
  }

  return GOAL_SCOPE_LABELS.GLOBAL;
}

export function getPresetPersonLabel(person: string | null | undefined): string {
  if (person === "MARIAN") {
    return PRESET_PERSON_LABELS.MARIAN;
  }

  if (person === "MARTINA") {
    return PRESET_PERSON_LABELS.MARTINA;
  }

  if (isSharedPerson(person)) {
    return PRESET_PERSON_LABELS.TUTTI;
  }

  return PRESET_PERSON_LABELS.DEFAULT;
}

export function getPersonFilterOptions(): PersonSelectChoice[] {
  return [
    { value: "", label: PERSON_FILTER_LABELS.ALL },
    { value: "MARIAN", label: PERSON_FILTER_LABELS.MARIAN },
    { value: "MARTINA", label: PERSON_FILTER_LABELS.MARTINA },
    { value: "TUTTI", label: PERSON_FILTER_LABELS.TUTTI },
  ];
}

export function buildPersonBuckets<T>(summaries: PersonSummary<T>) {
  return LEGACY_PERSON_VALUES.map((key) => ({
    key,
    label: getPersonFilterLabel(key),
    summary: summaries[key],
    isShared: isSharedPerson(key),
  })) as PersonBucketSummary<T>[];
}
