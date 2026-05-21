import { getParser } from "."
import { z } from "zod/v4"

export const certificateSortBySchema = z.enum(["name", "address", "expiresAt", "createdAt", "updatedAt"], {
    message: "无效的排序字段",
})

export type CertificateSortByParams = z.infer<typeof certificateSortBySchema>

export const certificateSortByParser = getParser(certificateSortBySchema)
