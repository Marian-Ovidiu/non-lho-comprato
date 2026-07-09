import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { parseEnvFile } from "../../../scripts/e2e/env";
import {
  reanchorEntryDatesSql,
  reanchorHabitOccurrenceDatesSql,
} from "@/src/features/workspaces/timezone-reanchor";
import { PrismaClient } from "@/src/lib/generated/prisma/client";
import {
  getDateKey,
  parseWorkspaceDateKey,
  reanchorDateToTimezone,
} from "@/src/lib/workspace-dates";

const E2E_GUARD_VALUE = "non-lho-comprato-e2e";
const ROME = "Europe/Rome";
const NEW_YORK = "America/New_York";

function readE2EDatabaseUrl(): string | null {
  const envPath = path.resolve(process.cwd(), ".env.e2e");
  if (!existsSync(envPath)) {
    return null;
  }

  const values = parseEnvFile(readFileSync(envPath, "utf8"));
  if (values.E2E_DATABASE_GUARD !== E2E_GUARD_VALUE) {
    return null;
  }

  return values.DATABASE_URL || null;
}

const databaseUrl = readE2EDatabaseUrl();

test(
  "the re-anchor SQL matches reanchorDateToTimezone and preserves the calendar day",
  {
    skip: databaseUrl
      ? false
      : "requires .env.e2e with E2E_DATABASE_GUARD and DATABASE_URL",
  },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl!, max: 1 });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    const runId = `tz-reanchor-test-${Date.now()}`;
    const userId = `${runId}-user`;
    const workspaceId = `${runId}-workspace`;
    const categoryId = `${runId}-category`;
    const habitId = `${runId}-habit`;

    // Canonical Rome midnight of Jan 15 and a legacy UTC-midnight row for Jan 20.
    const canonicalRome = parseWorkspaceDateKey("2026-01-15", ROME)!;
    const legacyUtcMidnight = new Date("2026-01-20T00:00:00.000Z");

    try {
      await prisma.user.create({
        data: { id: userId, email: `${runId}@example.com` },
      });
      await prisma.workspace.create({
        data: { id: workspaceId, name: runId, ownerUserId: userId, timezone: ROME },
      });
      await prisma.category.create({
        data: { id: categoryId, workspaceId, name: runId, slug: runId },
      });
      await prisma.habit.create({
        data: {
          id: habitId,
          workspaceId,
          name: "Caffè",
          categoryId,
          amount: "3.50",
          activeDays: [1, 2, 3, 4, 5, 6, 7],
        },
      });

      const makeEntry = (id: string, date: Date) =>
        prisma.entry.create({
          data: {
            id,
            workspaceId,
            categoryId,
            title: id,
            realCost: "1.00",
            alternativeCost: "1.00",
            savedAmount: "0.00",
            date,
          },
        });

      await makeEntry(`${runId}-entry-canonical`, canonicalRome);
      await makeEntry(`${runId}-entry-legacy`, legacyUtcMidnight);
      await prisma.habitOccurrence.create({
        data: { id: `${runId}-occ-canonical`, habitId, date: canonicalRome, status: "pending" },
      });
      await prisma.habitOccurrence.create({
        data: { id: `${runId}-occ-legacy`, habitId, date: legacyUtcMidnight, status: "pending" },
      });

      await prisma.$transaction([
        prisma.$executeRaw(reanchorEntryDatesSql(workspaceId, ROME, NEW_YORK)),
        prisma.$executeRaw(
          reanchorHabitOccurrenceDatesSql(workspaceId, ROME, NEW_YORK),
        ),
      ]);

      const entries = await prisma.entry.findMany({
        where: { workspaceId },
        select: { id: true, date: true },
        orderBy: { id: "asc" },
      });
      const occurrences = await prisma.habitOccurrence.findMany({
        where: { habit: { workspaceId } },
        select: { id: true, date: true },
        orderBy: { id: "asc" },
      });

      const expected = {
        [`${runId}-entry-canonical`]: reanchorDateToTimezone(canonicalRome, ROME, NEW_YORK)!,
        [`${runId}-entry-legacy`]: reanchorDateToTimezone(legacyUtcMidnight, ROME, NEW_YORK)!,
      };

      for (const entry of entries) {
        // The SQL result must equal the JS reference to the millisecond.
        assert.equal(entry.date.getTime(), expected[entry.id]!.getTime());
      }

      // Every row still reads as its original calendar day in New York.
      const byId = new Map(entries.map((entry) => [entry.id, entry.date]));
      assert.equal(getDateKey(byId.get(`${runId}-entry-canonical`)!, NEW_YORK), "2026-01-15");
      assert.equal(getDateKey(byId.get(`${runId}-entry-legacy`)!, NEW_YORK), "2026-01-20");

      const occById = new Map(occurrences.map((occ) => [occ.id, occ.date]));
      assert.equal(getDateKey(occById.get(`${runId}-occ-canonical`)!, NEW_YORK), "2026-01-15");
      assert.equal(getDateKey(occById.get(`${runId}-occ-legacy`)!, NEW_YORK), "2026-01-20");
    } finally {
      await prisma.entry.deleteMany({ where: { workspaceId } }).catch(() => undefined);
      await prisma.habitOccurrence
        .deleteMany({ where: { habit: { workspaceId } } })
        .catch(() => undefined);
      await prisma.habit.deleteMany({ where: { workspaceId } }).catch(() => undefined);
      await prisma.category.deleteMany({ where: { workspaceId } }).catch(() => undefined);
      await prisma.workspace.deleteMany({ where: { id: workspaceId } }).catch(() => undefined);
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => undefined);
      await prisma.$disconnect();
      await pool.end();
    }
  },
);
