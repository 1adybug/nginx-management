import type { PrismaConfig } from "prisma"

import { DatabaseUrl } from "./prisma/databaseUrl"

const config = {
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: DatabaseUrl,
    },
} satisfies PrismaConfig

export default config
