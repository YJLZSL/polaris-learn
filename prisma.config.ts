// Prisma 7 config - 支持 SQLite 和 PostgreSQL 双数据库
import "dotenv/config";
import { defineConfig } from "prisma/config";

const provider = (process.env["DATABASE_PROVIDER"] || "sqlite").toLowerCase();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // SQLite 使用文件路径，PostgreSQL 使用连接字符串
    url:
      provider === "postgresql"
        ? process.env["DATABASE_URL"]
        : process.env["DATABASE_URL"] || "file:./prisma/dev.db",
  },
});
