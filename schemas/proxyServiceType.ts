import { getParser } from "."
import { z } from "zod/v4"

export const ProxyServiceType = {
    反向代理: "reverseProxy",
    端口转发: "portForward",
} as const

export type ProxyServiceType = (typeof ProxyServiceType)[keyof typeof ProxyServiceType]

export const proxyServiceTypeSchema = z.enum(ProxyServiceType, { message: "无效的代理服务类型" })

export type ProxyServiceTypeParams = z.infer<typeof proxyServiceTypeSchema>

export const proxyServiceTypeParser = getParser(proxyServiceTypeSchema)
