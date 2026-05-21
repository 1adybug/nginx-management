import { getParser } from "."
import { z } from "zod/v4"

export const certificateNameSchema = z.string({ message: "无效的证书名称" }).trim().min(1, { message: "证书名称不能为空" }).max(100, {
    message: "证书名称不能超过 100 个字符",
})

export type CertificateNameParams = z.infer<typeof certificateNameSchema>

export const certificateNameParser = getParser(certificateNameSchema)
