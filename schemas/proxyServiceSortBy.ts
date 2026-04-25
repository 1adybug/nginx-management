import { getParser } from "."
import { z } from "zod/v4"

export const proxyServiceSortBySchema = z.enum(
    ["serviceType", "sourceAddress", "targetHost", "targetPort", "enabled", "httpsEnabled", "createdAt", "updatedAt"],
    {
        message: "无效的排序字段",
    },
)

export type ProxyServiceSortByParams = z.infer<typeof proxyServiceSortBySchema>

export const proxyServiceSortByParser = getParser(proxyServiceSortBySchema)
