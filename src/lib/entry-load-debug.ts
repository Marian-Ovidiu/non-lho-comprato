import { isWorkspaceDebugEnabled } from "@/src/lib/workspace-debug";
import { formatDataLoadError } from "@/src/lib/data-load-error";

export function isEntryLoadDebugEnabled() {
  return (
    process.env.DEBUG_ENTRIES?.trim().toLowerCase() === "true" ||
    isWorkspaceDebugEnabled()
  );
}

export function logEntryLoadStep(
  step: string,
  payload: Record<string, unknown>,
) {
  if (!isEntryLoadDebugEnabled()) {
    return;
  }

  console.info(`[entries-load] ${step}`, payload);
}

export function formatEntryLoadError(error: unknown): string {
  return formatDataLoadError(error);
}
