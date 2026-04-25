import { getParser } from "."
import { z } from "zod/v4"

import { isProxyServiceAddress, normalizeProxyServiceAddress } from "@/utils/proxyServiceAddress"

export const proxyServiceAddressSchema = z
    .string({ message: "无效的访问地址" })
    .trim()
    .min(1, { message: "访问地址不能为空" })
    .transform(value => normalizeProxyServiceAddress(value))
    .refine(value => isProxyServiceAddress(value), { message: "访问地址必须是域名、IPv4 或 IPv6" })

export type ProxyServiceAddressParams = z.infer<typeof proxyServiceAddressSchema>

export const proxyServiceAddressParser = getParser(proxyServiceAddressSchema)
