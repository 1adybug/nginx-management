import { getParser } from "."
import { z } from "zod/v4"

import { createdAfterSchema } from "./createdAfter"
import { createdBeforeSchema } from "./createdBefore"
import { pageNumSchema } from "./pageNum"
import { pageSizeSchema } from "./pageSize"
import { proxyServiceIdSchema } from "./proxyServiceId"
import { proxyServiceSortBySchema } from "./proxyServiceSortBy"
import { proxyServiceTypeSchema } from "./proxyServiceType"
import { sortOrderSchema } from "./sortOrder"
import { updatedAfterSchema } from "./updatedAfter"
import { updatedBeforeSchema } from "./updatedBefore"

export const queryProxyServiceSchema = z.object(
    {
        id: proxyServiceIdSchema.optional(),
        serviceType: proxyServiceTypeSchema.optional(),
        sourceAddress: z.string({ message: "无效的访问地址" }).trim().optional(),
        targetHost: z.string({ message: "无效的目标地址" }).trim().optional(),
        enabled: z.boolean({ message: "无效的启用状态" }).optional(),
        httpsEnabled: z.boolean({ message: "无效的 HTTPS 状态" }).optional(),
        createdBefore: createdBeforeSchema.optional(),
        createdAfter: createdAfterSchema.optional(),
        updatedBefore: updatedBeforeSchema.optional(),
        updatedAfter: updatedAfterSchema.optional(),
        pageNum: pageNumSchema.optional(),
        pageSize: pageSizeSchema.optional(),
        sortBy: proxyServiceSortBySchema.optional(),
        sortOrder: sortOrderSchema.optional(),
    },
    {
        message: "无效的查询参数",
    },
)

export type QueryProxyServiceParams = z.infer<typeof queryProxyServiceSchema>

export const queryProxyServiceParser = getParser(queryProxyServiceSchema)
