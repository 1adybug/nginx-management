export const LoginPathname = "/login"

export const IsProduction = process.env.NODE_ENV === "production"

export const IsDevelopment = process.env.NODE_ENV === "development"

export const IsBrowser = typeof window !== "undefined" && typeof window.document !== "undefined"

export const IsServer = !IsBrowser

export const CookiePrefix = process.env.COOKIE_PREFIX

export const BetterAuthSecret = process.env.BETTER_AUTH_SECRET

export const BetterAuthUrl = process.env.BETTER_AUTH_URL

export const NextPublicBetterAuthUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL
