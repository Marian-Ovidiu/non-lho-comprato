/**
 * Legacy migration script — now a no-op.
 * Goal.person and QuickPreset.person (and the Person enum) were dropped in Step 4.
 * All records were migrated to targetUserId / targetScope in Step 2.
 */

import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  const [goalsWithoutTarget, presetsWithoutTarget] = await Promise.all([
    prisma.goal.count({ where: { targetUserId: null } }),
    prisma.quickPreset.count({ where: { targetUserId: null, targetScope: null } }),
  ]);

  console.log(`Goals without targetUserId : ${goalsWithoutTarget}`);
  console.log(`Presets without target     : ${presetsWithoutTarget}`);
  console.log("Migration complete — legacy person columns have been dropped.");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
