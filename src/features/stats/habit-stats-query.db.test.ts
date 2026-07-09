import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { parseEnvFile } from "../../../scripts/e2e/env";
import {
  buildHabitStatsFromRows,
  buildHabitStatsQuery,
  type HabitStatsRow,
} from "@/src/features/stats/habit-stats";
import { PrismaClient } from "@/src/lib/generated/prisma/client";

const E2E_GUARD_VALUE = "non-lho-comprato-e2e";

// Reads the connection string straight from .env.e2e (never process.env) so an
// ambient DATABASE_URL can't point this at production. Mirrors the guard used
// by entry-metrics-query.db.test.ts.
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
  "buildHabitStatsQuery aggregates by habit and honors the member filter",
  {
    skip: databaseUrl
      ? false
      : "requires .env.e2e with E2E_DATABASE_GUARD and DATABASE_URL",
  },
  async () => {
    const pool = new Pool({ connectionString: databaseUrl!, max: 1 });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    const runId = `habit-stats-test-${Date.now()}`;
    const userA = `${runId}-user-a`;
    const userB = `${runId}-user-b`;
    const workspaceId = `${runId}-workspace`;
    const categoryId = `${runId}-category`;
    const habitId = `${runId}-habit`;
    const date = new Date("2026-06-15T00:00:00Z");

    const runStats = async (memberUserId?: string) => {
      const rows = await prisma.$queryRaw<HabitStatsRow[]>(
        buildHabitStatsQuery(workspaceId, memberUserId),
      );
      return buildHabitStatsFromRows(rows);
    };

    try {
      await prisma.user.createMany({
        data: [
          { id: userA, email: `${userA}@example.com` },
          { id: userB, email: `${userB}@example.com` },
        ],
      });
      await prisma.workspace.create({
        data: { id: workspaceId, name: runId, ownerUserId: userA },
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

      // occ1: avoided, entry paid by A for A+B (A matches, B does not).
      const occ1 = await prisma.habitOccurrence.create({
        data: { habitId, date, status: "avoided" },
      });
      await prisma.entry.create({
        data: {
          workspaceId,
          categoryId,
          title: "shared avoided",
          realCost: "0.00",
          alternativeCost: "3.50",
          savedAmount: "3.50",
          mode: "avoided",
          date,
          paidByUserId: userA,
          habitOccurrenceId: occ1.id,
          beneficiaries: { create: [{ userId: userA }, { userId: userB }] },
        },
      });

      // occ2: spent, entry paid by B for B only (B matches, A does not).
      const occ2 = await prisma.habitOccurrence.create({
        data: {
          habitId,
          date: new Date("2026-06-16T00:00:00Z"),
          status: "spent",
        },
      });
      await prisma.entry.create({
        data: {
          workspaceId,
          categoryId,
          title: "personal spent",
          realCost: "3.50",
          alternativeCost: "3.50",
          savedAmount: "0.00",
          date: new Date("2026-06-16T00:00:00Z"),
          paidByUserId: userB,
          habitOccurrenceId: occ2.id,
          beneficiaries: { create: [{ userId: userB }] },
        },
      });

      // occ3 / occ4: pending + skipped, no linked entry.
      await prisma.habitOccurrence.create({
        data: {
          habitId,
          date: new Date("2026-06-17T00:00:00Z"),
          status: "pending",
        },
      });
      await prisma.habitOccurrence.create({
        data: {
          habitId,
          date: new Date("2026-06-18T00:00:00Z"),
          status: "skipped",
        },
      });

      // No member filter: every occurrence counts.
      const all = await runStats();
      assert.equal(all.length, 1);
      assert.deepEqual(
        {
          totalOccurrences: all[0]!.totalOccurrences,
          spentCount: all[0]!.spentCount,
          avoidedCount: all[0]!.avoidedCount,
          skippedCount: all[0]!.skippedCount,
          pendingCount: all[0]!.pendingCount,
          totalSaved: all[0]!.totalSaved,
          disciplineRatePercent: all[0]!.disciplineRatePercent,
        },
        {
          totalOccurrences: 4,
          spentCount: 1,
          avoidedCount: 1,
          skippedCount: 1,
          pendingCount: 1,
          totalSaved: 3.5,
          disciplineRatePercent: 50,
        },
      );

      // Member A: only occ1 (its entry matches A); pending/skipped drop out.
      const forA = await runStats(userA);
      assert.equal(forA.length, 1);
      assert.equal(forA[0]!.totalOccurrences, 1);
      assert.equal(forA[0]!.avoidedCount, 1);
      assert.equal(forA[0]!.spentCount, 0);
      assert.equal(forA[0]!.pendingCount, 0);
      assert.equal(forA[0]!.skippedCount, 0);
      assert.equal(forA[0]!.disciplineRatePercent, 100);

      // Member B: only occ2 (personal spent); nothing avoided.
      const forB = await runStats(userB);
      assert.equal(forB.length, 1);
      assert.equal(forB[0]!.totalOccurrences, 1);
      assert.equal(forB[0]!.spentCount, 1);
      assert.equal(forB[0]!.avoidedCount, 0);
      assert.equal(forB[0]!.totalSaved, 0);
      assert.equal(forB[0]!.disciplineRatePercent, 0);
    } finally {
      await prisma.entry
        .deleteMany({ where: { workspaceId } })
        .catch(() => undefined);
      await prisma.habitOccurrence
        .deleteMany({ where: { habit: { workspaceId } } })
        .catch(() => undefined);
      await prisma.habit
        .deleteMany({ where: { workspaceId } })
        .catch(() => undefined);
      await prisma.category
        .deleteMany({ where: { workspaceId } })
        .catch(() => undefined);
      await prisma.workspace
        .deleteMany({ where: { id: workspaceId } })
        .catch(() => undefined);
      await prisma.user
        .deleteMany({ where: { id: { in: [userA, userB] } } })
        .catch(() => undefined);
      await prisma.$disconnect();
      await pool.end();
    }
  },
);
