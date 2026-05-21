import { getParser } from "."
import { z } from "zod/v4"

import { certificateNameSchema } from "./certificateName"
import { proxyServiceAddressSchema } from "./proxyServiceAddress"
import { proxyServiceCertificateDaysSchema } from "./proxyServiceCertificateDays"

export const optionalCertificateRemarkSchema = z.preprocess(
    input => {
        if (typeof input === "undefined") return undefined
        if (input === null) return undefined
        if (typeof input === "string" && !input.trim()) return undefined
        return input
    },
    z.string({ message: "无效的备注" }).trim().max(500, { message: "备注不能超过 500 个字符" }).optional(),
)

export const addCertificateSchema = z.object(
    {
        name: certificateNameSchema.optional(),
        address: proxyServiceAddressSchema,
        days: proxyServiceCertificateDaysSchema,
        remark: optionalCertificateRemarkSchema,
    },
    { message: "无效的证书参数" },
)

export type AddCertificateParams = z.infer<typeof addCertificateSchema>

export const addCertificateParser = getParser(addCertificateSchema)
