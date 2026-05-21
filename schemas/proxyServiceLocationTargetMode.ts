import { getParser } from "."
import { z } from "zod/v4"

export const ProxyServiceLocationTargetMode = {
    静态: "static",
    动态: "dynamic",
} as const

export type ProxyServiceLocationTargetMode = (typeof ProxyServiceLocationTargetMode)[keyof typeof ProxyServiceLocationTargetMode]

export const proxyServiceLocationTargetModeSchema = z.enum(ProxyServiceLocationTargetMode, { message: "无效的路径规则目标模式" })

export type ProxyServiceLocationTargetModeParams = z.infer<typeof proxyServiceLocationTargetModeSchema>

export const proxyServiceLocationTargetModeParser = getParser(proxyServiceLocationTargetModeSchema)
