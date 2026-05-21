import { getParser } from "."
import { z } from "zod/v4"

import { certificateIdSchema } from "./certificateId"
import { certificateSortBySchema } from "./certificateSortBy"
import { createdAfterSchema } from "./createdAfter"
import { createdBeforeSchema } from "./createdBefore"
import { pageNumSchema } from "./pageNum"
import { pageSizeSchema } from "./pageSize"
import { sortOrderSchema } from "./sortOrder"
import { updatedAfterSchema } from "./updatedAfter"
import { updatedBeforeSchema } from "./updatedBefore"

export const queryCertificateSchema = z.object(
    {
        id: certificateIdSchema.optional(),
        name: z.string({ message: "无效的证书名称" }).trim().optional(),
        address: z.string({ message: "无效的证书地址" }).trim().optional(),
        createdBefore: createdBeforeSchema.optional(),
        createdAfter: createdAfterSchema.optional(),
        updatedBefore: updatedBeforeSchema.optional(),
        updatedAfter: updatedAfterSchema.optional(),
        pageNum: pageNumSchema.optional(),
        pageSize: pageSizeSchema.optional(),
        sortBy: certificateSortBySchema.optional(),
        sortOrder: sortOrderSchema.optional(),
    },
    {
        message: "无效的查询参数",
    },
)

export type QueryCertificateParams = z.infer<typeof queryCertificateSchema>

export const queryCertificateParser = getParser(queryCertificateSchema)
