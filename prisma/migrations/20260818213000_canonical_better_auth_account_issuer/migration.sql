-- Additive hardening for databases that may have passed through an earlier
-- Better Auth 1.7 candidate. Do not edit prior migration history: fail closed
-- when the formal accountId field or canonical identity rules are not met.
BEGIN IMMEDIATE;

CREATE TEMP TABLE "__better_auth_1_7_canonical_guard" (
    "ok" INTEGER NOT NULL CHECK ("ok" = 1)
);

INSERT INTO "__better_auth_1_7_canonical_guard" ("ok")
SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM "account"
    WHERE "issuer" IS NULL OR "issuer" = '' OR "accountId" IS NULL OR "accountId" = ''
) THEN 1 ELSE 0 END;

INSERT INTO "__better_auth_1_7_canonical_guard" ("ok")
SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM "account"
    WHERE "providerId" = 'credential'
      AND ("issuer" <> 'local:credential' OR "accountId" <> "userId")
) THEN 1 ELSE 0 END;

-- URI-unreserved provider IDs were admitted by the base migration, so this is
-- exactly local:oauth:${encodeURIComponent(providerId)} for synthetic issuers.
INSERT INTO "__better_auth_1_7_canonical_guard" ("ok")
SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM "account"
    WHERE "providerId" <> 'credential'
      AND "issuer" LIKE 'local:oauth:%'
      AND "issuer" <> 'local:oauth:' || "providerId"
) THEN 1 ELSE 0 END;

INSERT INTO "__better_auth_1_7_canonical_guard" ("ok")
SELECT CASE WHEN NOT EXISTS (
    SELECT 1
    FROM "account"
    GROUP BY "issuer", "accountId"
    HAVING COUNT(*) > 1
) THEN 1 ELSE 0 END;

DROP TABLE "__better_auth_1_7_canonical_guard";

COMMIT;
