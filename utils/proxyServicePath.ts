export interface NormalizeProxyServicePathParams {
    value: string
    defaultValue?: string
}

export function normalizeProxyServicePath({ value, defaultValue = "/" }: NormalizeProxyServicePathParams) {
    const path = value.trim()
    if (!path) return defaultValue
    return path.startsWith("/") ? path : `/${path}`
}

export function isProxyServicePath(value: string) {
    if (!value.startsWith("/")) return false
    if (/[\s{};\\#?$"`]/.test(value)) return false
    if (hasProxyServicePathControlCharacter(value)) return false
    return true
}

export function formatProxyServiceTargetPath(value: string) {
    return normalizeProxyServicePath({ value })
}

export function hasProxyServicePathControlCharacter(value: string) {
    return Array.from(value).some(character => {
        const code = character.charCodeAt(0)
        return code <= 31 || code === 127
    })
}
