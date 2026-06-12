import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

import { getMigrationDatabaseUrl } from "./src/lib/database-config";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: getMigrationDatabaseUrl(),
  },
});
