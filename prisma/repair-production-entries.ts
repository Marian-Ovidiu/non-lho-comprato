import "dotenv/config";

import { Pool } from "pg";

const LEGACY_WORKSPACE_ID = "legacy-marian-martina";
const LEGACY_MARIAN_USER_ID = "legacy-marian";
const LEGACY_MARTINA_USER_ID = "legacy-martina";

function buildConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const separator = connectionString.includes("?") ? "&" : "?";
  return `${connectionString}${separator}uselibpqcompat=true&sslmode=require`;
}

async function tableExists(
  client: Pool,
  tableName: string,
): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      ) AS exists
    `,
    [tableName],
  );

  return Boolean(result.rows[0]?.exists);
}

async function main() {
  const pool = new Pool({
    connectionString: buildConnectionString(),
    ssl: {
      rejectUnauthorized: false,
    },
    max: 1,
  });

  try {
    const before = await pool.query<{
      total_entries: number;
      null_workspace_entries: number;
      legacy_workspace_entries: number;
    }>(`
      SELECT
        COUNT(*)::int AS total_entries,
        COUNT(*) FILTER (WHERE "workspaceId" IS NULL)::int AS null_workspace_entries,
        COUNT(*) FILTER (WHERE "workspaceId" = $1)::int AS legacy_workspace_entries
      FROM "Entry"
    `, [LEGACY_WORKSPACE_ID]);

    const hasBeneficiaryTable = await tableExists(pool, "EntryBeneficiary");
    let beneficiaryCountBefore = 0;

    if (hasBeneficiaryTable) {
      const beneficiaryBefore = await pool.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM "EntryBeneficiary"`,
      );
      beneficiaryCountBefore = beneficiaryBefore.rows[0]?.count ?? 0;
    }

    console.log("Before repair:", {
      ...before.rows[0],
      entryBeneficiaryTableExists: hasBeneficiaryTable,
      entryBeneficiaryRows: beneficiaryCountBefore,
    });

    if (!hasBeneficiaryTable) {
      throw new Error(
        'EntryBeneficiary table is missing. Run "npx prisma migrate deploy" first.',
      );
    }

    await pool.query("BEGIN");

    const beneficiaryInsert = await pool.query(`
      INSERT INTO "EntryBeneficiary" ("id", "entryId", "userId", "createdAt")
      SELECT
        gen_random_uuid()::text,
        mapped."entryId",
        mapped."userId",
        mapped."createdAt"
      FROM (
        SELECT DISTINCT
          source."entryId",
          source."userId",
          source."createdAt"
        FROM (
          SELECT
            entry."id" AS "entryId",
            'legacy-marian'::text AS "userId",
            entry."createdAt" AS "createdAt"
          FROM "Entry" AS entry
          WHERE 'MARIAN'::"Person" = ANY (entry."beneficiaries")

          UNION ALL

          SELECT
            entry."id",
            'legacy-martina'::text,
            entry."createdAt"
          FROM "Entry" AS entry
          WHERE 'MARTINA'::"Person" = ANY (entry."beneficiaries")

          UNION ALL

          SELECT
            entry."id",
            'legacy-marian'::text,
            entry."createdAt"
          FROM "Entry" AS entry
          WHERE 'TUTTI'::"Person" = ANY (entry."beneficiaries")

          UNION ALL

          SELECT
            entry."id",
            'legacy-martina'::text,
            entry."createdAt"
          FROM "Entry" AS entry
          WHERE 'TUTTI'::"Person" = ANY (entry."beneficiaries")
        ) AS source
      ) AS mapped
      WHERE NOT EXISTS (
        SELECT 1
        FROM "EntryBeneficiary" AS existing
        WHERE existing."entryId" = mapped."entryId"
          AND existing."userId" = mapped."userId"
      )
    `);

    const workspaceUpdate = await pool.query(
      `
        UPDATE "Entry"
        SET
          "workspaceId" = $1,
          "createdByUserId" = COALESCE("createdByUserId", $2),
          "paidByUserId" = CASE
            WHEN "paidByUserId" IS NOT NULL THEN "paidByUserId"
            WHEN "person" = 'MARTINA' THEN $3
            WHEN "person" = 'MARIAN' THEN $2
            ELSE "paidByUserId"
          END,
          "visibility" = COALESCE("visibility", 'workspace')
        WHERE "workspaceId" IS NULL
      `,
      [LEGACY_WORKSPACE_ID, LEGACY_MARIAN_USER_ID, LEGACY_MARTINA_USER_ID],
    );

    await pool.query("COMMIT");

    const after = await pool.query<{
      total_entries: number;
      null_workspace_entries: number;
      legacy_workspace_entries: number;
    }>(`
      SELECT
        COUNT(*)::int AS total_entries,
        COUNT(*) FILTER (WHERE "workspaceId" IS NULL)::int AS null_workspace_entries,
        COUNT(*) FILTER (WHERE "workspaceId" = $1)::int AS legacy_workspace_entries
      FROM "Entry"
    `, [LEGACY_WORKSPACE_ID]);

    const beneficiaryAfter = await pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM "EntryBeneficiary"`,
    );

    const entriesMissingBeneficiaries = await pool.query<{ count: number }>(`
      SELECT COUNT(*)::int AS count
      FROM "Entry" AS entry
      WHERE NOT EXISTS (
        SELECT 1
        FROM "EntryBeneficiary" AS beneficiary
        WHERE beneficiary."entryId" = entry."id"
      )
    `);

    console.log("Repair applied:", {
      entryBeneficiaryRowsInserted: beneficiaryInsert.rowCount ?? 0,
      workspaceIdRowsUpdated: workspaceUpdate.rowCount ?? 0,
    });

    console.log("After repair:", {
      ...after.rows[0],
      entryBeneficiaryRows: beneficiaryAfter.rows[0]?.count ?? 0,
      entriesWithoutBeneficiaryRows: entriesMissingBeneficiaries.rows[0]?.count ?? 0,
    });

    if ((before.rows[0]?.total_entries ?? 0) !== (after.rows[0]?.total_entries ?? 0)) {
      throw new Error("Entry count changed during repair. Aborting.");
    }
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Production entry repair failed:", error);
  process.exitCode = 1;
});
