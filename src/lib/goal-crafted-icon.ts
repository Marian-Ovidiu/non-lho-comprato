import type { CraftedIconName } from "@/components/crafted";

export function getGoalCraftedIcon(title: string): CraftedIconName {
  const normalized = title.toLowerCase();

  if (
    normalized.includes("viagg") ||
    normalized.includes("lisbon") ||
    normalized.includes("tokyo") ||
    normalized.includes("vacanz") ||
    normalized.includes("weekend")
  ) {
    return "plane";
  }

  if (
    normalized.includes("fondo") ||
    normalized.includes("emergenz") ||
    normalized.includes("riserva")
  ) {
    return "shield";
  }

  if (normalized.includes("bic") || normalized.includes("bike")) {
    return "bike";
  }

  return "target";
}
