import { expect, type Page, test } from "@playwright/test";
import { Pool } from "pg";

import { assertE2EEnvGuard, loadE2EEnv } from "../scripts/e2e/env";

loadE2EEnv();
assertE2EEnvGuard();

const E2E_USER_ID = "e2e-user-marian";
const E2E_INVITED_USER_ID = "e2e-user-luca";
const E2E_WORKSPACE_ID = "e2e-workspace-shared-casa";
const E2E_PRIVATE_WORKSPACE_NAME = "Privato E2E";
const E2E_SHARED_WORKSPACE_NAME = "Casa E2E";
const E2E_CREATED_TITLE_PREFIX = "E2E isolamento";

test.describe.configure({ mode: "serial" });

async function withE2EDatabase<T>(callback: (pool: Pool) => Promise<T>) {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for e2e database access");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    return await callback(pool);
  } finally {
    await pool.end();
  }
}

async function deleteCreatedE2EEntries() {
  await withE2EDatabase(async (pool) => {
    await pool.query('DELETE FROM "Entry" WHERE "title" LIKE $1', [
      `${E2E_CREATED_TITLE_PREFIX}%`,
    ]);
  });
}

async function resetInviteE2EState() {
  await withE2EDatabase(async (pool) => {
    await pool.query(
      'DELETE FROM "WorkspaceMember" WHERE "workspaceId" = $1 AND "userId" = $2',
      [E2E_WORKSPACE_ID, E2E_INVITED_USER_ID],
    );
    await pool.query(
      'DELETE FROM "WorkspaceInvite" WHERE "workspaceId" = $1 AND "type" = $2',
      [E2E_WORKSPACE_ID, "open_link"],
    );
    await pool.query('DELETE FROM "RateLimitBucket" WHERE "scope" LIKE $1', [
      "invite:%",
    ]);
  });
}

// Loading the home finalizes past pending habit occurrences into habit-sourced
// entries (app/page.tsx). Across days these accumulate and crowd out the
// seeded manual entries in the "recent movements" list, so tests that assert
// on those entries need a deterministic starting point.
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
  await deleteCreatedE2EEntries();
  await resetInviteE2EState();
  await resetHabitEntryState();
});

test.afterAll(async () => {
  await deleteCreatedE2EEntries();
  await resetInviteE2EState();
  await resetHabitEntryState();
});

async function authenticateE2EUser(
  page: Page,
  options: { userId?: string; workspaceId?: string | null } = {},
) {
  const userId = options.userId ?? E2E_USER_ID;
  const workspaceId =
    options.workspaceId === undefined ? E2E_WORKSPACE_ID : options.workspaceId;
  const authResponse = await page.context().request.post("/api/test/auth", {
    data: {
      userId,
      ...(workspaceId ? { workspaceId } : {}),
    },
  });

  expect(authResponse.ok()).toBeTruthy();
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

async function switchWorkspace(
  page: Page,
  currentWorkspaceName: string,
  targetWorkspaceName: string,
) {
  await closeDailySummaryIfVisible(page);
  await page
    .getByRole("button", {
      name: new RegExp(`Cambia workspace: ${currentWorkspaceName}`, "i"),
    })
    .click();
  await expect(page.getByRole("dialog", { name: /Cambia workspace/i })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(targetWorkspaceName, "i") }).click();
  await expect(
    page.getByRole("button", {
      name: new RegExp(`Cambia workspace: ${targetWorkspaceName}`, "i"),
    }),
  ).toBeVisible();
}

async function createSpentEntry(page: Page, title: string, amount: string) {
  await page.goto("/entries/new?returnTo=%2Fentries");
  await page.getByRole("button", { name: /^Delivery$/i }).click();
  await page.getByLabel(/Cosa/i).fill(title);
  await page.getByLabel(/Quanto hai speso/i).fill(amount);
  await page.getByRole("button", { name: /Salva movimento/i }).click();

  await expect(page.getByText(/Movimento salvato/i)).toBeVisible();
  await page.goto("/entries");
  await expect(page.getByText(title).first()).toBeVisible();
}

async function expectEntryOnEntriesPage(page: Page, title: string) {
  await page.goto("/entries");
  await expect(page.getByText(title).first()).toBeVisible();
}

async function expectEntryMissingFromEntriesPage(page: Page, title: string) {
  await page.goto("/entries");
  await expect(page.getByText(title)).not.toBeVisible();
}

/* La dashboard non elenca i singoli movimenti dal suo rifacimento: un titolo
   ci si cerca solo per verificare che *non* ci sia. */
async function expectEntryMissingFromDashboard(page: Page, title: string) {
  await page.goto("/");
  await closeDailySummaryIfVisible(page);
  await expect(page.getByText(title)).not.toBeVisible();
}

async function generateOpenInviteUrl(page: Page) {
  await page.goto("/workspace/members");
  await expect(page.getByText(/Marian E2E/i).first()).toBeVisible();
  await page.getByRole("button", { name: /Genera link invito/i }).click();

  const inviteUrlLocator = page.getByText(/\/invite\//).first();
  await expect(inviteUrlLocator).toBeVisible();

  const inviteUrl = (await inviteUrlLocator.textContent())?.trim();
  if (!inviteUrl) {
    throw new Error("Invite URL was not rendered");
  }

  return inviteUrl;
}

test("authenticated user can load the shared workspace home", async ({ page }) => {
  await authenticateE2EUser(page);

  await page.goto("/");

  await expect(
    page.getByRole("button", { name: /Cambia workspace: Casa E2E/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Aggiungi movimento/i }).first()).toBeVisible();
  // Cercava una spesa evitata: la dashboard non ne mostra piu' da quando quella
  // funzione e' uscita dall'app, quindi il test era rosso da allora. Al suo
  // posto il totale del mese, che e' cio' che la home dice davvero.
  await expect(page.getByText(/Totale del mese/i).first()).toBeVisible();
});

test("workspace switch hides entries from the previous workspace", async ({ page }) => {
  await authenticateE2EUser(page);

  // I movimenti si controllano dove stanno: la dashboard non li elenca piu'
  // dal suo rifacimento, mentre l'isolamento fra spazi — che e' cio' che
  // questo test difende — resta esattamente lo stesso.
  await expectEntryOnEntriesPage(page, "Delivery e2e condiviso");

  await page.goto("/");
  await closeDailySummaryIfVisible(page);

  await page.getByRole("button", { name: /Cambia workspace: Casa E2E/i }).click();
  await expect(page.getByRole("dialog", { name: /Cambia workspace/i })).toBeVisible();

  await page.getByRole("button", { name: new RegExp(E2E_PRIVATE_WORKSPACE_NAME, "i") }).click();

  await expect(
    page.getByRole("button", { name: /Cambia workspace: Privato E2E/i }),
  ).toBeVisible();
  await expectEntryMissingFromEntriesPage(page, "Delivery e2e condiviso");
});

test("created entries stay isolated between shared and private workspaces", async ({ page }) => {
  await authenticateE2EUser(page);

  const runId = Date.now();
  const sharedTitle = `${E2E_CREATED_TITLE_PREFIX} condiviso ${runId}`;
  const privateTitle = `${E2E_CREATED_TITLE_PREFIX} privato ${runId}`;

  await createSpentEntry(page, sharedTitle, "9,50");
  await expectEntryOnEntriesPage(page, sharedTitle);

  await switchWorkspace(page, E2E_SHARED_WORKSPACE_NAME, E2E_PRIVATE_WORKSPACE_NAME);
  await expectEntryMissingFromEntriesPage(page, sharedTitle);
  await expectEntryMissingFromDashboard(page, sharedTitle);

  await createSpentEntry(page, privateTitle, "4,20");
  await expectEntryOnEntriesPage(page, privateTitle);

  await switchWorkspace(page, E2E_PRIVATE_WORKSPACE_NAME, E2E_SHARED_WORKSPACE_NAME);
  await expectEntryOnEntriesPage(page, sharedTitle);
  await expectEntryMissingFromEntriesPage(page, privateTitle);
  await expectEntryMissingFromDashboard(page, privateTitle);
});

test("open invite adds a new member to the shared workspace", async ({ page }) => {
  await resetInviteE2EState();
  await authenticateE2EUser(page);

  const inviteUrl = await generateOpenInviteUrl(page);

  await authenticateE2EUser(page, {
    userId: E2E_INVITED_USER_ID,
    workspaceId: null,
  });
  await page.goto(inviteUrl);
  await expect(page.getByRole("heading", { name: /Invito condiviso/i })).toBeVisible();
  await expect(page.getByText(E2E_SHARED_WORKSPACE_NAME).first()).toBeVisible();
  await page.getByRole("button", { name: /Accetta invito|Accept invite/i }).click();
  await expect(
    page.getByRole("button", { name: /Cambia workspace: Casa E2E/i }),
  ).toBeVisible({ timeout: 10_000 });

  await page.goto("/workspace/members");
  await expect(page.getByText(/Luca E2E/i).first()).toBeVisible();
  await expect(page.getByText(/luca\.e2e@example\.com/i).first()).toBeVisible();

  await authenticateE2EUser(page);
  await page.goto("/workspace/members");
  await expect(page.getByText(/Luca E2E/i).first()).toBeVisible();
});
