import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const provider = (process.env.DATABASE_PROVIDER || "sqlite").toLowerCase();

  if (provider === "postgresql") {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL environment variable is required when DATABASE_PROVIDER is 'postgresql'"
      );
    }
    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });
    return new PrismaClient({ adapter } as never);
  }

  // Default: SQLite via libsql
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  return new PrismaClient({ adapter } as never);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
