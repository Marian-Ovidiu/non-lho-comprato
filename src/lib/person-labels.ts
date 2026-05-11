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
  DEFAULT: "Da scegliere al momento",
  MARIAN: "Marian",
  MARTINA: "Martina",
  TUTTI: "Condivisa",
} as const;

export function getPersonFilterLabel(
  person?: string | null,
): string {
  if (person === "MARIAN") {
    return PERSON_FILTER_LABELS.MARIAN;
  }

  if (person === "MARTINA") {
    return PERSON_FILTER_LABELS.MARTINA;
  }

  if (person === "TUTTI") {
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

  if (person === "TUTTI") {
    return PERSON_OWNERSHIP_LABELS.TUTTI;
  }

  return PERSON_OWNERSHIP_LABELS.MARIAN;
}

export function getGoalScopeLabel(
  person: string | null | undefined,
): string {
  if (person === "MARIAN") {
    return GOAL_SCOPE_LABELS.MARIAN;
  }

  if (person === "MARTINA") {
    return GOAL_SCOPE_LABELS.MARTINA;
  }

  if (person === "TUTTI") {
    return GOAL_SCOPE_LABELS.TUTTI;
  }

  return GOAL_SCOPE_LABELS.GLOBAL;
}

export function getPresetPersonLabel(
  person: string | null | undefined,
): string {
  if (person === "MARIAN") {
    return PRESET_PERSON_LABELS.MARIAN;
  }

  if (person === "MARTINA") {
    return PRESET_PERSON_LABELS.MARTINA;
  }

  if (person === "TUTTI") {
    return PRESET_PERSON_LABELS.TUTTI;
  }

  return PRESET_PERSON_LABELS.DEFAULT;
}
