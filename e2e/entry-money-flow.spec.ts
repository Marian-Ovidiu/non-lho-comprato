import { expect, type Page, test } from "@playwright/test";
import { Pool } from "pg";

import { assertE2EEnvGuard, loadE2EEnv } from "../scripts/e2e/env";

loadE2EEnv();
assertE2EEnvGuard();

const E2E_USER_ID = "e2e-user-marian";
const E2E_WORKSPACE_ID = "e2e-workspace-shared-casa";
const E2E_TITLE_PREFIX = "E2E flusso";

test.describe.configure({ mode: "serial" });

async function withE2EDatabase<T>(callback: (pool: Pool) => Promise<T>) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for e2e database access");
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    return await callback(pool);
  } finally {
    await pool.end();
  }
}

async function deleteFlowEntries() {
  await withE2EDatabase(async (pool) => {
    await pool.query('DELETE FROM "Entry" WHERE "title" LIKE $1', [
      `${E2E_TITLE_PREFIX}%`,
    ]);
  });
}

// The header count this spec reads would drift as loading the home finalizes
// past habit occurrences into entries, so clear them for a stable baseline.
async function resetHabitEntryState() {
  await withE2EDatabase(async (pool) => {
    await pool.query(
      'DELETE FROM "Entry" WHERE "workspaceId" = $1 AND "source" = $2',
      [E2E_WORKSPACE_ID, "habit"],
    );
    await pool.query(
      'DELETE FROM "HabitOccurrence" WHERE "habitId" IN (SELECT "id" FROM "Habit" WHERE "workspaceId" = $1)',
      [E2E_WORKSPACE_ID],
    );
  });
}

test.beforeAll(async () => {
  await deleteFlowEntries();
  await resetHabitEntryState();
});
test.afterAll(async () => {
  await deleteFlowEntries();
  await resetHabitEntryState();
});

async function authenticate(page: Page) {
  const response = await page.context().request.post("/api/test/auth", {
    data: { userId: E2E_USER_ID, workspaceId: E2E_WORKSPACE_ID },
  });
  expect(response.ok()).toBeTruthy();
}

test("create, edit and delete an entry through the UI", async ({ page }) => {
  await authenticate(page);

  const runId = Date.now();
  const title = `${E2E_TITLE_PREFIX} ${runId}`;
  const editedTitle = `${title} modificato`;

  // Presence/absence on the entries list is the source of truth here: it reads
  // getEntriesPage (uncached), whereas the header count comes from a cached
  // dashboard summary that the SQL-based test cleanups do not invalidate.

  // --- create ---
  await page.goto("/entries/new?returnTo=%2Fentries");
  await page.getByRole("button", { name: /^Delivery$/i }).click();
  await page.getByLabel(/Cosa/i).fill(title);
  await page.getByLabel(/Quanto hai speso/i).fill("10,00");
  await page.getByRole("button", { name: /Salva movimento/i }).click();
  await expect(page.getByText(/Movimento salvato/i)).toBeVisible();

  await page.goto("/entries");
  await expect(page.getByText(title).first()).toBeVisible();

  // --- edit ---
  await page.getByRole("link").filter({ hasText: title }).first().click();
  await expect(page).toHaveURL(/\/entries\/.+\/edit/);
  const amountField = page.getByLabel(/Quanto hai speso/i);
  await expect(amountField).toHaveValue(/10/);
  await amountField.fill("25,00");
  await page.getByLabel(/Cosa/i).fill(editedTitle);
  await page.getByRole("button", { name: /Salva movimento/i }).click();

  // The edit form redirects to /entries itself after a successful save; wait
  // for that instead of racing a manual navigation against the pending action.
  await expect(page).toHaveURL(/\/entries(\?|$)/, { timeout: 15_000 });
  await expect(page.getByText(editedTitle).first()).toBeVisible();
  await expect(page.getByText(title, { exact: true })).not.toBeVisible();

  // --- delete ---
  await page.getByRole("link").filter({ hasText: editedTitle }).first().click();
  await expect(page).toHaveURL(/\/entries\/.+\/edit/);
  await page.getByRole("button", { name: /^Elimina$/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^Elimina$/i }).click();

  await expect(page).toHaveURL(/\/entries(\?|$)/, { timeout: 15_000 });
  await expect(page.getByText(editedTitle)).not.toBeVisible();
});
