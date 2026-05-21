import { getParser } from "."
import { z } from "zod/v4"

export const certificateIdSchema = z.uuid({ message: "无效的证书 ID" })

export type CertificateIdParams = z.infer<typeof certificateIdSchema>

export const certificateIdParser = getParser(certificateIdSchema)
