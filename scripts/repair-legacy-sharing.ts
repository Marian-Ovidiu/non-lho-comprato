/**
 * Legacy repair script — now a no-op.
 * The `person` and `paidBy` columns were dropped in Step 3 of the de-hardcoding migration.
 * All entries were backfilled with paidByUserId + EntryBeneficiary rows in Step 1.
 * This script is kept only for reference; it does nothing when run.
 */

import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  const gapCount = await prisma.entry.count({
    where: {
      OR: [{ paidByUserId: null }, { beneficiaries: { none: {} } }],
    },
  });

  if (gapCount === 0) {
    console.log("No ownership gaps found. All entries have paidByUserId + beneficiaries. ✓");
  } else {
    console.warn(`WARNING: ${gapCount} entries still have ownership gaps.`);
    console.warn("The legacy person/paidBy columns have been dropped — manual repair is needed via SQL or a new migration script.");
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
