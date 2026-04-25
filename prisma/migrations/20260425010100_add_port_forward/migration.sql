-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProxyService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "serviceType" TEXT NOT NULL DEFAULT 'reverseProxy',
    "sourceAddress" TEXT NOT NULL,
    "httpPort" INTEGER NOT NULL DEFAULT 80,
    "httpsPort" INTEGER NOT NULL DEFAULT 443,
    "targetProtocol" TEXT NOT NULL DEFAULT 'http',
    "targetHost" TEXT NOT NULL,
    "targetPort" INTEGER NOT NULL,
    "websocketEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tcpForwardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "udpForwardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "httpsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "http2HttpsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "certificateDays" INTEGER NOT NULL DEFAULT 3650,
    "certificatePath" TEXT,
    "certificateKeyPath" TEXT,
    "certificateExpiresAt" DATETIME,
    "lastAppliedAt" DATETIME,
    "lastApplyError" TEXT,
    "remark" TEXT
);
INSERT INTO "new_ProxyService" ("certificateDays", "certificateExpiresAt", "certificateKeyPath", "certificatePath", "createdAt", "enabled", "http2HttpsEnabled", "httpPort", "httpsEnabled", "httpsPort", "id", "lastAppliedAt", "lastApplyError", "remark", "sourceAddress", "targetHost", "targetPort", "targetProtocol", "updatedAt", "websocketEnabled") SELECT "certificateDays", "certificateExpiresAt", "certificateKeyPath", "certificatePath", "createdAt", "enabled", "http2HttpsEnabled", "httpPort", "httpsEnabled", "httpsPort", "id", "lastAppliedAt", "lastApplyError", "remark", "sourceAddress", "targetHost", "targetPort", "targetProtocol", "updatedAt", "websocketEnabled" FROM "ProxyService";
DROP TABLE "ProxyService";
ALTER TABLE "new_ProxyService" RENAME TO "ProxyService";
CREATE INDEX "ProxyService_sourceAddress_idx" ON "ProxyService"("sourceAddress");
CREATE INDEX "ProxyService_targetHost_idx" ON "ProxyService"("targetHost");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
