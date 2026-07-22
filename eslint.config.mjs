import config from "@1adybug/eslint"

const projectConfig = [
    {
        ignores: ["components/ui/**", "utils/shadcn.ts"],
    },
    ...config,
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

export default projectConfig
