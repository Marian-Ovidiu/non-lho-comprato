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

test.beforeAll(deleteFlowEntries);
test.afterAll(deleteFlowEntries);

async function authenticate(page: Page) {
  const response = await page.context().request.post("/api/test/auth", {
    data: { userId: E2E_USER_ID, workspaceId: E2E_WORKSPACE_ID },
  });
  expect(response.ok()).toBeTruthy();
}

async function closeDailySummaryIfVisible(page: Page) {
  const closeButton = page.getByRole("button", { name: /Chiudi|Close/i });

  if (
    await closeButton
      .waitFor({ state: "visible", timeout: 1_000 })
      .then(() => true)
      .catch(() => false)
  ) {
    await closeButton.click();
  }
}

async function readEntriesCount(page: Page): Promise<number> {
  const badge = page.getByText(/^\d+ moviment/).first();
  await expect(badge).toBeVisible();
  const text = (await badge.textContent()) ?? "";
  return Number(text.match(/^(\d+)/)?.[1] ?? "0");
}

test("create, edit and delete an entry through the UI", async ({ page }) => {
  await authenticate(page);

  const runId = Date.now();
  const title = `${E2E_TITLE_PREFIX} ${runId}`;
  const editedTitle = `${title} modificato`;

  // Baseline count for the current month on the entries page.
  await page.goto("/entries");
  await closeDailySummaryIfVisible(page);
  const initialCount = await readEntriesCount(page);

  // --- create ---
  await page.goto("/entries/new?returnTo=%2Fentries");
  await page.getByRole("button", { name: /^Delivery$/i }).click();
  await page.getByLabel(/Cosa/i).fill(title);
  await page.getByLabel(/Quanto hai speso/i).fill("10,00");
  await page.getByRole("button", { name: /Salva movimento/i }).click();
  await expect(page.getByText(/Movimento salvato/i)).toBeVisible();

  await page.goto("/entries");
  await expect(page.getByText(title).first()).toBeVisible();
  expect(await readEntriesCount(page)).toBe(initialCount + 1);

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
  // Editing must not change how many entries exist.
  expect(await readEntriesCount(page)).toBe(initialCount + 1);

  // --- delete ---
  await page.getByRole("link").filter({ hasText: editedTitle }).first().click();
  await expect(page).toHaveURL(/\/entries\/.+\/edit/);
  await page.getByRole("button", { name: /^Elimina$/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /^Elimina$/i }).click();

  await expect(page).toHaveURL(/\/entries(\?|$)/, { timeout: 15_000 });
  await expect(page.getByText(editedTitle)).not.toBeVisible();
  expect(await readEntriesCount(page)).toBe(initialCount);
});
