import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/src/lib/generated/prisma/client";
import {
  getRuntimeDatabaseUrl,
  logDatabaseConfigHints,
  resolveDatabasePoolMax,
  shouldUseDatabaseSsl,
} from "@/src/lib/database-config";
import { Pool, type PoolConfig } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaPool: Pool | undefined;
}

const connectionString = getRuntimeDatabaseUrl();
logDatabaseConfigHints();
const poolConfig: PoolConfig = {
  connectionString,
  max: resolveDatabasePoolMax(),
};

if (shouldUseDatabaseSsl(connectionString)) {
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool =
  globalThis.prismaPool ??
  new Pool(poolConfig);

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaPool = pool;
}

const adapter = new PrismaPg(pool);

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
