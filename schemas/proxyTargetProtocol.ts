import { getParser } from "."
import { z } from "zod/v4"

export const ProxyTargetProtocol = {
    HTTP: "http",
    HTTPS: "https",
} as const

export type ProxyTargetProtocol = (typeof ProxyTargetProtocol)[keyof typeof ProxyTargetProtocol]

export const proxyTargetProtocolSchema = z.enum(ProxyTargetProtocol, { message: "无效的目标协议" })

export type ProxyTargetProtocolParams = z.infer<typeof proxyTargetProtocolSchema>

export const proxyTargetProtocolParser = getParser(proxyTargetProtocolSchema)
