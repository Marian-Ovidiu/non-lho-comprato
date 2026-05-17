export const LEGACY_PERSON_VALUES = ["MARIAN", "MARTINA", "TUTTI"] as const;
export const ENTRY_PARTICIPANT_VALUES = ["MARIAN", "MARTINA"] as const;

export type LegacyPersonValue = (typeof LEGACY_PERSON_VALUES)[number];
export type EntryParticipantValue = (typeof ENTRY_PARTICIPANT_VALUES)[number];

export type PersonFilterValue = LegacyPersonValue;

export type PersonBucket = {
  key: LegacyPersonValue;
  label: string;
  isShared: boolean;
};

export type PersonChoice = {
  value: LegacyPersonValue;
  label: string;
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
export const DEFAULT_ENTRY_PARTICIPANT: EntryParticipantValue = "MARIAN";

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

export const ENTRY_PARTICIPANT_LABELS = {
  MARIAN: "Marian",
  MARTINA: "Martina",
} as const;

export const GOAL_SCOPE_LABELS = {
  GLOBAL: "Globale",
  MARIAN: "Marian",
  MARTINA: "Martina",
  TUTTI: "Condivise",
} as const;

export const PRESET_PERSON_LABELS = {
  DEFAULT: "Da scegliere al momento",
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

export function isEntryParticipant(
  value?: string | null,
): value is EntryParticipantValue {
  return ENTRY_PARTICIPANT_VALUES.includes(value as EntryParticipantValue);
}

export function normalizeEntryParticipant(
  value?: string | null,
): EntryParticipantValue | null {
  return isEntryParticipant(value) ? value : null;
}

export function isSharedPerson(person?: string | null): boolean {
  return person === "TUTTI";
}

export function getLegacyPersonValues(): LegacyPersonValue[] {
  return [...LEGACY_PERSON_VALUES];
}

export function getEntryParticipantValues(): EntryParticipantValue[] {
  return [...ENTRY_PARTICIPANT_VALUES];
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

export function getEntryParticipantLabel(
  person: string | null | undefined,
): string {
  if (person === "MARTINA") {
    return ENTRY_PARTICIPANT_LABELS.MARTINA;
  }

  return ENTRY_PARTICIPANT_LABELS.MARIAN;
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

export function getPersonOwnershipOptions(): PersonChoice[] {
  return LEGACY_PERSON_VALUES.map((value) => ({
    value,
    label: getEntryOwnershipLabel(value),
  }));
}

export function getEntryParticipantOptions() {
  return ENTRY_PARTICIPANT_VALUES.map((value) => ({
    value,
    label: getEntryParticipantLabel(value),
  }));
}

export function getBeneficiariesFromLegacyPerson(
  person?: string | null,
): EntryParticipantValue[] {
  if (person === "MARTINA") {
    return ["MARTINA"];
  }

  if (isSharedPerson(person)) {
    return ["MARIAN", "MARTINA"];
  }

  return [DEFAULT_ENTRY_PARTICIPANT];
}

export function normalizeBeneficiaries(
  values: Array<string | null | undefined>,
  fallbackPerson?: string | null,
): EntryParticipantValue[] {
  const normalized = Array.from(
    new Set(
      values
        .map((value) => normalizeEntryParticipant(value))
        .filter((value): value is EntryParticipantValue => value !== null),
    ),
  );

  return normalized.length > 0
    ? normalized
    : getBeneficiariesFromLegacyPerson(fallbackPerson);
}

export function getLegacyPersonFromBeneficiaries(
  beneficiaries: EntryParticipantValue[],
): LegacyPersonValue {
  const normalized = normalizeBeneficiaries(beneficiaries);
  const includesMarian = normalized.includes("MARIAN");
  const includesMartina = normalized.includes("MARTINA");

  if (includesMarian && includesMartina) {
    return "TUTTI";
  }

  if (includesMartina) {
    return "MARTINA";
  }

  return "MARIAN";
}

export function getGoalScopeOptions(): PersonSelectChoice[] {
  return [
    { value: "", label: GOAL_SCOPE_LABELS.GLOBAL },
    { value: "MARIAN", label: GOAL_SCOPE_LABELS.MARIAN },
    { value: "MARTINA", label: GOAL_SCOPE_LABELS.MARTINA },
    { value: "TUTTI", label: GOAL_SCOPE_LABELS.TUTTI },
  ];
}

export function getPresetPersonOptions(): PersonSelectChoice[] {
  return [
    { value: "", label: PRESET_PERSON_LABELS.DEFAULT },
    { value: "MARIAN", label: PRESET_PERSON_LABELS.MARIAN },
    { value: "MARTINA", label: PRESET_PERSON_LABELS.MARTINA },
    { value: "TUTTI", label: PRESET_PERSON_LABELS.TUTTI },
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
