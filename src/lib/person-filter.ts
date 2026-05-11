export type PersonFilterValue = "MARIAN" | "MARTINA";

export function getPersonFilter(
  value?: string | string[],
): PersonFilterValue | undefined {
  const person = Array.isArray(value) ? value[0] : value;

  if (person === "MARIAN" || person === "MARTINA") {
    return person;
  }

  return undefined;
}
