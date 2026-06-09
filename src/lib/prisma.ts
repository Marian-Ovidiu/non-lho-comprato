import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/src/lib/generated/prisma/client";
import {
  getRuntimeDatabaseUrl,
  logDatabaseConfigHints,
} from "@/src/lib/database-config";
import { Pool } from "pg";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaPool: Pool | undefined;
}

const connectionString = getRuntimeDatabaseUrl();
logDatabaseConfigHints();

const pool =
  globalThis.prismaPool ??
  new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 1,
  });

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
