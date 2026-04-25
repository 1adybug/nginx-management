import { getParser } from "."
import { z } from "zod/v4"

export const proxyServiceIdSchema = z.uuid({ message: "无效的代理服务 ID" })

export type ProxyServiceIdParams = z.infer<typeof proxyServiceIdSchema>

export const proxyServiceIdParser = getParser(proxyServiceIdSchema)
