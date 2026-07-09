/**
 * Every route whose data can change when an entry is created, edited or
 * deleted. Single source of truth so create/update/delete stay in sync: the
 * list used to be copy-pasted, and the create path had drifted — it skipped
 * /habits, /goals and /reports/monthly.
 */
export const ENTRY_DEPENDENT_PATHS = [
  "/",
  "/entries",
  "/stats",
  "/insights",
  "/habits",
  "/goals",
  "/reports/monthly",
  "/budget",
  "/workspace/budgets",
  "/more",
] as const;

type EntryRevalidationDeps = {
  revalidatePath: (path: string) => unknown;
  updateTag: (tag: string) => unknown;
};

/**
 * Revalidates every entry-dependent route and bumps the entries/goals cache
 * tags. Each revalidatePath is guarded because Next throws it outside a request
 * scope; the injected functions let the create path stay unit-testable.
 */
export function revalidateEntryDependentViews(
  workspaceId: string,
  { revalidatePath, updateTag }: EntryRevalidationDeps,
): void {
  for (const path of ENTRY_DEPENDENT_PATHS) {
    try {
      revalidatePath(path);
    } catch (error) {
      console.warn(`Failed to revalidate ${path}:`, error);
    }
  }

  updateTag(`entries:${workspaceId}`);
  updateTag(`goals:${workspaceId}`);
}
