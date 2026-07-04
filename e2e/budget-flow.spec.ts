import { expect, type Page, test } from "@playwright/test";
import { Pool } from "pg";

import { assertE2EEnvGuard, loadE2EEnv } from "../scripts/e2e/env";

loadE2EEnv();
assertE2EEnvGuard();

const E2E_USER_ID = "e2e-user-marian";
const E2E_WORKSPACE_ID = "e2e-workspace-shared-casa";
const E2E_TITLE_PREFIX = "E2E budget spesa";

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

// The spec owns every budget in the workspace: the create form enforces one
// budget per (period, scope, scopeKey), so leftovers would break the create.
async function resetBudgetState() {
  await withE2EDatabase(async (pool) => {
    await pool.query('DELETE FROM "Budget" WHERE "workspaceId" = $1', [
      E2E_WORKSPACE_ID,
    ]);
    await pool.query('DELETE FROM "Entry" WHERE "title" LIKE $1', [
      `${E2E_TITLE_PREFIX}%`,
    ]);
  });
}

test.beforeAll(async () => {
  await resetBudgetState();
});
test.afterAll(async () => {
  await resetBudgetState();
});

async function authenticate(page: Page) {
  const response = await page.context().request.post("/api/test/auth", {
    data: { userId: E2E_USER_ID, workspaceId: E2E_WORKSPACE_ID },
  });
  expect(response.ok()).toBeTruthy();
}

test("a monthly budget raises the pace alert after heavy spending", async ({
  page,
}) => {
  await authenticate(page);

  const entryTitle = `${E2E_TITLE_PREFIX} ${Date.now()}`;

  // --- create a 100€ monthly workspace budget (form defaults) ---
  await page.goto("/budget#gestione-budget");
  await page.fill("#budget-amount", "100");
  await page.getByRole("button", { name: "Crea budget" }).click();
  await expect(page.getByText("Budget workspace")).toBeVisible({
    timeout: 15_000,
  });

  // An untouched budget must not raise the pace alert.
  await expect(page.getByText("Ritmo troppo alto")).toHaveCount(0);

  // --- spend 95€ through the real entry form ---
  await page.goto("/entries/new?returnTo=%2Fentries");
  await page.getByRole("button", { name: /^Delivery$/i }).click();
  await page.getByLabel(/Cosa/i).fill(entryTitle);
  await page.getByLabel(/Quanto hai speso/i).fill("95,00");
  await page.getByRole("button", { name: /Salva movimento/i }).click();
  await expect(page.getByText(/Movimento salvato/i)).toBeVisible();

  // --- the alert fires on /budget ---
  await page.goto("/budget");
  await expect(page.getByText("Ritmo troppo alto").first()).toBeVisible({
    timeout: 15_000,
  });

  // --- delete the budget from the management list (native confirm) ---
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .locator("#gestione-budget")
    .getByRole("button", { name: "Elimina" })
    .first()
    .click();
  await expect(
    page.getByText("Nessun budget ancora configurato"),
  ).toBeVisible({ timeout: 15_000 });
});
