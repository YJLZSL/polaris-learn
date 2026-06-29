/*
  Warnings:

  - You are about to drop the `APIProvider` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RechargeRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VirtualAPIKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to alter the column `cost` on the `APIUsageLog` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to alter the column `price` on the `Course` table. The data in that column could be lost. The data in that column will be cast from `Float` to `Decimal`.
  - You are about to drop the column `balance` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "APIProvider_name_key";

-- DropIndex
DROP INDEX "RechargeRecord_userId_createdAt_idx";

-- DropIndex
DROP INDEX "VirtualAPIKey_keyHash_idx";

-- DropIndex
DROP INDEX "VirtualAPIKey_userId_idx";

-- DropIndex
DROP INDEX "VirtualAPIKey_keyHash_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "APIProvider";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RechargeRecord";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "VirtualAPIKey";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_APIUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "statusCode" INTEGER,
    "clientIp" TEXT,
    "requestId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "APIUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_APIUsageLog" ("apiKeyId", "clientIp", "completionTokens", "cost", "createdAt", "endpoint", "id", "latencyMs", "model", "promptTokens", "provider", "requestId", "statusCode", "totalTokens", "userId") SELECT "apiKeyId", "clientIp", "completionTokens", "cost", "createdAt", "endpoint", "id", "latencyMs", "model", "promptTokens", "provider", "requestId", "statusCode", "totalTokens", "userId" FROM "APIUsageLog";
DROP TABLE "APIUsageLog";
ALTER TABLE "new_APIUsageLog" RENAME TO "APIUsageLog";
CREATE UNIQUE INDEX "APIUsageLog_requestId_key" ON "APIUsageLog"("requestId");
CREATE INDEX "APIUsageLog_userId_createdAt_idx" ON "APIUsageLog"("userId", "createdAt");
CREATE INDEX "APIUsageLog_provider_createdAt_idx" ON "APIUsageLog"("provider", "createdAt");
CREATE INDEX "APIUsageLog_createdAt_idx" ON "APIUsageLog"("createdAt");
CREATE TABLE "new_Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "coverImage" TEXT,
    "price" DECIMAL NOT NULL DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Course" ("coverImage", "createdAt", "description", "gradeLevel", "id", "isFree", "price", "subject", "title") SELECT "coverImage", "createdAt", "description", "gradeLevel", "id", "isFree", "price", "subject", "title" FROM "Course";
DROP TABLE "Course";
ALTER TABLE "new_Course" RENAME TO "Course";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "grade" TEXT,
    "avatar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" DATETIME,
    "learningMode" TEXT NOT NULL DEFAULT 'PRIMARY',
    "birthDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatar", "createdAt", "email", "grade", "id", "lastStudyDate", "level", "maxStreak", "name", "password", "status", "streak", "updatedAt", "xp") SELECT "avatar", "createdAt", "email", "grade", "id", "lastStudyDate", "level", "maxStreak", "name", "password", "status", "streak", "updatedAt", "xp" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
