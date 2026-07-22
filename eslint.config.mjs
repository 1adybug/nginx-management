import { createRequire } from "node:module"

import { defineConfig } from "@1adybug/eslint"

const require = createRequire(import.meta.url)
const eslintRequire = createRequire(require.resolve("@1adybug/eslint"))
const nextVitals = eslintRequire("eslint-config-next/core-web-vitals").filter(config => config.name !== "next/typescript")
const typescriptEslint = eslintRequire("typescript-eslint")

const baseConfig = defineConfig({
    next: {
        recommended: false,
        extends: nextVitals,
    },
})

const eslintConfig = [
    ...baseConfig,
    {
        files: ["**/*.{ts,tsx}"],
        ignores: ["**/*.{js,jsx,mjs,cjs}", "**/*.d.{ts,tsx,mts,cts}"],
        languageOptions: {
            parser: typescriptEslint.parser,
            parserOptions: {
                projectService: true,
            },
        },
    },
    {
        files: ["**/*.{js,jsx,mjs,cjs}"],
        rules: {
            "@typescript-eslint/naming-convention": "off",
        },
    },
    {
        files: ["shared/**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
        rules: {
            "prefer-arrow-callback": "off",
        },
    },
]

export default eslintConfig
