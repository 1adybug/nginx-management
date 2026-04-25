export const ProxyServiceAddressType = {
    域名: "domain",
    IPv4: "ipv4",
    IPv6: "ipv6",
} as const

export type ProxyServiceAddressType = (typeof ProxyServiceAddressType)[keyof typeof ProxyServiceAddressType]

export interface FormatProxyServiceAddressParams {
    address: string
    port?: number
}

export interface FormatProxyServiceRedirectHostParams {
    address: string
    port?: number
    defaultPort: number
}

export function normalizeProxyServiceAddress(value: string) {
    const address = value.trim()
    const isBracketedIpv6 = address.startsWith("[") && address.endsWith("]")
    return isBracketedIpv6 ? address.slice(1, -1).trim().toLowerCase() : address.toLowerCase()
}

export function getProxyServiceAddressType(value: string): ProxyServiceAddressType | undefined {
    const address = normalizeProxyServiceAddress(value)
    if (!address) return undefined
    if (isProxyServiceIpv4(address)) return ProxyServiceAddressType.IPv4
    if (isProxyServiceIpv6(address)) return ProxyServiceAddressType.IPv6
    if (isProxyServiceDomain(address)) return ProxyServiceAddressType.域名

    return undefined
}

export function isProxyServiceAddress(value: string) {
    return !!getProxyServiceAddressType(value)
}

export function isProxyServiceIpv4(value: string) {
    const parts = value.split(".")
    if (parts.length !== 4) return false

    return parts.every(part => {
        if (!/^\d{1,3}$/.test(part)) return false
        if (part.length > 1 && part.startsWith("0")) return false
        const number = Number(part)
        return Number.isInteger(number) && number >= 0 && number <= 255
    })
}

export function isProxyServiceIpv6(value: string) {
    if (!value.includes(":")) return false
    if (value.includes("[") || value.includes("]")) return false

    try {
        const url = new URL(`http://[${value}]/`)
        return normalizeProxyServiceAddress(url.hostname) === value.toLowerCase()
    } catch {
        return false
    }
}

export function isProxyServiceDomain(value: string) {
    if (value.length > 253) return false
    if (value.includes(":")) return false
    if (/^[\d.]+$/.test(value)) return false
    if (value.startsWith(".") || value.endsWith(".")) return false

    const labels = value.split(".")

    return labels.every(label => {
        if (!label || label.length > 63) return false
        if (label.startsWith("-") || label.endsWith("-")) return false
        return /^[a-z0-9-]+$/.test(label)
    })
}

export function formatProxyServiceUpstreamHost(address: string) {
    const normalized = normalizeProxyServiceAddress(address)
    return getProxyServiceAddressType(normalized) === ProxyServiceAddressType.IPv6 ? `[${normalized}]` : normalized
}

export function formatProxyServiceUpstreamUrl({ address, port }: FormatProxyServiceAddressParams) {
    const host = formatProxyServiceUpstreamHost(address)
    return port ? `${host}:${port}` : host
}

export function formatProxyServiceRedirectHost({ address, port, defaultPort }: FormatProxyServiceRedirectHostParams) {
    const host = formatProxyServiceUpstreamHost(address)
    const portText = port && port !== defaultPort ? `:${port}` : ""
    return `${host}${portText}`
}
