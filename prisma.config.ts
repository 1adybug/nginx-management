import { defineConfig } from "prisma/config"

export const DatabaseUrl = process.env.NODE_ENV === "development" ? "file:./data/development.db" : "file:./data/production.db"

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: DatabaseUrl,
    },
})
