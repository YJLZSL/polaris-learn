-- CreateTable
CREATE TABLE "VirtualAPIKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT '{}',
    "rateLimitRpm" INTEGER NOT NULL DEFAULT 120,
    "allowedIps" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "VirtualAPIKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "APIProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "config" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
    "lastHealthCheck" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "APIUsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "cost" REAL NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "statusCode" INTEGER,
    "clientIp" TEXT,
    "requestId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "APIUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RechargeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "RechargeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "VirtualAPIKey_keyHash_key" ON "VirtualAPIKey"("keyHash");

-- CreateIndex
CREATE INDEX "VirtualAPIKey_userId_idx" ON "VirtualAPIKey"("userId");

-- CreateIndex
CREATE INDEX "VirtualAPIKey_keyHash_idx" ON "VirtualAPIKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "APIProvider_name_key" ON "APIProvider"("name");

-- CreateIndex
CREATE UNIQUE INDEX "APIUsageLog_requestId_key" ON "APIUsageLog"("requestId");

-- CreateIndex
CREATE INDEX "APIUsageLog_userId_createdAt_idx" ON "APIUsageLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "APIUsageLog_provider_createdAt_idx" ON "APIUsageLog"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "APIUsageLog_createdAt_idx" ON "APIUsageLog"("createdAt");

-- CreateIndex
CREATE INDEX "RechargeRecord_userId_createdAt_idx" ON "RechargeRecord"("userId", "createdAt");
