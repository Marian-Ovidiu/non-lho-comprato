import type { Person } from "@/src/lib/generated/prisma/enums";
import {
  isSharedPerson,
  normalizeLegacyPerson,
  type PersonFilterValue,
} from "@/src/lib/ui-person";

export type { PersonFilterValue } from "@/src/lib/ui-person";

export function getPersonFilter(
  value?: string | string[],
): PersonFilterValue | undefined {
  const person = Array.isArray(value) ? value[0] : value;
  return normalizeLegacyPerson(person) ?? undefined;
}

export function buildPersonWhere(
  person?: PersonFilterValue,
): { person?: Person } {
  if (!person || isSharedPerson(person)) {
    return {};
  }

  return { person };
}
