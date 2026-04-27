import { getParser } from "."
import { z } from "zod/v4"

import { isProxyServicePath, normalizeProxyServicePath } from "@/utils/proxyServicePath"

export const proxyServiceLocationPathSchema = z
    .string({ message: "无效的路径规则" })
    .trim()
    .min(1, { message: "路径规则不能为空" })
    .transform(value => normalizeProxyServicePath({ value }))
    .refine(value => isProxyServicePath(value), { message: "路径规则必须是有效的 URL 路径" })

export type ProxyServiceLocationPathParams = z.infer<typeof proxyServiceLocationPathSchema>

export const proxyServiceLocationPathParser = getParser(proxyServiceLocationPathSchema)
