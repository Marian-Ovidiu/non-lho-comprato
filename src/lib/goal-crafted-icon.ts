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

  if (
    normalized.includes("casa") ||
    normalized.includes("affitto") ||
    normalized.includes("mutuo")
  ) {
    return "home";
  }

  if (
    normalized.includes("camera") ||
    normalized.includes("foto") ||
    normalized.includes("fotocamera")
  ) {
    return "camera";
  }

  if (
    normalized.includes("corso") ||
    normalized.includes("laurea") ||
    normalized.includes("studio") ||
    normalized.includes("univers")
  ) {
    return "graduation";
  }

  if (normalized.includes("bic") || normalized.includes("bike")) {
    return "bike";
  }

  if (
    normalized.includes("salvadanaio") ||
    normalized.includes("risparm")
  ) {
    return "piggy";
  }

  return "target";
}
