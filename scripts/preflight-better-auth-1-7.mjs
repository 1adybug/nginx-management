import { existsSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"
import process from "node:process"

import Database from "better-sqlite3"

const BaseMigrationName = "20260818210000_better_auth_account_issuer"
const CanonicalMigrationName = "20260818213000_canonical_better_auth_account_issuer"

function getEnvironment() {
    const index = process.argv.indexOf("--environment")
    const environment = index >= 0 ? process.argv[index + 1] : process.env.NODE_ENV

    if (environment !== "development" && environment !== "production") throw new Error("必须通过 --environment 指定 development 或 production")

    return environment
}

function isMaintenanceConfirmed(environment) {
    if (environment === "development") return true
    return ["1", "true"].includes(process.env.BETTER_AUTH_1_7_MAINTENANCE_CONFIRMED?.trim().toLowerCase() ?? "")
}

function isMigrationApplied(database, migrationName) {
    const hasMigrationTable = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '_prisma_migrations'").pluck().get()
    if (!hasMigrationTable) return false

    return !!database
        .prepare(
            `SELECT 1
             FROM "_prisma_migrations"
             WHERE "migration_name" = ?
               AND "finished_at" IS NOT NULL
               AND "rolled_back_at" IS NULL`,
        )
        .pluck()
        .get(migrationName)
}

function getSyntheticOAuthIssuer(providerId) {
    return `local:oauth:${encodeURIComponent(providerId)}`
}

function getTargetIdentity({ providerId, userId, accountId }) {
    if (providerId === "credential") return { issuer: "local:credential", accountId: userId }
    return { issuer: getSyntheticOAuthIssuer(providerId), accountId }
}

function getIdentityCollisions(accounts, getIdentity) {
    const identities = new Map()

    for (const account of accounts) {
        const identity = getIdentity(account)
        if (!account.id || !account.providerId || !account.userId || !identity.issuer || !identity.accountId)
            throw new Error("account 表存在缺少 id、providerId、userId、issuer 或 accountId 的记录，停止迁移")

        const key = JSON.stringify([identity.issuer, identity.accountId])
        const rows = identities.get(key) ?? []
        rows.push({ id: account.id, providerId: account.providerId, userId: account.userId })
        identities.set(key, rows)
    }

    return [...identities.entries()].filter(([, rows]) => rows.length > 1).map(([key, rows]) => ({ identity: JSON.parse(key), accounts: rows }))
}

function getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, "-")
}

async function createVerifiedBackup(database, databasePath) {
    const backupDirectory = resolve("data", "backups", "better-auth-1.7")
    mkdirSync(backupDirectory, { recursive: true })

    const environmentName = databasePath.endsWith("development.db") ? "development" : "production"
    const backupPath = resolve(backupDirectory, `${environmentName}-${getTimestamp()}.db`)
    await database.backup(backupPath)

    const backup = new Database(backupPath, { readonly: true })

    try {
        const result = backup.prepare("PRAGMA integrity_check").pluck().get()
        if (result !== "ok") throw new Error(`Better Auth 1.7 迁移备份完整性校验失败：${String(result)}`)
    } finally {
        backup.close()
    }

    return backupPath
}

function hasUniqueAccountIdentityIndex(database) {
    const uniqueIndexes = database.prepare(`SELECT "name" FROM pragma_index_list('account') WHERE "unique" = 1`).all()

    return uniqueIndexes.some(({ name }) => {
        const columns = database
            .prepare(`SELECT "name" FROM pragma_index_info(?) ORDER BY "seqno"`)
            .all(name)
            .map(column => column.name)

        return columns.length === 2 && columns.includes("issuer") && columns.includes("accountId")
    })
}

async function main() {
    const environment = getEnvironment()
    const databasePath = resolve("data", environment === "development" ? "development.db" : "production.db")
    if (!existsSync(databasePath)) return

    const database = new Database(databasePath)

    try {
        const hasAccountTable = database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'account'").pluck().get()
        if (!hasAccountTable || isMigrationApplied(database, CanonicalMigrationName)) return
        if (!isMaintenanceConfirmed(environment))
            throw new Error("Better Auth 1.7 首次生产迁移前必须停止认证写入，并设置 BETTER_AUTH_1_7_MAINTENANCE_CONFIRMED=1；完成后请删除该变量")

        const backupPath = await createVerifiedBackup(database, databasePath)
        const baseMigrationApplied = isMigrationApplied(database, BaseMigrationName)
        const columns = database.prepare('PRAGMA table_info("account")').all()
        const columnNames = new Set(columns.map(column => column.name))

        if (columnNames.has("providerAccountId"))
            throw new Error("检测到 RC 阶段 providerAccountId；正式 Better Auth 1.7 必须使用 accountId，请制定显式迁移后再继续")
        if (!columnNames.has("accountId")) throw new Error("account 表缺少正式 Better Auth 1.7 持久化字段 accountId")
        if (columnNames.has("issuer") !== baseMigrationApplied)
            throw new Error("account.issuer 与 Better Auth 1.7 基础迁移历史不一致；已保留备份，请人工审查后继续")

        const providerInventory = database
            .prepare(
                `SELECT "providerId", COUNT(*) AS "accountCount", COUNT(DISTINCT "userId") AS "userCount"
                 FROM "account"
                 GROUP BY "providerId"
                 ORDER BY "providerId"`,
            )
            .all()

        console.log(`Better Auth 1.7 迁移备份已通过完整性校验：${backupPath}`)
        console.log(`Better Auth 1.7 provider inventory：${JSON.stringify(providerInventory)}`)

        const unsafeProviderIds = providerInventory
            .map(row => row.providerId)
            .filter(providerId => providerId !== "credential" && (typeof providerId !== "string" || !/^[-A-Za-z0-9._~]+$/.test(providerId)))
        if (unsafeProviderIds.length) throw new Error(`以下 providerId 必须通过新增迁移显式写入 encodeURIComponent 结果：${unsafeProviderIds.join(", ")}`)

        if (baseMigrationApplied) {
            if (!hasUniqueAccountIdentityIndex(database)) throw new Error("account 表缺少 issuer + accountId 唯一索引")
            const accounts = database.prepare('SELECT "id", "issuer", "accountId", "providerId", "userId" FROM "account"').all()
            const collisions = getIdentityCollisions(accounts, account => ({ issuer: account.issuer, accountId: account.accountId }))
            if (collisions.length) throw new Error(`检测到 issuer + accountId 冲突，禁止自动合并：${JSON.stringify(collisions)}`)

            for (const account of accounts) {
                if (account.providerId === "credential" && (account.issuer !== "local:credential" || account.accountId !== account.userId))
                    throw new Error(`credential 账户 ${account.id} 的 identity 不规范`)
                if (
                    account.providerId !== "credential" &&
                    account.issuer.startsWith("local:oauth:") &&
                    account.issuer !== getSyntheticOAuthIssuer(account.providerId)
                )
                    throw new Error(`OAuth 账户 ${account.id} 的合成 issuer 不规范，应为 ${getSyntheticOAuthIssuer(account.providerId)}`)
            }

            return
        }

        const accounts = database.prepare('SELECT "id", "accountId", "providerId", "userId" FROM "account"').all()
        const collisions = getIdentityCollisions(accounts, getTargetIdentity)
        if (collisions.length)
            throw new Error(`检测到目标 issuer + accountId 冲突，禁止自动合并；请按可信 Provider 数据人工确认归属：${JSON.stringify(collisions)}`)
    } finally {
        database.close()
    }
}

await main()
