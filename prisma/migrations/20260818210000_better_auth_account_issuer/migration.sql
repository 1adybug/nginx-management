-- Better Auth 1.7 identifies provider accounts by issuer + accountId. Backfill
-- through a nullable staging table so every invariant is checked before the
-- existing account table or its indexes are replaced.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
BEGIN IMMEDIATE;

CREATE TEMP TABLE "__better_auth_1_7_guard" (
    "ok" INTEGER NOT NULL CHECK ("ok" = 1)
);

-- SQLite cannot calculate encodeURIComponent. Only URI-unreserved provider IDs
-- have the same SQL concatenation result; other providers require a new,
-- explicitly reviewed migration with the encoded issuer value.
INSERT INTO "__better_auth_1_7_guard" ("ok")
SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM "account"
    WHERE "providerId" <> 'credential'
      AND ("providerId" = '' OR "providerId" GLOB '*[^-A-Za-z0-9._~]*')
) THEN 1 ELSE 0 END;

CREATE TABLE "new_account_backfill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issuer" TEXT,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "new_account_backfill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_account_backfill" (
    "id",
    "issuer",
    "accountId",
    "providerId",
    "userId",
    "accessToken",
    "refreshToken",
    "idToken",
    "accessTokenExpiresAt",
    "refreshTokenExpiresAt",
    "scope",
    "password",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    CASE
        WHEN "providerId" = 'credential' THEN 'local:credential'
        ELSE 'local:oauth:' || "providerId"
    END,
    CASE WHEN "providerId" = 'credential' THEN "userId" ELSE "accountId" END,
    "providerId",
    "userId",
    "accessToken",
    "refreshToken",
    "idToken",
    "accessTokenExpiresAt",
    "refreshTokenExpiresAt",
    "scope",
    "password",
    "createdAt",
    "updatedAt"
FROM "account";

INSERT INTO "__better_auth_1_7_guard" ("ok")
SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM "new_account_backfill"
    WHERE "issuer" IS NULL OR "issuer" = '' OR "accountId" = ''
) THEN 1 ELSE 0 END;

-- Stop before replacing account when two rows would become the same provider
-- identity. These records must be reconciled from trusted provider data and
-- must never be merged by email or profile fields.
INSERT INTO "__better_auth_1_7_guard" ("ok")
SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM "new_account_backfill"
    GROUP BY "issuer", "accountId"
    HAVING COUNT(*) > 1
) THEN 1 ELSE 0 END;

CREATE TABLE "new_account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issuer" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_account" SELECT * FROM "new_account_backfill";

DROP TABLE "account";
ALTER TABLE "new_account" RENAME TO "account";
DROP TABLE "new_account_backfill";

CREATE UNIQUE INDEX "account_issuer_accountId_key" ON "account"("issuer", "accountId");
CREATE UNIQUE INDEX "account_userId_providerId_key" ON "account"("userId", "providerId");
CREATE INDEX "account_userId_idx" ON "account"("userId");

DROP TABLE "__better_auth_1_7_guard";

COMMIT;
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
