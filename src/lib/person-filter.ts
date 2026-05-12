import type { Person } from "@/src/lib/generated/prisma/enums";

export type PersonFilterValue = "MARIAN" | "MARTINA" | "TUTTI";

export function getPersonFilter(
  value?: string | string[],
): PersonFilterValue | undefined {
  const person = Array.isArray(value) ? value[0] : value;

  if (person === "MARIAN" || person === "MARTINA" || person === "TUTTI") {
    return person;
  }

  return undefined;
}

export function buildPersonWhere(
  person?: PersonFilterValue,
): { person?: Person } {
  if (!person || person === "TUTTI") {
    return {};
  }

  return { person };
}
