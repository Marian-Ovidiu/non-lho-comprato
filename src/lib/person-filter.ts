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
