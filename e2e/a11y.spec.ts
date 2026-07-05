import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { assertE2EEnvGuard, loadE2EEnv } from "../scripts/e2e/env";

loadE2EEnv();
assertE2EEnvGuard();

const E2E_USER_ID = "e2e-user-marian";
const E2E_WORKSPACE_ID = "e2e-workspace-shared-casa";

// reducedMotion: le transizioni di Reveal/Stagger altrimenti vengono
// fotografate a metà fade e producono falsi positivi di contrasto.
test.use({
  viewport: { width: 390, height: 844 },
  contextOptions: { reducedMotion: "reduce" },
});

const PAGES: Array<[string, string]> = [
  ["home", "/"],
  ["entries", "/entries"],
  ["habits", "/habits"],
  ["goals", "/goals"],
  ["budget", "/budget"],
  ["stats", "/stats"],
  ["presets", "/presets"],
  ["login", "/login"],
];

async function authenticate(page: Page) {
  const response = await page.context().request.post("/api/test/auth", {
    data: { userId: E2E_USER_ID, workspaceId: E2E_WORKSPACE_ID },
  });
  expect(response.ok()).toBeTruthy();
}

for (const [name, path] of PAGES) {
  test(`${name} has no serious or critical a11y violations`, async ({
    page,
  }) => {
    await authenticate(page);
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const blocking = results.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    );

    expect(
      blocking.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => node.target.join(" ")).slice(0, 5),
      })),
    ).toEqual([]);
  });
}
