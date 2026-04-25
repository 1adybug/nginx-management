import { getParser } from "."
import { z } from "zod/v4"

import { proxyServiceAddressSchema } from "./proxyServiceAddress"
import { proxyServiceCertificateDaysSchema } from "./proxyServiceCertificateDays"
import { proxyServicePortSchema } from "./proxyServicePort"
import { ProxyServiceType, proxyServiceTypeSchema } from "./proxyServiceType"
import { ProxyTargetProtocol, proxyTargetProtocolSchema } from "./proxyTargetProtocol"

export const defaultProxyServiceHttpPort = 80

export const defaultProxyServiceHttpsPort = 443

export const optionalProxyServiceAddressSchema = z.preprocess(input => {
    if (typeof input === "string" && !input.trim()) return undefined
    return input
}, proxyServiceAddressSchema.optional())

export const proxyServiceInputSchema = z.object(
    {
        serviceType: proxyServiceTypeSchema.catch(ProxyServiceType.反向代理),
        sourceAddress: optionalProxyServiceAddressSchema,
        httpPort: proxyServicePortSchema.catch(defaultProxyServiceHttpPort),
        httpsPort: proxyServicePortSchema.catch(defaultProxyServiceHttpsPort),
        targetProtocol: proxyTargetProtocolSchema.catch(ProxyTargetProtocol.HTTP),
        targetHost: proxyServiceAddressSchema,
        targetPort: proxyServicePortSchema,
        websocketEnabled: z.boolean({ message: "无效的 WebSocket 开关" }).catch(true),
        tcpForwardEnabled: z.boolean({ message: "无效的 TCP 开关" }).catch(true),
        udpForwardEnabled: z.boolean({ message: "无效的 UDP 开关" }).catch(false),
        enabled: z.boolean({ message: "无效的启用状态" }).catch(true),
        httpsEnabled: z.boolean({ message: "无效的 HTTPS 开关" }).catch(false),
        http2HttpsEnabled: z.boolean({ message: "无效的 HTTP 跳转 HTTPS 开关" }).catch(false),
        certificateDays: proxyServiceCertificateDaysSchema,
        remark: z.string({ message: "无效的备注" }).trim().max(500, { message: "备注不能超过 500 个字符" }).optional(),
    },
    { message: "无效的代理服务参数" },
)

export const addProxyServiceSchema = proxyServiceInputSchema
    .refine(value => value.serviceType !== ProxyServiceType.反向代理 || !!value.sourceAddress, {
        message: "反向代理的访问地址不能为空",
    })
    .refine(value => value.serviceType !== ProxyServiceType.反向代理 || !value.httpsEnabled || value.httpPort !== value.httpsPort, {
        message: "HTTP 端口和 HTTPS 端口不能相同",
    })
    .refine(value => value.serviceType !== ProxyServiceType.端口转发 || value.tcpForwardEnabled || value.udpForwardEnabled, {
        message: "端口转发必须至少开启 TCP 或 UDP",
    })
    .refine(value => value.serviceType !== ProxyServiceType.端口转发 || !value.httpsEnabled || value.tcpForwardEnabled, {
        message: "端口转发的 SSL 仅支持 TCP",
    })

export type AddProxyServiceParams = z.infer<typeof addProxyServiceSchema>

export const addProxyServiceParser = getParser(addProxyServiceSchema)
