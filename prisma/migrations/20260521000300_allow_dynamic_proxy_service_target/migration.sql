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
    "targetHost" TEXT,
    "targetPort" INTEGER,
    "locations" JSONB NOT NULL DEFAULT '[]',
    "websocketEnabled" BOOLEAN NOT NULL DEFAULT true,
    "corsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "tcpForwardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "udpForwardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "httpsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "http2HttpsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "certificateId" TEXT,
    "lastAppliedAt" DATETIME,
    "lastApplyError" TEXT,
    "remark" TEXT,
    CONSTRAINT "ProxyService_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProxyService" (
    "certificateId",
    "corsEnabled",
    "createdAt",
    "enabled",
    "http2HttpsEnabled",
    "httpPort",
    "httpsEnabled",
    "httpsPort",
    "id",
    "lastAppliedAt",
    "lastApplyError",
    "locations",
    "remark",
    "serviceType",
    "sourceAddress",
    "targetHost",
    "targetPort",
    "targetProtocol",
    "tcpForwardEnabled",
    "udpForwardEnabled",
    "updatedAt",
    "websocketEnabled"
)
SELECT
    "certificateId",
    "corsEnabled",
    "createdAt",
    "enabled",
    "http2HttpsEnabled",
    "httpPort",
    "httpsEnabled",
    "httpsPort",
    "id",
    "lastAppliedAt",
    "lastApplyError",
    "locations",
    "remark",
    "serviceType",
    "sourceAddress",
    "targetHost",
    "targetPort",
    "targetProtocol",
    "tcpForwardEnabled",
    "udpForwardEnabled",
    "updatedAt",
    "websocketEnabled"
FROM "ProxyService";
DROP TABLE "ProxyService";
ALTER TABLE "new_ProxyService" RENAME TO "ProxyService";
CREATE INDEX "ProxyService_sourceAddress_idx" ON "ProxyService"("sourceAddress");
CREATE INDEX "ProxyService_targetHost_idx" ON "ProxyService"("targetHost");
CREATE INDEX "ProxyService_certificateId_idx" ON "ProxyService"("certificateId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
