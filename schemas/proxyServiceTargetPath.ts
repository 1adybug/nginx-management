import { getParser } from "."
import { z } from "zod/v4"

import { isProxyServicePath, normalizeProxyServicePath } from "@/utils/proxyServicePath"

export const proxyServiceTargetPathSchema = z
    .string({ message: "无效的转发路径" })
    .trim()
    .transform(value => normalizeProxyServicePath({ value }))
    .refine(value => isProxyServicePath(value), { message: "转发路径必须是有效的 URL 路径" })

export type ProxyServiceTargetPathParams = z.infer<typeof proxyServiceTargetPathSchema>

export const proxyServiceTargetPathParser = getParser(proxyServiceTargetPathSchema)
