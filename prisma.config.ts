import { defineConfig } from "prisma/config"

import { DatabaseUrl } from "./server/databaseUrl"

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: DatabaseUrl,
    },
})
