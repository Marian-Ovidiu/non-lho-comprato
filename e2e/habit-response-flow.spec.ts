import { expect, type Page, test } from "@playwright/test";
import { Pool } from "pg";

import { assertE2EEnvGuard, loadE2EEnv } from "../scripts/e2e/env";

loadE2EEnv();
assertE2EEnvGuard();

const E2E_USER_ID = "e2e-user-marian";
const E2E_WORKSPACE_ID = "e2e-workspace-shared-casa";
const E2E_HABIT_ID = "e2e-habit-response";
const E2E_HABIT_NAME = "Risposta e2e";

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

async function deleteResponseHabit() {
  await withE2EDatabase(async (pool) => {
    await pool.query(
      'DELETE FROM "Entry" WHERE "habitOccurrenceId" IN (SELECT "id" FROM "HabitOccurrence" WHERE "habitId" = $1)',
      [E2E_HABIT_ID],
    );
    await pool.query('DELETE FROM "Habit" WHERE "id" = $1', [E2E_HABIT_ID]);
  });
}

// A habit scheduled every day of the week, so today's occurrence always
// exists regardless of when the suite runs.
async function seedResponseHabit() {
  await withE2EDatabase(async (pool) => {
    const category = await pool.query(
      'SELECT "id" FROM "Category" WHERE "workspaceId" = $1 ORDER BY "name" LIMIT 1',
      [E2E_WORKSPACE_ID],
    );

    await pool.query(
      `INSERT INTO "Habit"
        ("id", "workspaceId", "name", "categoryId", "amount", "activeDays",
         "isActive", "defaultBehavior", "targetScope", "targetUserId",
         "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, 3.00, '[1,2,3,4,5,6,7]'::jsonb,
         true, 'spent', 'self', $5, now(), now())`,
      [
        E2E_HABIT_ID,
        E2E_WORKSPACE_ID,
        E2E_HABIT_NAME,
        category.rows[0].id,
        E2E_USER_ID,
      ],
    );
  });
}

test.beforeAll(async () => {
  await deleteResponseHabit();
  await seedResponseHabit();
});
test.afterAll(async () => {
  await deleteResponseHabit();
});

async function authenticate(page: Page) {
  const response = await page.context().request.post("/api/test/auth", {
    data: { userId: E2E_USER_ID, workspaceId: E2E_WORKSPACE_ID },
  });
  expect(response.ok()).toBeTruthy();
}

test("marking today's habit as avoided creates the avoided entry", async ({
  page,
}) => {
  await authenticate(page);

  // Loading /habits creates today's occurrence for the seeded habit.
  await page.goto("/habits");

  const quotidianeTab = page.getByRole("button", { name: /Quotidiane/ });
  if ((await quotidianeTab.count()) > 0) {
    await quotidianeTab.first().click();
  }

  const row = page.locator("[data-habit-row]", { hasText: E2E_HABIT_NAME });
  await expect(row).toBeVisible({ timeout: 15_000 });

  // Pending state: the three response buttons are offered.
  await expect(row.getByRole("button", { name: "Evitata" })).toBeVisible();
  await row.getByRole("button", { name: "Evitata" }).click();

  // After the action the buttons collapse into the status badge.
  await expect(row.getByRole("button", { name: "Evitata" })).toHaveCount(0, {
    timeout: 15_000,
  });
  // exact: the row's usage note may also start mentioning "Evitata…" once
  // the stats include the freshly avoided occurrence.
  await expect(row.getByText("Evitata", { exact: true })).toBeVisible();

  // The avoided entry exists with the habit's amount and no real cost.
  const entry = await withE2EDatabase(async (pool) =>
    pool.query(
      `SELECT e."mode", e."realCost"::text, e."alternativeCost"::text
       FROM "Entry" e
       INNER JOIN "HabitOccurrence" o ON o."id" = e."habitOccurrenceId"
       WHERE o."habitId" = $1`,
      [E2E_HABIT_ID],
    ),
  );
  expect(entry.rows).toHaveLength(1);
  expect(entry.rows[0].mode).toBe("avoided");
  expect(entry.rows[0].realCost).toBe("0.00");
  expect(entry.rows[0].alternativeCost).toBe("3.00");

  // And it shows up in the avoided entries list.
  await page.goto("/entries?kind=evitata");
  await expect(page.getByText(E2E_HABIT_NAME).first()).toBeVisible({
    timeout: 15_000,
  });
});
