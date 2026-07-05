import { expect, type Page, test } from "@playwright/test";
import { Pool } from "pg";

import { assertE2EEnvGuard, loadE2EEnv } from "../scripts/e2e/env";

loadE2EEnv();
assertE2EEnvGuard();

const E2E_USER_ID = "e2e-user-marian";
const E2E_WORKSPACE_ID = "e2e-workspace-shared-casa";
const E2E_TITLE_PREFIX = "E2E goal";

test.describe.configure({ mode: "serial" });

async function deleteFlowGoals() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for e2e database access");
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(
      'DELETE FROM "Goal" WHERE "workspaceId" = $1 AND "title" LIKE $2',
      [E2E_WORKSPACE_ID, `${E2E_TITLE_PREFIX}%`],
    );
  } finally {
    await pool.end();
  }
}

test.beforeAll(async () => {
  await deleteFlowGoals();
});
test.afterAll(async () => {
  await deleteFlowGoals();
});

async function authenticate(page: Page) {
  const response = await page.context().request.post("/api/test/auth", {
    data: { userId: E2E_USER_ID, workspaceId: E2E_WORKSPACE_ID },
  });
  expect(response.ok()).toBeTruthy();
}

test("create, pause, reactivate and delete a goal through the UI", async ({
  page,
}) => {
  await authenticate(page);

  const title = `${E2E_TITLE_PREFIX} ${Date.now()}`;

  // --- create ---
  await page.goto("/goals");
  await page.fill("#title", title);
  await page.fill("#targetAmount", "150");
  await page.click('#nuovo-obiettivo form button[type="submit"]');
  await expect(page.getByText(/Obiettivo salvato/i)).toBeVisible();

  // filter visible: la shell PPR può lasciare una copia nascosta della riga
  const row = page
    .locator("[data-goal-row]", { hasText: title })
    .filter({ visible: true });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row).toContainText("In corso");

  // --- pause ---
  await row.getByRole("button", { name: "Metti in pausa" }).click();
  await expect(row.getByRole("button", { name: "Riattiva" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(row).toContainText("In pausa");

  // --- reactivate ---
  await row.getByRole("button", { name: "Riattiva" }).click();
  await expect(
    row.getByRole("button", { name: "Metti in pausa" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(row).toContainText("In corso");

  // --- delete, cancelling first ---
  await row.getByRole("button", { name: "Elimina" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Annulla" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(row).toBeVisible();

  // --- delete for real ---
  await row.getByRole("button", { name: "Elimina" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Elimina" }).click();
  await expect(row).not.toBeVisible({ timeout: 15_000 });

  // The seeded goal must survive untouched.
  await expect(page.getByText("Vacanza E2E").first()).toBeVisible();
});
