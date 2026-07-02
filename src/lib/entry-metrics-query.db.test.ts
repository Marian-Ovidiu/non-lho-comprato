import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { parseEnvFile } from "../../scripts/e2e/env";
import { entryLocalTimestampSql } from "@/src/lib/entry-metrics-query";
import { Prisma, PrismaClient } from "@/src/lib/generated/prisma/client";
import { getDateKey, getMonthRangeForMonthKey } from "@/src/lib/workspace-dates";

const E2E_GUARD_VALUE = "non-lho-comprato-e2e";
const ROME = "Europe/Rome";

// Reads the connection string straight from .env.e2e instead of process.env so
// an ambient DATABASE_URL (e.g. production in the shell) can never be used.
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

type BucketRow = { bucket: string; count: number };

function toBucketMap(rows: BucketRow[]): Record<string, number> {
  return Object.fromEntries(rows.map((row) => [row.bucket, row.count]));
}

test(
  "entryLocalTimestampSql buckets entries by workspace-timezone day and month",
  {
    skip: databaseUrl
      ? false
      : "requires .env.e2e with E2E_DATABASE_GUARD and DATABASE_URL",
  },
  async () => {
    // max: 1 keeps every query on the same connection so the SET TIME ZONE
    // assertion below actually applies to the bucketing queries.
    const pool = new Pool({ connectionString: databaseUrl!, max: 1 });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    const runId = `tz-bucket-test-${Date.now()}`;
    const userId = `${runId}-user`;
    const workspaceId = `${runId}-workspace`;
    const categoryId = `${runId}-category`;

    const fixtures = [
      // UTC midnight, as stored by the <input type="date"> form path.
      { date: new Date("2026-06-01T00:00:00Z"), expectedDateKey: "2026-06-01" },
      // Rome midnight of June 1, as stored by the day-range helpers.
      { date: new Date("2026-05-31T22:00:00Z"), expectedDateKey: "2026-06-01" },
      { date: new Date("2026-06-15T00:00:00Z"), expectedDateKey: "2026-06-15" },
      // Rome midnight of July 1: must land in July, not June.
      { date: new Date("2026-06-30T22:00:00Z"), expectedDateKey: "2026-07-01" },
    ];

    const loadBuckets = (pattern: "YYYY-MM-DD" | "YYYY-MM") =>
      prisma.$queryRaw<BucketRow[]>(Prisma.sql`
        SELECT
          to_char(${entryLocalTimestampSql(ROME)}, ${pattern}) AS "bucket",
          COUNT(*)::int AS "count"
        FROM "Entry" e
        WHERE e."workspaceId" = ${workspaceId}
        GROUP BY "bucket"
        ORDER BY "bucket" ASC
      `);

    try {
      await prisma.user.create({
        data: { id: userId, email: `${runId}@example.com` },
      });
      await prisma.workspace.create({
        data: { id: workspaceId, name: runId, ownerUserId: userId },
      });
      await prisma.category.create({
        data: { id: categoryId, workspaceId, name: runId, slug: runId },
      });

      for (const [index, fixture] of fixtures.entries()) {
        await prisma.entry.create({
          data: {
            id: `${runId}-entry-${index}`,
            workspaceId,
            categoryId,
            title: `${runId}-entry-${index}`,
            realCost: "10.00",
            alternativeCost: "10.00",
            savedAmount: "0.00",
            date: fixture.date,
          },
        });
      }

      // The SQL bucketing must agree with the JS side (Intl-based getDateKey).
      for (const fixture of fixtures) {
        assert.equal(getDateKey(fixture.date, ROME), fixture.expectedDateKey);
      }

      assert.deepEqual(toBucketMap(await loadBuckets("YYYY-MM-DD")), {
        "2026-06-01": 2,
        "2026-06-15": 1,
        "2026-07-01": 1,
      });

      assert.deepEqual(toBucketMap(await loadBuckets("YYYY-MM")), {
        "2026-06": 3,
        "2026-07": 1,
      });

      // The month grouping must agree with the range-based filters used by
      // the dashboard header: the same three entries belong to June.
      const juneRange = getMonthRangeForMonthKey("2026-06", ROME);
      const juneCount = await prisma.entry.count({
        where: {
          workspaceId,
          date: { gte: juneRange.start, lt: juneRange.end },
        },
      });
      assert.equal(juneCount, 3);

      // The buckets must not depend on the session TimeZone (the original bug
      // only surfaced because the production session runs in UTC).
      await prisma.$executeRawUnsafe("SET TIME ZONE 'America/New_York'");
      assert.deepEqual(toBucketMap(await loadBuckets("YYYY-MM-DD")), {
        "2026-06-01": 2,
        "2026-06-15": 1,
        "2026-07-01": 1,
      });
    } finally {
      await prisma.entry
        .deleteMany({ where: { workspaceId } })
        .catch(() => undefined);
      await prisma.workspace
        .deleteMany({ where: { id: workspaceId } })
        .catch(() => undefined);
      await prisma.user
        .deleteMany({ where: { id: userId } })
        .catch(() => undefined);
      await prisma.$disconnect();
      await pool.end();
    }
  },
);
