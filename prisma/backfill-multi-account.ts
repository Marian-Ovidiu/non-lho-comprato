import { Pool } from "pg";

const LEGACY_MARIAN_USER_ID = "legacy-marian";
const LEGACY_MARTINA_USER_ID = "legacy-martina";
const LEGACY_WORKSPACE_ID = "legacy-marian-martina";
const LEGACY_MARIAN_MEMBER_ID = "legacy-workspace-member-marian";
const LEGACY_MARTINA_MEMBER_ID = "legacy-workspace-member-martina";

function buildConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const separator = connectionString.includes("?") ? "&" : "?";
  return `${connectionString}${separator}uselibpqcompat=true&sslmode=require`;
}

async function main() {
  const pool = new Pool({
    connectionString: buildConnectionString(),
    ssl: {
      rejectUnauthorized: false,
    },
    max: 1,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
        INSERT INTO "User" ("id", "name", "createdAt", "updatedAt")
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ($3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("id") DO UPDATE
        SET "name" = EXCLUDED."name"
            ,"updatedAt" = CURRENT_TIMESTAMP
      `,
      [
        LEGACY_MARIAN_USER_ID,
        "Marian",
        LEGACY_MARTINA_USER_ID,
        "Martina",
      ],
    );

    await client.query(
      `
        INSERT INTO "Workspace" ("id", "name", "kind", "ownerUserId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("id") DO UPDATE
        SET "name" = EXCLUDED."name",
            "kind" = EXCLUDED."kind",
            "ownerUserId" = EXCLUDED."ownerUserId",
            "updatedAt" = CURRENT_TIMESTAMP
      `,
      [LEGACY_WORKSPACE_ID, "Marian & Martina", "shared", LEGACY_MARIAN_USER_ID],
    );

    await client.query(
      `
        INSERT INTO "WorkspaceMember" ("id", "workspaceId", "userId", "role", "createdAt")
        VALUES
          ($1, $2, $3, $4, CURRENT_TIMESTAMP),
          ($5, $2, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT ("workspaceId", "userId") DO UPDATE
        SET "role" = EXCLUDED."role"
      `,
      [
        LEGACY_MARIAN_MEMBER_ID,
        LEGACY_WORKSPACE_ID,
        LEGACY_MARIAN_USER_ID,
        "owner",
        LEGACY_MARTINA_MEMBER_ID,
        LEGACY_MARTINA_USER_ID,
        "member",
      ],
    );

    await client.query(
      `
        UPDATE "Category"
        SET "workspaceId" = $1
        WHERE "workspaceId" IS NULL
      `,
      [LEGACY_WORKSPACE_ID],
    );

    await client.query(
      `
        UPDATE "Habit"
        SET "workspaceId" = $1
        WHERE "workspaceId" IS NULL
      `,
      [LEGACY_WORKSPACE_ID],
    );

    await client.query(
      `
        UPDATE "Goal"
        SET "workspaceId" = $1
        WHERE "workspaceId" IS NULL
      `,
      [LEGACY_WORKSPACE_ID],
    );

    await client.query(
      `
        UPDATE "QuickPreset"
        SET "workspaceId" = $1
        WHERE "workspaceId" IS NULL
      `,
      [LEGACY_WORKSPACE_ID],
    );

    const entryUpdate = await client.query(
      `
        UPDATE "Entry"
        SET
          "workspaceId" = $1,
          "createdByUserId" = $2,
          "paidByUserId" = CASE
            WHEN "person" = 'MARIAN' THEN $2
            WHEN "person" = 'MARTINA' THEN $3
            ELSE NULL
          END,
          "visibility" = 'workspace'
        WHERE "workspaceId" IS NULL
      `,
      [LEGACY_WORKSPACE_ID, LEGACY_MARIAN_USER_ID, LEGACY_MARTINA_USER_ID],
    );

    await client.query("COMMIT");

    console.log(
      `Backfilled workspace foundation for ${LEGACY_WORKSPACE_ID}. Updated ${entryUpdate.rowCount ?? 0} legacy entries.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Backfill failed:", error);
  process.exitCode = 1;
});
